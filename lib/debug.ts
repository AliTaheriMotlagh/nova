import type { ProjectFile } from "./types";
import { extname } from "./utils";

interface BabelLike {
  transform: (
    code: string,
    options: Record<string, unknown>,
  ) => { code?: string | null; map?: unknown };
}

let babelPromise: Promise<BabelLike> | null = null;

async function loadBabel(): Promise<BabelLike> {
  if (!babelPromise) {
    babelPromise = import("@babel/standalone")
      .then((module) => {
        const candidate = (module as unknown as { default?: BabelLike }).default ?? (module as unknown as BabelLike);
        if (!candidate || typeof candidate.transform !== "function") {
          throw new Error("The debug transformer did not initialise.");
        }
        return candidate;
      })
      .catch((error) => {
        babelPromise = null;
        throw error;
      });
  }
  return babelPromise;
}

function asyncifyPlugin() {
  return () => ({
    name: "nova-asyncify",
    visitor: {
      Function(path: any) {
        const node = path.node;
        if (node.generator) return;
        if (node.async) return;
        if (node.type === "ClassMethod" || node.type === "ClassPrivateMethod") {
          if (node.kind === "constructor" || node.kind === "get" || node.kind === "set") return;
        }
        node.async = true;
      },
    },
  });
}

function makeCheckpoint(types: any, line: number) {
  return types.expressionStatement(
    types.awaitExpression(
      types.callExpression(types.identifier("__nova_dbg"), [types.numericLiteral(line)]),
    ),
  );
}

function instrumentPlugin() {
  return ({ types }: { types: any }) => ({
    name: "nova-instrument",
    visitor: {
      Program(path: any) {
        instrumentBody(path, types);
      },
      BlockStatement(path: any) {
        instrumentBody(path, types);
      },
      SwitchCase(path: any) {
        const body = path.node.consequent as any[];
        if (!body?.length) return;
        const next: any[] = [];
        for (const statement of body) {
          const line = statement.loc?.start?.line;
          if (line) next.push(makeCheckpoint(types, line));
          next.push(statement);
        }
        path.node.consequent = next;
      },
    },
  });
}

function instrumentBody(path: any, types: any) {
  const body = path.node.body as any[] | undefined;
  if (!Array.isArray(body) || body.length === 0) return;
  const next: any[] = [];
  for (const statement of body) {
    if (statement.type === "ImportDeclaration" || statement.directive) {
      next.push(statement);
      continue;
    }
    const line = statement.loc?.start?.line;
    if (line) next.push(makeCheckpoint(types, line));
    next.push(statement);
  }
  path.node.body = next;
}

export interface InstrumentedDebug {
  code: string;
  lineCount: number;
}

export async function instrumentForDebug(file: ProjectFile, breakpoints: number[]): Promise<InstrumentedDebug> {
  const babel = await loadBabel();
  const extension = extname(file.path);
  const isTs = [".ts", ".tsx"].includes(extension);
  const isJsx = [".jsx", ".tsx"].includes(extension);
  const source = file.content ?? "";

  const result = babel.transform(source, {
    filename: file.path,
    sourceType: "module",
    retainLines: false,
    compact: false,
    presets: [
      ...(isTs
        ? [
            [
              "typescript",
              {
                isTSX: isJsx,
                allExtensions: true,
                allowDeclareFields: true,
                onlyRemoveTypeImports: true,
              },
            ],
          ]
        : []),
      ...(isJsx ? [["react", { runtime: "automatic" }]] : []),
    ],
    plugins: [asyncifyPlugin(), instrumentPlugin()],
    parserOpts: {
      plugins: [...(isTs ? ["typescript"] : []), ...(isJsx ? ["jsx"] : []), "topLevelAwait"],
      allowAwaitOutsideFunction: true,
    },
  });

  if (!result.code) throw new Error("The debug transformer returned no code.");
  return { code: result.code, lineCount: source.split("\n").length };
}

export function buildDebugDocument(
  code: string,
  breakpoints: number[],
  sourcePath: string,
): string {
  const breakpointList = JSON.stringify(breakpoints);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Nova debugger</title>
<script>
(() => {
  const send = (type, payload) => {
    try { parent.postMessage({ source: "nova-debug", type, ...payload }, "*"); } catch {}
  };
  const stringify = (value) => {
    if (typeof value === "string") return value;
    if (value instanceof Error) return value.stack || value.message;
    try {
      const seen = new WeakSet();
      return JSON.stringify(value, (key, item) => {
        if (typeof item === "function") return "[Function " + (item.name || "anonymous") + "]";
        if (typeof item === "bigint") return String(item) + "n";
        if (typeof item === "object" && item !== null) {
          if (seen.has(item)) return "[Circular]";
          seen.add(item);
        }
        return item;
      }, 2);
    } catch { return String(value); }
  };
  for (const level of ["log", "info", "warn", "error", "debug"]) {
    const original = console[level];
    console[level] = (...args) => { send("console", { level, text: args.map(stringify).join(" ") }); original.apply(console, args); };
  }
  window.addEventListener("error", (event) => {
    send("runtime-error", { text: event.error?.stack || event.message + " (line " + event.lineno + ")" });
  });
  window.addEventListener("unhandledrejection", (event) => {
    send("runtime-error", { text: "Unhandled promise rejection: " + stringify(event.reason) });
  });

  const breakpoints = new Set(${breakpointList});
  let started = false;
  let step = false;
  let stopped = false;
  let resume = null;

  function checkpoint(line) {
    if (stopped) return Promise.reject(new Error("__NOVA_STOPPED__"));
    const firstPause = !started;
    const stepPause = step;
    const shouldPause = firstPause || stepPause || breakpoints.has(line);
    if (!shouldPause) return Promise.resolve();
    started = true;
    step = false;
    const reason = breakpoints.has(line) ? "breakpoint" : stepPause ? "step" : "entry";
    send("paused", {
      line,
      reason,
      frames: [{ line, fn: ${JSON.stringify(sourcePath)} }],
    });
    return new Promise((resolve) => {
      resume = (stoppedNow) => resolve(stoppedNow ? "stop" : "resume");
    }).then((outcome) => {
      if (outcome === "stop") throw new Error("__NOVA_STOPPED__");
    });
  }

  window.__nova_dbg = checkpoint;
  window.__nova_debug_ready = true;

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.source !== "nova-debug-control") return;
    if (data.action === "resume") {
      step = false;
      resume?.();
    } else if (data.action === "step") {
      step = true;
      resume?.();
    } else if (data.action === "stop") {
      // Keep the paused promise pending. The parent removes the iframe, which
      // cancels execution without surfacing an uncaught rejection from nested
      // callbacks such as timers or event handlers.
      stopped = true;
    }
  });
})();
</script>
</head>
<body>
<script type="module" data-nova-debug-source>
(async () => {
  try {
    ${code.replaceAll("</script>", "<\\/script>")}
    parent.postMessage({ source: "nova-debug", type: "exited" }, "*");
  } catch (error) {
    if (error && error.message === "__NOVA_STOPPED__") {
      parent.postMessage({ source: "nova-debug", type: "stopped" }, "*");
      return;
    }
    parent.postMessage({
      source: "nova-debug",
      type: "runtime-error",
      text: error && (error.stack || error.message) ? (error.stack || error.message) : String(error),
    }, "*");
  }
})();
</script>
</body>
</html>`;
}
