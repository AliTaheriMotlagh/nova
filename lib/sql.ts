const SQL_VERSION = "1.16.0";
const SQL_JS_URL = `https://cdn.jsdelivr.net/npm/sql.js@${SQL_VERSION}/dist/sql-wasm.js`;
const SQL_WASM_URL = `https://cdn.jsdelivr.net/npm/sql.js@${SQL_VERSION}/dist/sql-wasm.wasm`;

export interface SqlColumn {
  name: string;
  type?: string;
}

export interface SqlResultSet {
  columns: string[];
  values: unknown[][];
  statement: string;
}

export interface SqlRunResult {
  results: SqlResultSet[];
  rowsModified: number;
  durationMs: number;
}

interface SqlDatabase {
  exec: (sql: string) => Array<{ columns: string[]; values: unknown[][] }>;
  getRowsModified: () => number;
  close: () => void;
}

interface SqlJsStatic {
  Database: new () => SqlDatabase;
}

declare global {
  interface Window {
    initSqlJs?: (config: { locateFile: (file: string) => string }) => Promise<SqlJsStatic>;
  }
}

let sqlPromise: Promise<SqlJsStatic> | null = null;
let database: SqlDatabase | null = null;

async function loadSqlJs(): Promise<SqlJsStatic> {
  if (sqlPromise) return sqlPromise;
  sqlPromise = new Promise<SqlJsStatic>((resolve, reject) => {
    const existing = window.initSqlJs;
    if (existing) {
      existing({ locateFile: () => SQL_WASM_URL }).then(resolve, reject);
      return;
    }
    const script = document.createElement("script");
    script.src = SQL_JS_URL;
    script.async = true;
    script.onload = () => {
      if (!window.initSqlJs) {
        reject(new Error("SQLite engine loaded but did not initialise."));
        return;
      }
      window
        .initSqlJs({ locateFile: () => SQL_WASM_URL })
        .then(resolve, reject);
    };
    script.onerror = () => reject(new Error("Could not download the SQLite WebAssembly engine."));
    document.head.appendChild(script);
  }).catch((error) => {
    sqlPromise = null;
    throw error;
  });
  return sqlPromise;
}

function getDatabase(engine: SqlJsStatic): SqlDatabase {
  if (!database) database = new engine.Database();
  return database;
}

export async function runSql(code: string): Promise<SqlRunResult> {
  const start = performance.now();
  const engine = await loadSqlJs();
  const db = getDatabase(engine);
  const raw = db.exec(code);
  const results: SqlResultSet[] = raw.map((set) => ({
    columns: set.columns,
    values: set.values,
    statement: code.trim().slice(0, 120),
  }));
  return {
    results,
    rowsModified: db.getRowsModified(),
    durationMs: performance.now() - start,
  };
}

export function resetSqlDatabase(): void {
  database?.close();
  database = null;
}
