import type { OnLoadArgs, OnResolveArgs, Plugin } from "esbuild-wasm";
import type { BuildResult, ProjectFile } from "./types";
import { basename, dirname, extname, joinPath, normalizePath } from "./utils";

const ESBUILD_WASM_URL = "/wasm/esbuild.wasm";

let engine: Promise<typeof import("esbuild-wasm")> | null = null;

async function getEngine(): Promise<typeof import("esbuild-wasm")> {
  if (!engine) {
    engine = (async () => {
      const esbuild = await import("esbuild-wasm/esm/browser.js");
      await esbuild.initialize({
        wasmURL: ESBUILD_WASM_URL,
        worker: true,
      });
      return esbuild;
    })().catch((error) => {
      engine = null;
      throw error;
    });
  }
  return engine;
}

const RESOLVE_EXTENSIONS = [
  "",
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".mjs",
  ".json",
  ".css",
  ".svg",
  ".txt",
];

const LOADERS: Record<string, "tsx" | "ts" | "jsx" | "js" | "css" | "json" | "text" | "dataurl" | "empty"> = {
  ".tsx": "tsx",
  ".ts": "ts",
  ".jsx": "jsx",
  ".js": "js",
  ".mjs": "js",
  ".cjs": "js",
  ".css": "css",
  ".json": "json",
  ".md": "text",
  ".txt": "text",
  ".svg": "dataurl",
  ".png": "dataurl",
  ".jpg": "dataurl",
  ".jpeg": "dataurl",
  ".gif": "dataurl",
  ".webp": "dataurl",
};

function resolveVirtual(
  path: string,
  importer: string | undefined,
  fileMap: Map<string, ProjectFile>,
): string | null {
  const base = importer ? dirname(importer) : "";
  const raw = normalizePath(path.startsWith("/") ? path.slice(1) : joinPath(base, path));
  for (const extension of RESOLVE_EXTENSIONS) {
    const candidate = normalizePath(`${raw}${extension}`);
    if (fileMap.has(candidate)) return candidate;
  }
  for (const extension of RESOLVE_EXTENSIONS.filter(Boolean)) {
    const candidate = normalizePath(joinPath(raw, `index${extension}`));
    if (fileMap.has(candidate)) return candidate;
  }
  return null;
}

function makePlugin(fileMap: Map<string, ProjectFile>, externals: Set<string>): Plugin {
  return {
    name: "nova-virtual-fs",
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args: OnResolveArgs) => {
        if (args.kind === "entry-point") {
          const resolved = resolveVirtual(args.path, undefined, fileMap) ?? normalizePath(args.path);
          return { path: resolved, namespace: "nova" };
        }

        if (args.path.startsWith(".")) {
          const resolved = resolveVirtual(args.path, args.importer, fileMap);
          if (!resolved) {
            return {
              errors: [
                {
                  text: `Could not resolve "${args.path}" from "${args.importer || "/"}"`,
                },
              ],
            };
          }
          return { path: resolved, namespace: "nova" };
        }

        if (args.path.startsWith("/")) {
          const resolved = resolveVirtual(args.path, undefined, fileMap);
          if (resolved) return { path: resolved, namespace: "nova" };
        }

        if (args.path.startsWith("data:") || args.path.startsWith("node:")) {
          return { path: args.path, external: true };
        }

        externals.add(args.path);
        return { path: args.path, external: true };
      });

      build.onLoad({ filter: /.*/, namespace: "nova" }, (args: OnLoadArgs) => {
        const file = fileMap.get(args.path);
        if (!file) {
          return { errors: [{ text: `Virtual file not found: ${args.path}` }] };
        }
        const extension = extname(args.path);
        const loader = LOADERS[extension] ?? "text";
        return {
          contents: file.content ?? "",
          loader,
          resolveDir: dirname(args.path),
        };
      });
    },
  };
}

function findHtml(files: Map<string, ProjectFile>): string | null {
  for (const candidate of ["index.html", "public/index.html", "src/index.html"]) {
    if (files.has(candidate)) return candidate;
  }
  return null;
}

function findWebEntry(files: Map<string, ProjectFile>): string | null {
  const candidates = [
    "src/main.tsx",
    "src/main.jsx",
    "src/main.ts",
    "src/main.js",
    "src/index.tsx",
    "src/index.jsx",
    "src/index.ts",
    "src/index.js",
    "main.tsx",
    "main.jsx",
    "main.ts",
    "main.js",
    "index.tsx",
    "index.jsx",
    "index.ts",
    "index.js",
    "app.js",
    "app.ts",
  ];
  for (const candidate of candidates) {
    if (files.has(candidate)) return candidate;
  }
  return null;
}

function splitPackageSpecifier(specifier: string): { name: string; subpath: string } {
  const parts = specifier.split("/");
  if (specifier.startsWith("@")) {
    return {
      name: parts.slice(0, 2).join("/"),
      subpath: parts.slice(2).join("/"),
    };
  }
  return { name: parts[0], subpath: parts.slice(1).join("/") };
}

function readVersions(files: Map<string, ProjectFile>): Record<string, string> {
  const versions: Record<string, string> = {};
  const pkg = files.get("package.json");
  if (!pkg?.content) return versions;
  try {
    const parsed = JSON.parse(pkg.content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    for (const [name, version] of Object.entries({
      ...parsed.devDependencies,
      ...parsed.dependencies,
    })) {
      versions[name] = version.replace(/^[\^~]/, "");
    }
  } catch {
    // A broken package.json should not stop the preview.
  }
  return versions;
}

function buildImportMap(externals: Set<string>, versions: Record<string, string>): string {
  const imports: Record<string, string> = {};
  for (const specifier of externals) {
    if (/^(https?:)?\/\//.test(specifier) || specifier.startsWith("data:")) continue;
    const { name, subpath } = splitPackageSpecifier(specifier);
    const version = versions[name] ?? "latest";
    imports[specifier] = `https://esm.sh/${name}@${version}${subpath ? `/${subpath}` : ""}?target=es2022`;
  }
  if (Object.keys(imports).length === 0) return "";
  return `<script type="importmap">${JSON.stringify({ imports })}</script>`;
}

const CONSOLE_BRIDGE = `
<script>
(() => {
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
    } catch {
      return String(value);
    }
  };
  const send = (level, args) => {
    try {
      parent.postMessage({
        source: "nova-preview",
        type: "console",
        level,
        text: args.map(stringify).join(" "),
      }, "*");
    } catch {}
  };
  for (const level of ["log", "info", "warn", "error", "debug"]) {
    const original = console[level];
    console[level] = (...args) => {
      send(level, args);
      original.apply(console, args);
    };
  }
  window.addEventListener("error", (event) => {
    send("error", [event.error?.stack || event.message + " (line " + event.lineno + ")"]);
  });
  window.addEventListener("unhandledrejection", (event) => {
    send("error", ["Unhandled promise rejection:", event.reason]);
  });
  parent.postMessage({ source: "nova-preview", type: "ready" }, "*");
})();
</script>
`;

function stripLocalAssets(html: string): string {
  return html
    .replace(/<script\b[^>]*\bsrc=["'](?!https?:|\/\/)[^"']+["'][^>]*>\s*<\/script>/gi, "")
    .replace(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["'](?!https?:|\/\/)[^"']+["'][^>]*>/gi, "")
    .replace(/<link\b[^>]*\bhref=["'](?!https?:|\/\/)[^"']+["'][^>]*\brel=["']stylesheet["'][^>]*>/gi, "");
}

function inlineLocalStyles(html: string, files: Map<string, ProjectFile>): string {
  return html.replace(
    /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']\.?\/?([^"']+)["'][^>]*>/gi,
    (match, path: string) => {
      const file = files.get(normalizePath(path));
      if (!file?.content) return match;
      return `<style data-nova-file="${path}">${file.content.replaceAll("</style>", "<\\/style>")}</style>`;
    },
  );
}

function defaultHtml(entry: string | null): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Nova preview</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #080b12; color: #e7ecf5; display: grid; place-items: center; }
  #root { width: 100%; }
  .nova-empty { max-width: 520px; padding: 48px; text-align: center; margin: 0 auto; }
  .nova-empty h1 { font-size: 26px; letter-spacing: -0.03em; margin: 20px 0 8px; }
  .nova-empty p { color: #8b96ab; line-height: 1.7; }
  .nova-mark { display: inline-grid; place-items: center; width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(140deg, #7cf6c8, #7aa2ff); color: #071016; font-weight: 800; font-size: 22px; }
  code { background: rgba(255,255,255,.07); padding: 2px 6px; border-radius: 5px; font-family: ui-monospace, monospace; color: #7cf6c8; }
</style>
</head>
<body>
<div id="root">
  <div class="nova-empty">
    <div class="nova-mark">N</div>
    <h1>Script executed</h1>
    <p>Console output is streaming to the <strong>Console</strong> tab. Add an <code>index.html</code> file to design a visual preview, or open <code>${entry ?? "main.js"}</code> to keep building.</p>
  </div>
</div>
${entry ? `<script type="module" src="/${entry}"></script>` : ""}
</body>
</html>`;
}

export interface BuildWebOptions {
  entry?: string | null;
  htmlPath?: string | null;
}

export async function buildWebProject(
  projectFiles: ProjectFile[],
  options: BuildWebOptions = {},
): Promise<BuildResult> {
  const fileMap = new Map(
    projectFiles
      .filter((file) => file.kind === "file")
      .map((file) => [normalizePath(file.path), file] as const),
  );
  if (fileMap.size === 0) throw new Error("This project has no files to run.");

  const requestedHtml = options.htmlPath ? normalizePath(options.htmlPath) : null;
  const htmlPath = requestedHtml && fileMap.has(requestedHtml) ? requestedHtml : findHtml(fileMap);
  const entry = options.entry
    ? normalizePath(options.entry)
    : findWebEntry(fileMap) ?? null;

  if (!entry) {
    const html = htmlPath ? fileMap.get(htmlPath)?.content ?? "" : defaultHtml(null);
    return {
      html: injectConsole(htmlPath ? inlineLocalStyles(html, fileMap) : defaultHtml(null)),
      entry: htmlPath ?? "",
      css: "",
      js: "",
      warnings: ["No JavaScript or TypeScript entry point was found. Showing HTML only."],
      externalPackages: [],
    };
  }

  if (!fileMap.has(entry)) {
    throw new Error(`Entry point "${entry}" does not exist.`);
  }

  const esbuild = await getEngine();
  const externals = new Set<string>();
  const plugin = makePlugin(fileMap, externals);
  const versions = readVersions(fileMap);

  let result;
  try {
    result = await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      write: false,
      outdir: "/nova-out",
      entryNames: "app",
      assetNames: "assets/[name]-[hash]",
      format: "esm",
      target: "es2022",
      platform: "browser",
      jsx: "automatic",
      jsxImportSource: "react",
      sourcemap: "inline",
      sourcesContent: true,
      treeShaking: true,
      logLevel: "silent",
      metafile: true,
      loader: {},
      define: {
        "process.env.NODE_ENV": '"production"',
        global: "globalThis",
      },
      plugins: [plugin],
    });
  } catch (error) {
    const failure = error as { errors?: Array<{ text: string; location?: { file: string; line: number; column: number } }>; message?: string };
    if (failure.errors?.length) {
      const message = failure.errors
        .map((item) => {
          const location = item.location
            ? ` (${item.location.file}:${item.location.line}:${item.location.column})`
            : "";
          return `${item.text}${location}`;
        })
        .join("\n");
      throw new Error(message);
    }
    throw new Error(failure.message ?? "esbuild failed to bundle the project.");
  }

  const js = result.outputFiles?.find((file) => file.path.endsWith(".js"))?.text ?? "";
  const css = result.outputFiles?.find((file) => file.path.endsWith(".css"))?.text ?? "";
  const htmlSource = htmlPath
    ? fileMap.get(htmlPath)?.content ?? defaultHtml(entry)
    : defaultHtml(entry);

  let html = inlineLocalStyles(htmlSource, fileMap);
  html = stripLocalAssets(html);
  const importMap = buildImportMap(externals, versions);
  const injection = [
    importMap,
    css ? `<style data-nova-bundle>${css.replaceAll("</style>", "<\\/style>")}</style>` : "",
    `<script type="module" data-nova-bundle>${js.replaceAll("</script>", "<\\/script>")}</script>`,
  ]
    .filter(Boolean)
    .join("\n");

  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `${injection}\n</body>`);
  } else {
    html = `${html}\n${injection}`;
  }

  html = injectConsole(html);

  return {
    html,
    entry,
    css,
    js,
    warnings: result.warnings?.map((warning) => warning.text) ?? [],
    externalPackages: [...externals],
  };
}

function injectConsole(html: string): string {
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${CONSOLE_BRIDGE}\n</head>`);
  }
  return `${CONSOLE_BRIDGE}\n${html}`;
}

export async function buildSingleFile(file: ProjectFile): Promise<BuildResult> {
  return buildWebProject([file], { entry: file.path });
}

export function isWebProject(files: ProjectFile[]): boolean {
  const map = new Map(files.filter((file) => file.kind === "file").map((file) => [file.path, file]));
  return Boolean(findWebEntry(map) || findHtml(map));
}

export function entryForProject(files: ProjectFile[]): string | null {
  const map = new Map(files.filter((file) => file.kind === "file").map((file) => [file.path, file]));
  return findWebEntry(map) ?? findHtml(map) ?? basename(files[0]?.path ?? "");
}
