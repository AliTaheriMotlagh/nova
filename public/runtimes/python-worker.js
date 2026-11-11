/* eslint-disable no-undef */
const PYODIDE_VERSION = "0.28.2";
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let runtime = null;
let loading = null;

function post(type, payload = {}) {
  self.postMessage({ type, ...payload });
}

async function getRuntime() {
  if (runtime) return runtime;
  if (!loading) {
    loading = (async () => {
      post("status", { status: "loading", message: "Downloading CPython WebAssembly runtime…" });
      importScripts(`${PYODIDE_URL}pyodide.js`);
      const instance = await loadPyodide({ indexURL: PYODIDE_URL });
      instance.setStdout({
        batched: (text) => post("stdout", { text }),
      });
      instance.setStderr({
        batched: (text) => post("stderr", { text }),
      });
      runtime = instance;
      post("status", { status: "ready", message: "Python runtime ready" });
      return instance;
    })().catch((error) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

async function run(code) {
  const pyodide = await getRuntime();
  post("status", { status: "running", message: "Running Python…" });
  try {
    const result = await pyodide.runPythonAsync(code);
    const value = result === undefined ? null : String(result);
    if (value !== null) post("stdout", { text: value });
    post("done");
  } catch (error) {
    post("error", { message: error?.message || String(error) });
    post("done");
  }
}

async function install(packageName) {
  const pyodide = await getRuntime();
  post("status", { status: "loading", message: `Installing ${packageName}…` });
  try {
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    await micropip.install(packageName);
    post("installed", { packageName });
    post("status", { status: "ready", message: "Python runtime ready" });
  } catch (error) {
    post("error", { message: error?.message || String(error) });
  }
}

async function reset() {
  runtime = null;
  loading = null;
  post("status", { status: "idle", message: "Python runtime reset" });
}

self.onmessage = async (event) => {
  const data = event.data;
  if (!data || typeof data.type !== "string") return;
  try {
    if (data.type === "run") await run(String(data.code ?? ""));
    else if (data.type === "install") await install(String(data.packageName ?? ""));
    else if (data.type === "reset") await reset();
    else if (data.type === "ping") {
      if (runtime) post("status", { status: "ready", message: "Python runtime ready" });
      else post("status", { status: "idle", message: "Python runtime not loaded" });
    }
  } catch (error) {
    post("error", { message: error?.message || String(error) });
    post("status", { status: "error", message: "Python runtime failed to load" });
    post("done");
  }
};
