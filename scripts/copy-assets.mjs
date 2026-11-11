import { cp, mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";

async function copy(sourcePath, targetPath, label) {
  const source = resolve(sourcePath);
  const target = resolve(targetPath);
  let info;
  try {
    info = await stat(source);
  } catch {
    console.error(`${label} source is missing: ${source}`);
    process.exit(1);
  }
  await mkdir(info.isDirectory() ? target : dirname(target), { recursive: true });
  await cp(source, target, { recursive: info.isDirectory(), force: true });
  console.log(`${label} → ${target}`);
}

await copy("node_modules/monaco-editor/min/vs", "public/monaco/vs", "Monaco editor");
await copy("node_modules/esbuild-wasm/esbuild.wasm", "public/wasm/esbuild.wasm", "esbuild WebAssembly");
