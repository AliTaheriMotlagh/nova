"use client";

import { useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";
import type { Terminal as XTerm } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import { useIDE } from "@/lib/store";
import type { ProjectFile } from "@/lib/types";
import { basename, dirname, joinPath, normalizePath } from "@/lib/utils";

interface TerminalProps {
  onRunProject: () => void;
  onRunFile: (path?: string) => void;
  onRunPython: (path?: string) => void;
  onRunSql: (path?: string) => void;
  onInstallPython: (packageName: string) => void;
  onExport: () => void;
  onShowShortcuts: () => void;
  onOpenHome: () => void;
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quote) {
      if (character === quote) quote = null;
      else current += character;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (/\s/.test(character)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += character;
  }
  if (current) tokens.push(current);
  return tokens;
}

export function TerminalView(props: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const cwdRef = useRef("");
  const lineRef = useRef("");
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const theme = useIDE((state) => state.settings.theme);
  const promptWriterRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    (async () => {
      const [{ Terminal }, { FitAddon: FitAddonClass }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      if (disposed || !containerRef.current) return;

      const term = new Terminal({
        fontFamily: '"JetBrains Mono", "SFMono-Regular", ui-monospace, monospace',
        fontSize: 12,
        lineHeight: 1.45,
        cursorBlink: true,
        cursorStyle: "bar",
        cursorWidth: 2,
        scrollback: 3000,
        allowTransparency: true,
        convertEol: false,
        theme:
          theme === "dark"
            ? {
                background: "#0a0e16",
                foreground: "#c9d4e6",
                cursor: "#7cf6c8",
                cursorAccent: "#0a0e16",
                selectionBackground: "#2a4a5a",
                black: "#1a2230",
                red: "#ff6b81",
                green: "#7cf6c8",
                yellow: "#ffcb8b",
                blue: "#7aa2ff",
                magenta: "#c792ea",
                cyan: "#7dd3fc",
                white: "#d7dfec",
                brightBlack: "#4b586e",
                brightRed: "#ff8fa3",
                brightGreen: "#a5ffd9",
                brightYellow: "#ffe0a8",
                brightBlue: "#a8c0ff",
                brightMagenta: "#d9b8ff",
                brightCyan: "#b5ecff",
                brightWhite: "#f4f7fb",
              }
            : {
                background: "#ffffff",
                foreground: "#283449",
                cursor: "#078a66",
                cursorAccent: "#ffffff",
                selectionBackground: "#c9e8de",
                black: "#1a2230",
                red: "#c02d5a",
                green: "#078a66",
                yellow: "#a96b12",
                blue: "#245fcf",
                magenta: "#8b3ecf",
                cyan: "#0e7490",
                white: "#e7ebf1",
                brightBlack: "#7b8798",
                brightRed: "#e0446c",
                brightGreen: "#0b9d75",
                brightYellow: "#c58a2d",
                brightBlue: "#4d7ee8",
                brightMagenta: "#a660e8",
                brightCyan: "#2d95ad",
                brightWhite: "#ffffff",
              },
      });

      const fit = new FitAddonClass();
      term.loadAddon(fit);
      term.open(containerRef.current);
      fit.fit();
      terminalRef.current = term;
      fitRef.current = fit;

      const prompt = () => {
        const path = cwdRef.current ? `~/${cwdRef.current}` : "~";
        term.write(
          `\x1b[38;2;124;246;200mnova\x1b[0m \x1b[38;2;122;162;255m${path}\x1b[0m \x1b[38;2;124;246;200m❯\x1b[0m `,
        );
      };
      promptWriterRef.current = prompt;

      const write = (text = "") => term.write(`${text}\r\n`);
      const writeLines = (lines: string[]) => {
        for (const line of lines) write(line);
      };

      const files = (): ProjectFile[] => useIDE.getState().project?.files ?? [];
      const isDirectory = (path: string): boolean => {
        const clean = normalizePath(path);
        if (!clean) return true;
        return files().some(
          (file) =>
            (file.kind === "folder" && file.path === clean) ||
            file.path.startsWith(`${clean}/`),
        );
      };

      const resolve = (input: string): string => {
        if (!input || input === ".") return cwdRef.current;
        if (input === "~") return "";
        if (input === "..") {
          const parent = dirname(cwdRef.current);
          return parent;
        }
        if (input.startsWith("./") || input.startsWith("../")) {
          return normalizePath(joinPath(cwdRef.current, input));
        }
        if (input.startsWith("/")) return normalizePath(input);
        return normalizePath(joinPath(cwdRef.current, input));
      };

      const displayPath = (path: string) => (path ? `~/${path}` : "~");

      const childEntries = (parent: string): Array<{ name: string; kind: "file" | "folder" }> => {
        const all = files();
        const names = new Map<string, "file" | "folder">();
        for (const file of all) {
          const relative = parent
            ? file.path.startsWith(`${parent}/`)
              ? file.path.slice(parent.length + 1)
              : ""
            : file.path;
          if (!relative) continue;
          const segments = relative.split("/");
          const name = segments[0];
          if (!name) continue;
          if (segments.length > 1) names.set(name, "folder");
          else if (file.kind === "folder") names.set(name, "folder");
          else names.set(name, "file");
        }
        return [...names.entries()]
          .map(([name, kind]) => ({ name, kind }))
          .sort((a, b) => {
            if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
      };

      const welcome = () => {
        write("\x1b[38;2;124;246;200m  ┌─┐ ┌┐ ┌─┐\x1b[0m");
        write("\x1b[38;2;124;246;200m  │╲ ││ │  \x1b[0m  \x1b[1mNova shell\x1b[0m \x1b[38;2;90;102;124m· local session\x1b[0m");
        write("\x1b[38;2;124;246;200m  └─┘ └┘ └─┘\x1b[0m");
        write("\x1b[38;2;90;102;124m  Type \x1b[0mhelp\x1b[38;2;90;102;124m for commands. Files are persisted in IndexedDB.\x1b[0m");
        write("");
        prompt();
      };

      const help = () => {
        const rows: Array<[string, string]> = [
          ["ls [dir]", "list files"],
          ["cd <dir>", "change directory"],
          ["cat <file>", "print a file"],
          ["tree", "show the file tree"],
          ["touch <file>", "create an empty file"],
          ["mkdir <dir>", "create a folder"],
          ["rm <path>", "delete a file or folder"],
          ["mv <a> <b>", "rename a file"],
          ["open <file>", "open a file in the editor"],
          ["run [file]", "run project or current file"],
          ["python [file]", "run Python in WASM"],
          ["pip install <pkg>", "install a Python package"],
          ["sqlite [file]", "run SQL in SQLite WASM"],
          ["node <file>", "run a JS/TS file"],
          ["export", "download the workspace ZIP"],
          ["theme [dark|light]", "change the theme"],
          ["clear", "clear the terminal"],
        ];
        write("\x1b[1mNova shell commands\x1b[0m");
        for (const [command, description] of rows) {
          write(`  \x1b[38;2;124;246;200m${command.padEnd(19)}\x1b[0m \x1b[38;2;137;151;174m${description}\x1b[0m`);
        }
        write("");
        write("\x1b[38;2;90;102;124mTip: ↑/↓ history · Tab completes paths · Ctrl+L clears\x1b[0m");
      };

      const completePath = (partial: string): string | null => {
        const directory = dirname(partial);
        const base = basename(partial);
        const targetDir = resolve(directory || ".");
        const matches = childEntries(targetDir).filter((entry) =>
          entry.name.toLowerCase().startsWith(base.toLowerCase()),
        );
        if (matches.length === 0) return null;
        if (matches.length === 1) {
          const suffix = matches[0].kind === "folder" ? "/" : "";
          return directory ? joinPath(directory, matches[0].name + suffix) : matches[0].name + suffix;
        }
        write("");
        write(
          matches
            .map((entry) =>
              entry.kind === "folder"
                ? `\x1b[38;2;122;162;255m${entry.name}/\x1b[0m`
                : entry.name,
            )
            .join("  "),
        );
        prompt();
        term.write(lineRef.current);
        return null;
      };

      const execute = async (raw: string) => {
        const input = raw.trim();
        if (!input) {
          prompt();
          return;
        }
        historyRef.current = [...historyRef.current.filter((item) => item !== input), input].slice(-100);
        historyIndexRef.current = -1;
        const tokens = tokenize(input);
        const command = tokens[0]?.toLowerCase() ?? "";
        const args = tokens.slice(1);

        try {
          switch (command) {
            case "help":
            case "?":
              help();
              break;
            case "clear":
              term.clear();
              break;
            case "pwd":
              write(displayPath(cwdRef.current));
              break;
            case "whoami":
              write("builder@nova · local profile");
              break;
            case "date":
              write(new Date().toString());
              break;
            case "echo": {
              const redirectIndex = args.indexOf(">");
              if (redirectIndex > -1 && args[redirectIndex + 1]) {
                const target = resolve(args.slice(redirectIndex + 1).join(" "));
                const content = args.slice(0, redirectIndex).join(" ");
                const state = useIDE.getState();
                const existing = files().find((file) => file.path === target && file.kind === "file");
                if (existing) state.updateFile(existing.id, content);
                else state.createFile(target, content, false);
                write(`\x1b[38;2;90;102;124mwrote ${target}\x1b[0m`);
              } else {
                write(args.join(" "));
              }
              break;
            }
            case "ls":
            case "dir": {
              const target = resolve(args.find((arg) => !arg.startsWith("-")) ?? "");
              if (!isDirectory(target)) {
                write(`\x1b[38;2;255;107;129mls: not a directory: ${target}\x1b[0m`);
                break;
              }
              const entries = childEntries(target);
              if (entries.length === 0) {
                write("\x1b[38;2;90;102;124m(empty)\x1b[0m");
                break;
              }
              const long = args.includes("-l") || args.includes("-la");
              if (long) {
                for (const entry of entries) {
                  write(
                    `${entry.kind === "folder" ? "drwxr-xr-x" : "-rw-r--r--"}  ${entry.kind === "folder" ? `\x1b[38;2;122;162;255m${entry.name}/\x1b[0m` : entry.name}`,
                  );
                }
              } else {
                write(
                  entries
                    .map((entry) =>
                      entry.kind === "folder"
                        ? `\x1b[38;2;122;162;255m${entry.name}/\x1b[0m`
                        : entry.name,
                    )
                    .join("   "),
                );
              }
              break;
            }
            case "cd":
            case "cd..": {
              const target = command === "cd.." ? resolve("..") : resolve(args[0] ?? "~");
              if (isDirectory(target)) {
                cwdRef.current = target;
                write(`\x1b[38;2;90;102;124m${displayPath(target)}\x1b[0m`);
              } else {
                write(`\x1b[38;2;255;107;129mcd: no such directory: ${target || args[0]}\x1b[0m`);
              }
              break;
            }
            case "cat": {
              const path = resolve(args[0] ?? "");
              const file = files().find((item) => item.path === path && item.kind === "file");
              if (!file) write(`\x1b[38;2;255;107;129mcat: no such file: ${args[0] ?? ""}\x1b[0m`);
              else write((file.content ?? "").replaceAll("\n", "\r\n"));
              break;
            }
            case "tree": {
              const target = resolve(args[0] ?? "");
              write(`\x1b[38;2;122;162;255m${displayPath(target)}\x1b[0m`);
              const walk = (directory: string, prefix: string, depth: number) => {
                if (depth > 4) return;
                const entries = childEntries(directory);
                entries.forEach((entry, index) => {
                  const last = index === entries.length - 1;
                  write(
                    `${prefix}${last ? "└── " : "├── "}${entry.kind === "folder" ? `\x1b[38;2;122;162;255m${entry.name}/\x1b[0m` : entry.name}`,
                  );
                  if (entry.kind === "folder") {
                    walk(joinPath(directory, entry.name), `${prefix}${last ? "    " : "│   "}`, depth + 1);
                  }
                });
              };
              walk(target, "", 0);
              break;
            }
            case "touch": {
              if (!args[0]) {
                write("\x1b[38;2;255;107;129mtouch: missing file operand\x1b[0m");
                break;
              }
              const path = resolve(args[0]);
              const state = useIDE.getState();
              if (files().some((file) => file.path === path)) {
                write(`\x1b[38;2;90;102;124m${path} already exists\x1b[0m`);
              } else {
                state.createFile(path, "", false);
                write(`\x1b[38;2;124;246;200mcreated\x1b[0m ${path}`);
              }
              break;
            }
            case "mkdir": {
              if (!args[0]) {
                write("\x1b[38;2;255;107;129mmkdir: missing operand\x1b[0m");
                break;
              }
              useIDE.getState().createFolder(resolve(args[0]));
              write(`\x1b[38;2;124;246;200mcreated folder\x1b[0m ${resolve(args[0])}`);
              break;
            }
            case "rm": {
              const path = resolve(args.find((arg) => !arg.startsWith("-")) ?? "");
              const state = useIDE.getState();
              const node = files().find((file) => file.path === path);
              if (node) {
                state.deleteNode(node.id);
                write(`\x1b[38;2;124;246;200mremoved\x1b[0m ${path}`);
              } else {
                const descendants = files().filter((file) => file.path.startsWith(`${path}/`));
                if (descendants.length > 0) {
                  for (const file of descendants) state.deleteNode(file.id);
                  write(`\x1b[38;2;124;246;200mremoved\x1b[0m ${path}`);
                } else {
                  write(`\x1b[38;2;255;107;129mrm: no such file: ${path}\x1b[0m`);
                }
              }
              break;
            }
            case "mv": {
              if (args.length < 2) {
                write("\x1b[38;2;255;107;129musage: mv <source> <name>\x1b[0m");
                break;
              }
              const source = resolve(args[0]);
              const node = files().find((file) => file.path === source);
              if (!node) {
                write(`\x1b[38;2;255;107;129mmv: no such file: ${source}\x1b[0m`);
                break;
              }
              useIDE.getState().renameNode(node.id, basename(args[1]));
              write(`\x1b[38;2;124;246;200mrenamed\x1b[0m ${source} → ${args[1]}`);
              break;
            }
            case "open":
            case "code": {
              const path = resolve(args[0] ?? "");
              const file = files().find((item) => item.path === path && item.kind === "file");
              if (!file) {
                write(`\x1b[38;2;255;107;129mno such file: ${path}\x1b[0m`);
                break;
              }
              useIDE.getState().openFile(file.id);
              write(`\x1b[38;2;90;102;124mopened ${file.path}\x1b[0m`);
              break;
            }
            case "run": {
              if (args[0]) props.onRunFile(resolve(args[0]));
              else props.onRunProject();
              write("\x1b[38;2;124;246;200m▶ running…\x1b[0m");
              break;
            }
            case "node":
            case "deno":
            case "bun": {
              if (!args[0]) {
                write("\x1b[38;2;255;107;129musage: node <file>\x1b[0m");
                break;
              }
              props.onRunFile(resolve(args[0]));
              write("\x1b[38;2;90;102;124mesbuild WASM is bundling…\x1b[0m");
              break;
            }
            case "python":
            case "python3":
            case "py": {
              props.onRunPython(args[0] ? resolve(args[0]) : undefined);
              write("\x1b[38;2;90;102;124mstarting CPython (WebAssembly)…\x1b[0m");
              break;
            }
            case "pip": {
              if (args[0] !== "install" || !args[1]) {
                write("\x1b[38;2;255;107;129musage: pip install <package>\x1b[0m");
                break;
              }
              props.onInstallPython(args[1]);
              write(`\x1b[38;2;90;102;124minstalling ${args[1]} with micropip…\x1b[0m`);
              break;
            }
            case "sqlite":
            case "sql": {
              props.onRunSql(args[0] ? resolve(args[0]) : undefined);
              write("\x1b[38;2;90;102;124mstarting SQLite (WebAssembly)…\x1b[0m");
              break;
            }
            case "npm":
            case "pnpm":
            case "yarn":
              write("\x1b[38;2;255;203;139mNova runs browser bundles, not Node servers.\x1b[0m");
              write("\x1b[38;2;90;102;124mBare npm imports are resolved from ESM at runtime. Use esm.sh imports.\x1b[0m");
              break;
            case "git":
              write("\x1b[38;2;255;203;139mNova uses local checkpoints instead of a Git remote.\x1b[0m");
              write("\x1b[38;2;90;102;124mOpen the Checkpoints view to snapshot or restore files.\x1b[0m");
              break;
            case "export":
              props.onExport();
              write("\x1b[38;2;124;246;200mexporting workspace ZIP…\x1b[0m");
              break;
            case "projects":
            case "home":
              props.onOpenHome();
              break;
            case "shortcuts":
            case "keys":
              props.onShowShortcuts();
              break;
            case "theme": {
              const next = args[0];
              if (next === "dark" || next === "light") {
                useIDE.getState().updateSettings({ theme: next });
                write(`\x1b[38;2;124;246;200mtheme → ${next}\x1b[0m`);
              } else {
                write(`current theme: ${useIDE.getState().settings.theme}`);
              }
              break;
            }
            case "novа":
            case "nova":
              write("\x1b[38;2;124;246;200mNova Studio\x1b[0m · browser-native development");
              write("https://vercel.com · local-first · WebAssembly");
              break;
            default:
              write(`\x1b[38;2;255;107;129mcommand not found: ${command}\x1b[0m`);
              write("\x1b[38;2;90;102;124mType \x1b[0mhelp\x1b[38;2;90;102;124m for a list of commands.\x1b[0m");
          }
        } catch (error) {
          write(`\x1b[38;2;255;107;129m${error instanceof Error ? error.message : String(error)}\x1b[0m`);
        }
        prompt();
      };

      term.onData((data) => {
        if (data === "\r") {
          term.write("\r\n");
          const line = lineRef.current;
          lineRef.current = "";
          void execute(line);
          return;
        }
        if (data === "\u007f") {
          if (lineRef.current.length > 0) {
            lineRef.current = lineRef.current.slice(0, -1);
            term.write("\b \b");
          }
          return;
        }
        if (data === "\u0003") {
          lineRef.current = "";
          term.write("^C\r\n");
          prompt();
          return;
        }
        if (data === "\u000c") {
          term.clear();
          prompt();
          term.write(lineRef.current);
          return;
        }
        if (data === "\u0015") {
          term.write("\b \b".repeat(lineRef.current.length));
          lineRef.current = "";
          prompt();
          return;
        }
        if (data === "\u001b[A") {
          const history = historyRef.current;
          if (history.length === 0) return;
          const nextIndex =
            historyIndexRef.current === -1
              ? history.length - 1
              : Math.max(0, historyIndexRef.current - 1);
          historyIndexRef.current = nextIndex;
          term.write("\b \b".repeat(lineRef.current.length));
          lineRef.current = history[nextIndex] ?? "";
          term.write(lineRef.current);
          return;
        }
        if (data === "\u001b[B") {
          const history = historyRef.current;
          if (historyIndexRef.current === -1) return;
          const nextIndex = historyIndexRef.current + 1;
          term.write("\b \b".repeat(lineRef.current.length));
          if (nextIndex >= history.length) {
            historyIndexRef.current = -1;
            lineRef.current = "";
          } else {
            historyIndexRef.current = nextIndex;
            lineRef.current = history[nextIndex] ?? "";
          }
          term.write(lineRef.current);
          return;
        }
        if (data === "\t") {
          const current = lineRef.current;
          const parts = current.split(" ");
          const partial = parts[parts.length - 1] ?? "";
          const completion = completePath(partial);
          if (completion) {
            parts[parts.length - 1] = completion;
            const next = parts.join(" ");
            term.write("\b \b".repeat(current.length));
            lineRef.current = next;
            term.write(next);
          }
          return;
        }
        if (data.includes("\r")) {
          const chunks = data.split("\r");
          for (let index = 0; index < chunks.length; index += 1) {
            const chunk = chunks[index];
            if (chunk) {
              lineRef.current += chunk;
              term.write(chunk);
            }
            if (index < chunks.length - 1) {
              term.write("\r\n");
              const line = lineRef.current;
              lineRef.current = "";
              void execute(line);
            }
          }
          return;
        }
        const printable = data.replace(/[\u0000-\u001f\u007f]/g, "");
        if (printable) {
          lineRef.current += printable;
          term.write(printable);
        }
      });

      resizeObserver = new ResizeObserver(() => {
        try {
          fit.fit();
        } catch {
          // The terminal may be hidden; fit fails harmlessly.
        }
      });
      resizeObserver.observe(containerRef.current);

      term.write(`\x1b[38;2;90;102;124m${new Date().toLocaleTimeString()} \x1b[0m`);
      welcome();
    })();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      terminalRef.current?.dispose();
      terminalRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;
    terminalRef.current.options.theme =
      theme === "dark"
        ? {
            background: "#0a0e16",
            foreground: "#c9d4e6",
            cursor: "#7cf6c8",
            cursorAccent: "#0a0e16",
            selectionBackground: "#2a4a5a",
          }
        : {
            background: "#ffffff",
            foreground: "#283449",
            cursor: "#078a66",
            cursorAccent: "#ffffff",
            selectionBackground: "#c9e8de",
          };
  }, [theme]);

  return <div className="terminal-host" ref={containerRef} />;
}
