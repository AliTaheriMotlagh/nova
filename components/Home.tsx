"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import {
  ArrowRight,
  Boxes,
  Braces,
  Check,
  Clock,
  Copy,
  Cpu,
  Download,
  Database,
  FileCode2,
  FileText,
  FolderOpen,
  Globe2,
  HardDrive,
  Keyboard,
  Layers,
  MonitorSmartphone,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  WifiOff,
  Zap,
} from "lucide-react";
import type { Project } from "@/lib/types";
import { TEMPLATES, type TemplateDefinition } from "@/lib/templates";
import { formatBytes, timeAgo } from "@/lib/utils";
import { NovaLogo } from "./Brand";
import { Modal } from "./ui/Modal";

type TemplateAccentStyle = CSSProperties & { "--template-accent": string; "--card-accent": string };

const TEMPLATE_ICONS = {
  globe: Globe2,
  react: Braces,
  python: FileCode2,
  sparkles: Sparkles,
  database: Database,
  notes: FileText,
} as const;

function templateIcon(template: TemplateDefinition) {
  const Icon = TEMPLATE_ICONS[template.icon];
  return <Icon size={15} strokeWidth={1.7} />;
}

export interface HomeProps {
  projects: Project[];
  storage: { usage: number; quota: number };
  onOpenProject: (id: string) => void;
  onCreateProject: (templateId: string, name: string) => Promise<void>;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  onExportProject: (project: Project) => void;
  onImportProject: (file: File) => void;
  onShowShortcuts: () => void;
  onResetData: () => void;
}

export function Home({
  projects,
  storage,
  onOpenProject,
  onCreateProject,
  onDeleteProject,
  onDuplicateProject,
  onExportProject,
  onImportProject,
  onShowShortcuts,
  onResetData,
}: HomeProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [presetTemplate, setPresetTemplate] = useState("starter-web");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const recent = useMemo(() => projects.slice(0, 6), [projects]);
  const totalFiles = useMemo(
    () => projects.reduce((total, project) => total + project.files.filter((file) => file.kind === "file").length, 0),
    [projects],
  );

  function openCreate(templateId = "starter-web") {
    setPresetTemplate(templateId);
    setDialogOpen(true);
  }

  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuFor]);

  return (
    <div className="home">
      <div className="home-ambient" />
      <div className="home-shell">
        <header className="home-nav">
          <div className="home-nav-left">
            <NovaLogo />
            <nav className="home-nav-links">
              <a href="#workspaces">Workspaces</a>
              <a href="#templates">Templates</a>
              <a href="#runtimes">Runtimes</a>
            </nav>
          </div>
          <div className="home-nav-right">
            <span className="pill">
              <span className="dot" />
              Local-first · {projects.length} workspace{projects.length === 1 ? "" : "s"}
            </span>
            <button className="btn primary" onClick={() => openCreate()}>
              <Plus size={14} />
              New workspace
            </button>
          </div>
        </header>

        <main>
          <section className="hero">
            <div className="hero-copy">
              <div className="hero-kicker">
                <span className="spark">
                  <Sparkles size={9} />
                </span>
                <b>New</b> WebAssembly runtimes, now in the browser
              </div>
              <h1>
                Your entire
                <br />
                dev environment.
                <span className="gradient">In a single tab.</span>
              </h1>
              <p className="hero-sub">
                A full file explorer, Monaco editor, terminal, live preview and{" "}
                <strong>WASM runtimes</strong> — running locally, persisted in IndexedDB, and
                deployed on Vercel. No installs. No containers. No cold starts.
              </p>
              <div className="hero-actions">
                <button className="btn primary lg" onClick={() => openCreate()}>
                  Start building
                  <ArrowRight size={15} />
                </button>
                <button
                  className="btn ghost lg"
                  onClick={() => {
                    if (recent[0]) onOpenProject(recent[0].id);
                    else openCreate();
                  }}
                >
                  Open workspace
                </button>
              </div>
              <div className="hero-meta">
                <span className="hero-meta-item">
                  <ShieldCheck size={13} />
                  100% browser-local
                </span>
                <span className="hero-meta-item">
                  <Cpu size={13} />
                  WebAssembly engines
                </span>
                <span className="hero-meta-item">
                  <WifiOff size={13} />
                  No server round-trips
                </span>
              </div>
            </div>

            <div className="hero-visual">
              <HeroMockup />
            </div>
          </section>

          <section className="home-section" id="workspaces">
            <div className="section-heading">
              <div>
                <h2>Your workspaces</h2>
                <p>
                  {projects.length > 0
                    ? `${projects.length} project${projects.length === 1 ? "" : "s"} · ${totalFiles} files · stored on this device`
                    : "Projects live in your browser, isolated to this profile."}
                </p>
              </div>
              <div className="section-actions">
                <button className="btn sm" onClick={onShowShortcuts}>
                  <Keyboard size={13} />
                  Shortcuts
                </button>
                <button className="btn sm" onClick={() => importRef.current?.click()}>
                  <Upload size={13} />
                  Import
                </button>
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onImportProject(file);
                    event.target.value = "";
                  }}
                />
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="empty-workspaces">
                <span className="empty-icon">
                  <FolderOpen size={22} />
                </span>
                <h3>Your first workspace is waiting</h3>
                <p>
                  Pick a template and start editing instantly. Everything you create is saved
                  locally in IndexedDB.
                </p>
                <button className="btn primary" onClick={() => openCreate()}>
                  <Plus size={14} />
                  Create a workspace
                </button>
              </div>
            ) : (
              <div className="workspace-grid">
                {recent.map((project) => {
                  const template = TEMPLATES.find((item) => item.id === project.template);
                  const files = project.files.filter((file) => file.kind === "file").length;
                  return (
                    <article
                      key={project.id}
                      className="workspace-card"
                      style={{ "--card-accent": template?.accent ?? "#7cf6c8" } as TemplateAccentStyle}
                      onClick={() => onOpenProject(project.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") onOpenProject(project.id);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="workspace-card-head">
                        <span className="workspace-icon">
                          {template ? templateIcon(template) : <FolderOpen size={15} />}
                        </span>
                        <div className="workspace-card-actions" onClick={(event) => event.stopPropagation()}>
                          <button
                            className="icon-button"
                            title="Duplicate workspace"
                            onClick={() => onDuplicateProject(project.id)}
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            className="icon-button"
                            title="Download ZIP"
                            onClick={() => onExportProject(project)}
                          >
                            <Download size={13} />
                          </button>
                          <button
                            className="icon-button"
                            title="More"
                            onClick={() => setMenuFor(menuFor === project.id ? null : project.id)}
                          >
                            <MoreHorizontal size={14} />
                          </button>
                          {menuFor === project.id && (
                            <div className="mini-menu" onClick={(event) => event.stopPropagation()}>
                              <button onClick={() => onOpenProject(project.id)}>
                                <FolderOpen size={12} /> Open
                              </button>
                              <button onClick={() => onExportProject(project)}>
                                <Download size={12} /> Export ZIP
                              </button>
                              <button
                                className="danger"
                                onClick={() => {
                                  setMenuFor(null);
                                  onDeleteProject(project.id);
                                }}
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <h3>{project.name}</h3>
                      <p className="workspace-desc">{project.description || template?.description}</p>
                      <div className="workspace-card-foot">
                        <span>
                          <Clock size={10} />
                          {timeAgo(project.updatedAt)}
                        </span>
                        <span>{files} files</span>
                        <span className="workspace-open">
                          Open <ArrowRight size={10} />
                        </span>
                      </div>
                    </article>
                  );
                })}
                <button className="new-workspace-card" onClick={() => openCreate()}>
                  <span className="plus">
                    <Plus size={16} />
                  </span>
                  <b>New workspace</b>
                  <small>Start from a template or blank canvas</small>
                </button>
              </div>
            )}
          </section>

          <section className="home-section" id="templates">
            <div className="section-heading">
              <div>
                <h2>Start from a template</h2>
                <p>Every template is fully editable and runs in the browser.</p>
              </div>
              <span className="pill">
                <Sparkles size={10} />
                Zero setup
              </span>
            </div>
            <div className="template-row">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  className="template-card"
                  style={{ "--template-accent": template.accent } as TemplateAccentStyle}
                  onClick={() => openCreate(template.id)}
                >
                  <div className="template-top">
                    <span className="template-icon">{templateIcon(template)}</span>
                    <ArrowRight size={13} style={{ color: "var(--faint)" }} />
                  </div>
                  <h4>{template.name}</h4>
                  <p>{template.description}</p>
                  <div className="template-tag">{template.tagline}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="home-section" id="runtimes">
            <div className="section-heading">
              <div>
                <h2>One tab. Four engines.</h2>
                <p>Heavy lifting happens in WebAssembly, right on your machine.</p>
              </div>
            </div>
            <div className="feature-strip">
              <div className="feature-cell">
                <Zap size={17} />
                <h4>Monaco editor</h4>
                <p>The same editor core as VS Code, with IntelliSense and multi-cursor.</p>
              </div>
              <div className="feature-cell">
                <Cpu size={17} />
                <h4>esbuild + Pyodide</h4>
                <p>TypeScript bundling and CPython, compiled to WebAssembly.</p>
              </div>
              <div className="feature-cell">
                <HardDrive size={17} />
                <h4>IndexedDB storage</h4>
                <p>Autosave every keystroke, instantly available on refresh.</p>
              </div>
              <div className="feature-cell">
                <MonitorSmartphone size={17} />
                <h4>Sandboxed preview</h4>
                <p>Live web previews in an isolated iframe with console bridging.</p>
              </div>
            </div>
          </section>
        </main>

        <footer className="home-footer">
          <div className="home-footer-left">
            <NovaLogo compact />
            <span>Nova Studio · a local-first browser IDE</span>
          </div>
          <div className="home-footer-right">
            <span>{formatBytes(storage.usage)} used locally</span>
            <button onClick={onShowShortcuts}>Keyboard shortcuts</button>
            <button onClick={onResetData}>Reset data</button>
          </div>
        </footer>
      </div>

      <NewWorkspaceDialog
        open={dialogOpen}
        initialTemplate={presetTemplate}
        onClose={() => setDialogOpen(false)}
        onCreate={async (templateId, name) => {
          await onCreateProject(templateId, name);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

function HeroMockup() {
  return (
    <div className="mock-window">
      <div className="mock-titlebar">
        <div className="mock-dots">
          <span />
          <span />
          <span />
        </div>
        <span className="mock-filename">nova-studio / orbital / app.js</span>
        <span className="mock-run">
          <Zap size={8} fill="currentColor" /> Run
        </span>
      </div>
      <div className="mock-body">
        <aside className="mock-explorer">
          <div className="mock-explorer-label">Explorer</div>
          <div className="mock-file folder">
            <i /> src
          </div>
          <div className="mock-file active">
            <i /> app.js
          </div>
          <div className="mock-file">
            <i /> styles.css
          </div>
          <div className="mock-file">
            <i /> index.html
          </div>
          <div className="mock-file">
            <i /> utils.ts
          </div>
          <div className="mock-file folder">
            <i /> data
          </div>
          <div className="mock-file">
            <i /> README.md
          </div>
        </aside>
        <div className="mock-code">
          <div className="code-row">
            <span className="ln">1</span>
            <span>
              <span className="tok-k">import</span> {"{"} <span className="tok-f">createWorld</span> {"}"}{" "}
              <span className="tok-k">from</span> <span className="tok-s">&quot;./world&quot;</span>;
            </span>
          </div>
          <div className="code-row">
            <span className="ln">2</span>
            <span />
          </div>
          <div className="code-row">
            <span className="ln">3</span>
            <span>
              <span className="tok-k">const</span> <span className="tok-t">world</span> ={" "}
              <span className="tok-f">createWorld</span>({"{"}
            </span>
          </div>
          <div className="code-row">
            <span className="ln">4</span>
            <span>
              {"  "}name: <span className="tok-s">&quot;orbital&quot;</span>,
            </span>
          </div>
          <div className="code-row">
            <span className="ln">5</span>
            <span>
              {"  "}gravity: <span className="tok-n">0.42</span>,
            </span>
          </div>
          <div className="code-row">
            <span className="ln">6</span>
            <span>{"}"});</span>
          </div>
          <div className="code-row">
            <span className="ln">7</span>
            <span />
          </div>
          <div className="code-row">
            <span className="ln">8</span>
            <span>
              world.<span className="tok-f">on</span>(
              <span className="tok-s">&quot;frame&quot;</span>, (dt) {"=>"} {"{"}
            </span>
          </div>
          <div className="code-row">
            <span className="ln">9</span>
            <span>
              {"  "}world.<span className="tok-f">update</span>(dt);
            </span>
          </div>
          <div className="code-row">
            <span className="ln">10</span>
            <span>
              {"  "}render(world);
            </span>
          </div>
          <div className="code-row">
            <span className="ln">11</span>
            <span>{"}"});</span>
          </div>
          <div className="code-row">
            <span className="ln">12</span>
            <span />
          </div>
          <div className="code-row">
            <span className="ln">13</span>
            <span className="tok-c">// ship it ✦</span>
          </div>
        </div>
      </div>
      <div className="mock-terminal">
        <div>
          <span className="prompt">nova</span> ~/orbital <span style={{ color: "#566176" }}>❯</span>{" "}
          <span style={{ color: "#e8edf6" }}>npm run dev</span>
        </div>
        <div className="out">▲ bundle ready in 142 ms · preview live</div>
        <div className="out">
          <span style={{ color: "#7cf6c8" }}>✓</span> 0 errors · 0 warnings · 3 modules
        </div>
      </div>
      <div className="mock-preview">
        <div className="mock-preview-head">
          <span /> live preview
        </div>
        <h4>Escape velocity.</h4>
        <p>A calm, fast workspace for people who build.</p>
        <button>Get started</button>
      </div>
      <div className="float-badge wasm">
        <Cpu size={12} />
        WASM runtime ready
      </div>
      <div className="float-badge local">
        <ShieldCheck size={12} />
        Saved to IndexedDB
      </div>
    </div>
  );
}

function NewWorkspaceDialog({
  open,
  initialTemplate,
  onClose,
  onCreate,
}: {
  open: boolean;
  initialTemplate: string;
  onClose: () => void;
  onCreate: (templateId: string, name: string) => Promise<void>;
}) {
  const [templateId, setTemplateId] = useState(initialTemplate);
  const [name, setName] = useState("");
  const [touchedName, setTouchedName] = useState(false);
  const [busy, setBusy] = useState(false);

  const template = TEMPLATES.find((item) => item.id === templateId) ?? TEMPLATES[0];

  useEffect(() => {
    if (!open) return;
    setTemplateId(initialTemplate);
    setName(TEMPLATES.find((item) => item.id === initialTemplate)?.name ?? "My workspace");
    setTouchedName(false);
    setBusy(false);
  }, [open, initialTemplate]);

  function chooseTemplate(id: string) {
    setTemplateId(id);
    if (!touchedName) {
      const next = TEMPLATES.find((item) => item.id === id);
      if (next) setName(next.name);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onCreate(templateId, name.trim() || template.name);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create a workspace" subtitle="Pick a starting point. You can change every file.">
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="form-field">
            <label htmlFor="workspace-name">Workspace name</label>
            <input
              id="workspace-name"
              className="text-input"
              value={name}
              autoFocus
              placeholder="My workspace"
              onChange={(event) => {
                setName(event.target.value);
                setTouchedName(true);
              }}
              maxLength={80}
            />
          </div>
          <div className="form-field">
            <label>Template</label>
            <div className="template-picker">
              {TEMPLATES.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`template-option ${templateId === item.id ? "selected" : ""}`}
                  onClick={() => chooseTemplate(item.id)}
                >
                  <span
                    className="template-option-icon"
                    style={{ "--option-accent": item.accent } as CSSProperties}
                  >
                    {templateIcon(item)}
                  </span>
                  <span>
                    <b>{item.name}</b>
                    <small>{item.tagline}</small>
                  </span>
                  {templateId === item.id && <Check size={13} style={{ marginLeft: "auto", color: "var(--accent)" }} />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <span className="left" style={{ color: "var(--faint)", fontSize: 10.5 }}>
            Saved locally · no account required
          </span>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "Creating…" : "Create workspace"}
            {!busy && <ArrowRight size={14} />}
          </button>
        </div>
      </form>
    </Modal>
  );
}
