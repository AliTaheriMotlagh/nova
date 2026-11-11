import type { Project, ProjectFile } from "./types";
import { makeId } from "./utils";

export interface TemplateDefinition {
  id: string;
  name: string;
  tagline: string;
  description: string;
  accent: string;
  icon: "globe" | "react" | "python" | "sparkles" | "database" | "notes";
  entryPath: string;
  files: Array<{ path: string; content: string }>;
}

const STARTER_README = `# Welcome to Nova Studio

This entire workspace lives in **your browser**. Files are stored in IndexedDB and never leave this device.

## Try it out

1. Open \`app.js\` and change the greeting.
2. Press **Run** to see the preview update.
3. Open the **Terminal** with \`Ctrl + J\`.
4. Press \`Ctrl + Shift + P\` to open the command palette.

## Shortcuts

| Action | Shortcut |
| --- | --- |
| Quick open | Ctrl / Cmd + P |
| Command palette | Ctrl / Cmd + Shift + P |
| Toggle terminal | Ctrl / Cmd + J |
| Save | Ctrl / Cmd + S |
| Toggle sidebar | Ctrl / Cmd + B |

> Tip: every project is isolated to this browser profile. Export a ZIP from the command menu to back it up.
`;

const STARTER_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nova Starter</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="page">
      <nav class="nav">
        <div class="brand"><span class="brand-dot"></span> orbital</div>
        <div class="nav-links">
          <a href="#features">Features</a>
          <a href="#numbers">Numbers</a>
          <button class="nav-cta" id="cta">Get started</button>
        </div>
      </nav>

      <section class="hero">
        <div class="eyebrow">v2.0 is now live</div>
        <h1>Ship your ideas<br /><span>at escape velocity.</span></h1>
        <p class="lede">
          A calm, fast workspace for teams who would rather build than
          manage build tooling.
        </p>
        <div class="actions">
          <button class="primary" id="launch">Start building</button>
          <a class="secondary" href="#features">Explore features</a>
        </div>
        <div class="orbit">
          <div class="orbit-ring"></div>
          <div class="orbit-core">
            <span id="counter">0</span>
            <small>runs today</small>
          </div>
          <span class="satellite s1"></span>
          <span class="satellite s2"></span>
          <span class="satellite s3"></span>
        </div>
      </section>

      <section class="features" id="features">
        <article><span>01</span><h3>Instant</h3><p>Every interaction responds in under a frame.</p></article>
        <article><span>02</span><h3>Local-first</h3><p>Your data stays yours, on your device.</p></article>
        <article><span>03</span><h3>Composable</h3><p>Small primitives that fit together beautifully.</p></article>
      </section>
    </main>
    <script type="module" src="./app.js"></script>
  </body>
</html>
`;

const STARTER_CSS = `@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap");

:root {
  --ink: #eef2ff;
  --muted: #9aa4c7;
  --lime: #c9f46b;
  --violet: #8b7bff;
  --bg: #080a16;
  --panel: rgba(255, 255, 255, 0.04);
  --line: rgba(255, 255, 255, 0.1);
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  min-height: 100vh;
  color: var(--ink);
  font-family: "DM Sans", system-ui, sans-serif;
  background:
    radial-gradient(900px 500px at 80% -10%, rgba(139, 123, 255, 0.35), transparent 60%),
    radial-gradient(700px 500px at 10% 20%, rgba(201, 244, 107, 0.12), transparent 60%),
    var(--bg);
}
body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse at 50% 20%, black, transparent 75%);
  opacity: 0.35;
}
.page { position: relative; max-width: 1120px; margin: 0 auto; padding: 28px 32px 80px; }
.nav { display: flex; align-items: center; justify-content: space-between; }
.brand { display: flex; gap: 10px; align-items: center; font-family: "Space Grotesk"; font-weight: 700; letter-spacing: -0.02em; font-size: 18px; }
.brand-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--lime); box-shadow: 0 0 20px var(--lime); }
.nav-links { display: flex; align-items: center; gap: 28px; font-size: 14px; color: var(--muted); }
.nav-links a { color: inherit; text-decoration: none; transition: color 0.2s; }
.nav-links a:hover { color: var(--ink); }
.nav-cta, .primary { background: var(--lime); color: #101408; border: 0; border-radius: 999px; padding: 10px 18px; font-weight: 700; cursor: pointer; font-family: inherit; }
.hero { padding: 100px 0 40px; max-width: 760px; }
.eyebrow { display: inline-flex; padding: 7px 12px; border: 1px solid var(--line); border-radius: 999px; color: var(--lime); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; background: var(--panel); }
.hero h1 { font-family: "Space Grotesk"; font-size: clamp(48px, 7vw, 84px); line-height: 0.98; letter-spacing: -0.05em; margin: 28px 0; }
.hero h1 span { background: linear-gradient(100deg, var(--lime), #7de2ff 55%, var(--violet)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.lede { color: var(--muted); font-size: 19px; line-height: 1.6; max-width: 520px; }
.actions { display: flex; align-items: center; gap: 14px; margin-top: 34px; }
.primary, .secondary { padding: 14px 22px; font-size: 15px; }
.secondary { color: var(--ink); text-decoration: none; border: 1px solid var(--line); border-radius: 999px; background: var(--panel); }
.orbit { position: absolute; right: 0; top: 260px; width: 360px; height: 360px; display: grid; place-items: center; opacity: 0.9; }
.orbit-ring { position: absolute; inset: 0; border: 1px solid var(--line); border-radius: 50%; animation: spin 18s linear infinite; }
.orbit-ring::after { content: ""; position: absolute; inset: 46px; border: 1px dashed rgba(255,255,255,0.13); border-radius: 50%; }
.orbit-core { width: 180px; height: 180px; border-radius: 50%; display: grid; place-items: center; align-content: center; background: radial-gradient(circle at 30% 20%, rgba(201,244,107,0.25), rgba(9,11,22,0.9)); border: 1px solid rgba(201,244,107,0.3); box-shadow: 0 0 80px rgba(201,244,107,0.15); }
.orbit-core span { font-family: "Space Grotesk"; font-size: 48px; font-weight: 700; color: var(--lime); }
.orbit-core small { color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase; font-size: 10px; }
.satellite { position: absolute; width: 14px; height: 14px; border-radius: 50%; background: var(--violet); box-shadow: 0 0 24px var(--violet); }
.s1 { top: 20px; left: 100px; }
.s2 { bottom: 50px; right: 36px; background: var(--lime); box-shadow: 0 0 24px var(--lime); }
.s3 { bottom: 18px; left: 76px; width: 8px; height: 8px; background: #7de2ff; box-shadow: 0 0 18px #7de2ff; }
.features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 80px; }
.features article { padding: 24px; border: 1px solid var(--line); border-radius: 20px; background: linear-gradient(180deg, var(--panel), transparent); }
.features span { color: var(--violet); font-family: "Space Grotesk"; font-size: 12px; }
.features h3 { font-family: "Space Grotesk"; font-size: 22px; margin: 18px 0 8px; }
.features p { color: var(--muted); margin: 0; line-height: 1.6; font-size: 14px; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 900px) {
  .orbit { position: relative; top: 0; margin-top: 60px; width: 280px; height: 280px; }
  .features { grid-template-columns: 1fr; }
  .nav-links a { display: none; }
}
`;

const STARTER_JS = `const counter = document.querySelector("#counter");
const launch = document.querySelector("#launch");
const cta = document.querySelector("#cta");

let runs = 0;
let timer;

function tick() {
  runs += Math.floor(Math.random() * 4) + 1;
  counter.textContent = runs.toLocaleString();
}

timer = window.setInterval(tick, 900);
tick();

for (const button of [launch, cta]) {
  button?.addEventListener("click", () => {
    runs += 250;
    counter.textContent = runs.toLocaleString();
    button.textContent = "You're in ✦";
    console.log("Orbital launch triggered", { runs });
  });
}

window.addEventListener("beforeunload", () => window.clearInterval(timer));

console.log(
  "%c orbital starter ",
  "background:#c9f46b;color:#101408;font-weight:700;border-radius:4px",
  "Edit app.js and press Run to reload."
);
`;

const REACT_PACKAGE = `{
  "name": "nova-react-app",
  "private": true,
  "version": "0.1.0",
  "dependencies": {
    "react": "19.3.1",
    "react-dom": "19.3.1"
  }
}
`;

const REACT_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nova · React</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

const REACT_MAIN = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`;

const REACT_APP = `import { useMemo, useState } from "react";

type Task = { id: number; label: string; done: boolean };

const initial: Task[] = [
  { id: 1, label: "Design the perfect workspace", done: true },
  { id: 2, label: "Ship something small today", done: false },
  { id: 3, label: "Take a walk outside", done: false },
];

export function App() {
  const [tasks, setTasks] = useState(initial);
  const [draft, setDraft] = useState("");
  const remaining = useMemo(() => tasks.filter((task) => !task.done).length, [tasks]);

  function addTask(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    setTasks((current) => [...current, { id: Date.now(), label: draft.trim(), done: false }]);
    setDraft("");
    console.log("Task added:", draft.trim());
  }

  function toggle(id: number) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    );
  }

  return (
    <main className="shell">
      <div className="glow" />
      <section className="card">
        <header>
          <span className="badge">Nova + React</span>
          <h1>Today, gently.</h1>
          <p>{remaining === 0 ? "Everything is done. Breathe." : \`\${remaining} things left. One at a time.\`}</p>
        </header>

        <form onSubmit={addTask}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add something worth doing..."
            aria-label="New task"
          />
          <button type="submit">Add</button>
        </form>

        <ul>
          {tasks.map((task) => (
            <li key={task.id} className={task.done ? "done" : ""}>
              <button className="check" onClick={() => toggle(task.id)} aria-label="Toggle task">
                {task.done ? "✓" : ""}
              </button>
              <span>{task.label}</span>
            </li>
          ))}
        </ul>

        <footer>
          <kbd>⌘</kbd> + <kbd>Enter</kbd> runs the preview
        </footer>
      </section>
    </main>
  );
}
`;

const REACT_CSS = `@import url("https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap");

* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  font-family: "Inter", system-ui, sans-serif;
  color: #f6f4ef;
  background: #0a0a0c;
}
.shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  position: relative;
  overflow: hidden;
  background: radial-gradient(800px 500px at 50% -20%, rgba(255, 196, 112, 0.18), transparent 60%);
}
.glow {
  position: absolute;
  width: 520px;
  height: 520px;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 120px rgba(255, 196, 112, 0.08) inset;
}
.card {
  position: relative;
  width: min(520px, 100%);
  padding: 40px;
  border-radius: 28px;
  border: 1px solid rgba(255,255,255,0.1);
  background: linear-gradient(160deg, rgba(28,28,32,0.92), rgba(15,15,18,0.96));
  box-shadow: 0 40px 100px rgba(0,0,0,0.5);
  backdrop-filter: blur(20px);
}
.badge {
  display: inline-block;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #ffc470;
  padding: 7px 10px;
  border: 1px solid rgba(255, 196, 112, 0.3);
  border-radius: 999px;
}
h1 { font-family: "Instrument Serif", serif; font-size: 54px; font-weight: 400; margin: 24px 0 6px; letter-spacing: -0.02em; }
header p { color: #9b9a96; margin: 0 0 28px; }
form { display: flex; gap: 8px; }
input {
  flex: 1;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 13px 15px;
  color: inherit;
  font: inherit;
  outline: none;
}
input:focus { border-color: rgba(255, 196, 112, 0.6); }
form button {
  border: 0;
  border-radius: 12px;
  padding: 0 18px;
  font-weight: 600;
  font-family: inherit;
  color: #1a1206;
  background: #ffc470;
  cursor: pointer;
}
ul { list-style: none; padding: 0; margin: 28px 0; display: grid; gap: 4px; }
li { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; transition: background 0.2s; }
li:hover { background: rgba(255,255,255,0.035); }
li span { font-size: 14px; color: #dedbd4; }
li.done span { text-decoration: line-through; color: #706f6b; }
.check { width: 22px; height: 22px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.2); background: transparent; color: #ffc470; cursor: pointer; display: grid; place-items: center; font-size: 12px; }
li.done .check { background: rgba(255,196,112,0.15); border-color: rgba(255,196,112,0.45); }
footer { color: #777570; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.07); padding-top: 18px; }
kbd { background: rgba(255,255,255,0.07); border-radius: 4px; padding: 2px 5px; font-family: inherit; }
`;

const REACT_README = `# React + TypeScript

A tiny task app running entirely in the browser.

- **Bundler:** esbuild compiled to WebAssembly
- **React:** loaded from ESM at runtime
- **Preview:** sandboxed iframe
- **Storage:** IndexedDB via Nova

Edit \`src/App.tsx\`, then press **Run** or enable **Live preview** in the preview pane.
`;

const PYTHON_MAIN = `"""Nova Python Lab — runs on CPython via WebAssembly.

The runtime is loaded on demand, then kept warm for the rest of your session.
"""

from dataclasses import dataclass
from statistics import mean


@dataclass
class Measurement:
    label: str
    value: float


samples = [
    Measurement("latency", 42.0),
    Measurement("throughput", 87.5),
    Measurement("error rate", 0.4),
]

print("◇ Nova Python Lab")
print("─" * 34)
for sample in samples:
    bar = "█" * max(1, int(sample.value / 5))
    print(f"{sample.label:<12} {bar:<18} {sample.value:>6.1f}")

values = [sample.value for sample in samples]
print("─" * 34)
print(f"mean = {mean(values):.2f}")
print(f"max  = {max(values):.2f}")
print()

# Try the scientific stack, too:
#   import micropip; await micropip.install("numpy")
#   import numpy as np

fib = [0, 1]
while len(fib) < 12:
    fib.append(fib[-1] + fib[-2])

print("fibonacci:", " ".join(map(str, fib)))
print("\\nTip: press Run again — globals persist between executions.")
`;

const PYTHON_README = `# Python Lab

This workspace runs **CPython 3** through Pyodide, compiled to WebAssembly.

## Features

- No install, no server, no cold container
- Persistent Python globals between runs
- Scientific packages via \`micropip\`
- Output streamed to the **Output** panel

\`\`\`python
import sys
print(sys.version)
\`\`\`

Use the terminal to install pure-Python packages:

\`\`\`bash
pip install requests
\`\`\`
`;


const SQL_QUERIES = `-- Nova SQL Playground · SQLite compiled to WebAssembly
-- Press Run to execute the whole file.

DROP TABLE IF EXISTS launches;
CREATE TABLE launches (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  mission   TEXT    NOT NULL,
  vehicle   TEXT    NOT NULL,
  payload_kg REAL,
  success   INTEGER NOT NULL
);

INSERT INTO launches (mission, vehicle, payload_kg, success) VALUES
  ('Orbital One',   'Nova Heavy',  1240.5, 1),
  ('Lunar Gateway', 'Nova Heavy',  860.0,  1),
  ('Asteroid Run',  'Nova Light',  310.2,  0),
  ('Starlink X',    'Nova Medium', 540.8,  1),
  ('Deep Field',    'Nova Heavy',  1520.0, 1);

-- A simple projection
SELECT mission, vehicle, payload_kg
FROM launches
ORDER BY payload_kg DESC;

-- Aggregates
SELECT
  vehicle,
  COUNT(*)                AS launches,
  ROUND(AVG(payload_kg))  AS avg_payload,
  SUM(success)            AS successes
FROM launches
GROUP BY vehicle
ORDER BY avg_payload DESC;

-- Total payload delivered to orbit
SELECT ROUND(SUM(payload_kg), 1) AS total_payload_kg
FROM launches
WHERE success = 1;
`;

const SQL_README = `# SQLite Playground

This workspace runs **SQLite compiled to WebAssembly** entirely in your browser.

- Press **Run** (or \`Ctrl / Cmd + Enter\`) to execute the file.
- Results appear in the **Output** panel as real tables.
- The database stays in memory for the session, so try \`INSERT\` then \`SELECT\` again.

> The engine is [sql.js](https://sql.js.org/), loaded on demand and cached by your browser.
`;

const NOTES_MD = `# Field Notes

A tiny, local-first notebook. Press **Run** to preview this markdown with live styling.

## Why browser-native?

- **Zero setup** — no containers, no remote VM.
- **Private by default** — files stay in IndexedDB on this device.
- **Fast** — WebAssembly engines boot in seconds.
- **Portable** — export the whole workspace as a ZIP.

## A small checklist

- [x] Create a Nova workspace
- [x] Edit \`notes.md\`
- [ ] Press **Run**
- [ ] Ship something

> "The best environment is the one that disappears." — someone, probably

| Runtime | Engine | Status |
| --- | --- | --- |
| JavaScript / TypeScript | esbuild WASM | Ready |
| Python | Pyodide | On demand |
| SQL | sql.js | On demand |
| HTML / CSS | Browser | Ready |

\`\`\`js
const idea = "make it feel instant";
console.log(idea);
\`\`\`

## Links

[Monaco Editor](https://microsoft.github.io/monaco-editor/) · [Pyodide](https://pyodide.org/) · [Vercel](https://vercel.com/)
`;

const NOTES_README = `# Markdown Notes

A local-first notebook. Open \`notes.md\` and press **Run** to preview it.

The preview uses GitHub-flavoured markdown, rendered inside a sandboxed iframe.
`;

const BLANK_README = `# Blank canvas

A quiet place to think.

- \`main.ts\` — your entry point
- Run with the **Run** button
- Press \`Ctrl + P\` to jump between files

Happy building.
`;

const BLANK_MAIN = `type Greeting = {
  name: string;
  punctuation?: string;
};

function greet({ name, punctuation = "!" }: Greeting): string {
  return \`Hello, \${name}\${punctuation}\`;
}

const people: Greeting[] = [
  { name: "world" },
  { name: "builder", punctuation: " ✦" },
  { name: "Nova", punctuation: "." },
];

for (const person of people) {
  console.log(greet(person));
}

console.log("\\nYour canvas is ready. Press Run to execute.");
`;

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "starter-web",
    name: "Starter Site",
    tagline: "HTML · CSS · JS",
    description: "A polished landing page with live interactions and a console.",
    accent: "#c9f46b",
    icon: "globe",
    entryPath: "app.js",
    files: [
      { path: "index.html", content: STARTER_HTML },
      { path: "styles.css", content: STARTER_CSS },
      { path: "app.js", content: STARTER_JS },
      { path: "README.md", content: STARTER_README },
    ],
  },
  {
    id: "react-ts",
    name: "React + TypeScript",
    tagline: "React · TSX · esbuild",
    description: "A typed React app bundled in-browser with esbuild WASM.",
    accent: "#61dafb",
    icon: "react",
    entryPath: "src/main.tsx",
    files: [
      { path: "index.html", content: REACT_HTML },
      { path: "package.json", content: REACT_PACKAGE },
      { path: "src/main.tsx", content: REACT_MAIN },
      { path: "src/App.tsx", content: REACT_APP },
      { path: "src/styles.css", content: REACT_CSS },
      { path: "README.md", content: REACT_README },
    ],
  },
  {
    id: "python",
    name: "Python Lab",
    tagline: "CPython · WebAssembly",
    description: "Run real Python, stream output, and install packages with micropip.",
    accent: "#ffd845",
    icon: "python",
    entryPath: "main.py",
    files: [
      { path: "main.py", content: PYTHON_MAIN },
      { path: "README.md", content: PYTHON_README },
    ],
  },
  {
    id: "sql",
    name: "SQL Playground",
    tagline: "SQLite · WebAssembly",
    description: "Query an in-memory SQLite database and inspect real result tables.",
    accent: "#38bdf8",
    icon: "database",
    entryPath: "queries.sql",
    files: [
      { path: "queries.sql", content: SQL_QUERIES },
      { path: "README.md", content: SQL_README },
    ],
  },
  {
    id: "notes",
    name: "Markdown Notes",
    tagline: "Markdown · Preview",
    description: "A local notebook with a styled, GitHub-flavoured preview.",
    accent: "#a78bfa",
    icon: "notes",
    entryPath: "notes.md",
    files: [
      { path: "notes.md", content: NOTES_MD },
      { path: "README.md", content: NOTES_README },
    ],
  },
  {
    id: "blank",
    name: "Blank Canvas",
    tagline: "TypeScript · Minimal",
    description: "No boilerplate. Just one file and a clean slate.",
    accent: "#a78bfa",
    icon: "sparkles",
    entryPath: "main.ts",
    files: [
      { path: "main.ts", content: BLANK_MAIN },
      { path: "README.md", content: BLANK_README },
    ],
  },
];

export function getTemplate(id: string): TemplateDefinition {
  return TEMPLATES.find((template) => template.id === id) ?? TEMPLATES[0];
}

export function createProjectFromTemplate(
  templateId: string,
  name: string,
): Project {
  const template = getTemplate(templateId);
  const now = Date.now();
  const files: ProjectFile[] = template.files.map((file) => ({
    id: makeId(),
    path: file.path,
    kind: "file",
    content: file.content,
  }));

  const readme = files.find((file) => file.path === "README.md");
  const entry = files.find((file) => file.path === template.entryPath) ?? readme ?? files[0];

  return {
    id: makeId(),
    name: name.trim() || template.name,
    description: template.description,
    template: template.id,
    files,
    entryPath: template.entryPath,
    openFiles: entry ? [entry.id] : [],
    activeFileId: entry?.id ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function createEmptyProject(name: string): Project {
  return createProjectFromTemplate("blank", name);
}
