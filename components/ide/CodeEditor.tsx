"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import Editor, { loader, type BeforeMount, type OnMount } from "@monaco-editor/react";
import type { ProjectFile, Settings } from "@/lib/types";
import { getLanguage } from "@/lib/languages";
import type { Problem } from "@/lib/store";

type Monaco = Parameters<OnMount>[1];
type CodeEditorInstance = Parameters<OnMount>[0];

export interface EditorHandle {
  format: () => void;
  focus: () => void;
  reveal: (line: number, column?: number) => void;
  getValue: () => string;
  triggerAction: (action: string) => void;
}

if (typeof window !== "undefined") {
  loader.config({ paths: { vs: "/monaco/vs" } });
}

let monacoConfigured = false;

function configureMonaco(monaco: Monaco) {
  if (monacoConfigured) return;
  monacoConfigured = true;

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: true,
  });
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: true,
  });
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2022,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    allowJs: true,
    esModuleInterop: true,
  });
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2022,
    allowNonTsExtensions: true,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    allowJs: true,
  });

  monaco.editor.defineTheme("nova-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "5b6980", fontStyle: "italic" },
      { token: "keyword", foreground: "c792ea" },
      { token: "keyword.control", foreground: "c792ea" },
      { token: "string", foreground: "a5e8b8" },
      { token: "number", foreground: "ffcb8b" },
      { token: "regexp", foreground: "ffcb8b" },
      { token: "function", foreground: "82aaff" },
      { token: "type", foreground: "7cf6c8" },
      { token: "type.identifier", foreground: "7cf6c8" },
      { token: "variable", foreground: "d6deeb" },
      { token: "variable.predefined", foreground: "7aa2ff" },
      { token: "tag", foreground: "ff8fa3" },
      { token: "attribute.name", foreground: "f5d67b" },
      { token: "attribute.value", foreground: "a5e8b8" },
      { token: "delimiter", foreground: "8b98ad" },
      { token: "operator", foreground: "89ddff" },
      { token: "key", foreground: "7aa2ff" },
      { token: "string.key.json", foreground: "7aa2ff" },
      { token: "string.value.json", foreground: "a5e8b8" },
      { token: "metatag", foreground: "c792ea" },
      { token: "invalid", foreground: "ff6b81" },
    ],
    colors: {
      "editor.background": "#0a0e16",
      "editor.foreground": "#c9d4e6",
      "editorGutter.background": "#0a0e16",
      "editorLineNumber.foreground": "#303c50",
      "editorLineNumber.activeForeground": "#8fa3bf",
      "editorCursor.foreground": "#7cf6c8",
      "editor.selectionBackground": "#2a4a5a",
      "editor.inactiveSelectionBackground": "#1d3240",
      "editor.selectionHighlightBackground": "#7cf6c81a",
      "editor.lineHighlightBackground": "#ffffff06",
      "editor.lineHighlightBorder": "#00000000",
      "editorIndentGuide.background1": "#ffffff0a",
      "editorIndentGuide.activeBackground1": "#7cf6c833",
      "editorBracketMatch.background": "#7cf6c81a",
      "editorBracketMatch.border": "#7cf6c855",
      "editorWidget.background": "#101623",
      "editorWidget.border": "#ffffff14",
      "editorSuggestWidget.background": "#101623",
      "editorSuggestWidget.border": "#ffffff14",
      "editorSuggestWidget.selectedBackground": "#7cf6c814",
      "editorHoverWidget.background": "#101623",
      "editorHoverWidget.border": "#ffffff14",
      "editor.findMatchBackground": "#ffcb8b55",
      "editor.findMatchHighlightBackground": "#ffcb8b2a",
      "editorOverviewRuler.border": "#00000000",
      "minimap.background": "#0a0e16",
      "scrollbarSlider.background": "#8897ae22",
      "scrollbarSlider.hoverBackground": "#8897ae38",
      "scrollbarSlider.activeBackground": "#8897ae4d",
      "editorError.foreground": "#ff6b81",
      "editorWarning.foreground": "#ffc96b",
      "editorInfo.foreground": "#7aa2ff",
      "editorGhostText.foreground": "#556178",
    },
  });

  monaco.editor.defineTheme("nova-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8a94a6", fontStyle: "italic" },
      { token: "keyword", foreground: "8b3ecf" },
      { token: "string", foreground: "0b7d52" },
      { token: "number", foreground: "b25e09" },
      { token: "function", foreground: "245fcf" },
      { token: "type", foreground: "087f6b" },
      { token: "tag", foreground: "c02d5a" },
      { token: "attribute.name", foreground: "946200" },
      { token: "operator", foreground: "0e7490" },
      { token: "key", foreground: "245fcf" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#283449",
      "editorGutter.background": "#ffffff",
      "editorLineNumber.foreground": "#b3bccb",
      "editorLineNumber.activeForeground": "#59667d",
      "editorCursor.foreground": "#078a66",
      "editor.selectionBackground": "#b8e8da",
      "editor.lineHighlightBackground": "#f4f7fa",
      "editorIndentGuide.background1": "#e8edf3",
      "editorWidget.background": "#ffffff",
      "editorWidget.border": "#dfe5ee",
      "editorSuggestWidget.background": "#ffffff",
      "editorSuggestWidget.selectedBackground": "#eef8f4",
      "editorHoverWidget.background": "#ffffff",
      "editorHoverWidget.border": "#dfe5ee",
      "minimap.background": "#ffffff",
      "scrollbarSlider.background": "#7c899d33",
      "scrollbarSlider.hoverBackground": "#7c899d4d",
    },
  });
}

export const CodeEditor = forwardRef<
  EditorHandle,
  {
    file: ProjectFile;
    settings: Settings;
    breakpoints: number[];
    debugLine: number | null;
    revealRequest: { line: number; column?: number; nonce: number } | null;
    onChange: (value: string) => void;
    onCursor: (position: { line: number; column: number; selected: number }) => void;
    onToggleBreakpoint: (line: number) => void;
    onProblems: (problems: Problem[]) => void;
  }
>(function CodeEditor(
  {
    file,
    settings,
    breakpoints,
    debugLine,
    revealRequest,
    onChange,
    onCursor,
    onToggleBreakpoint,
    onProblems,
  },
  ref,
) {
  const editorRef = useRef<CodeEditorInstance | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationRef = useRef<string[]>([]);
  const toggleRef = useRef(onToggleBreakpoint);
  const fileRef = useRef(file);
  const problemsRef = useRef(onProblems);

  useEffect(() => {
    toggleRef.current = onToggleBreakpoint;
    fileRef.current = file;
    problemsRef.current = onProblems;
  }, [onToggleBreakpoint, file, onProblems]);

  useImperativeHandle(ref, () => ({
    format: () => {
      void editorRef.current?.getAction("editor.action.formatDocument")?.run();
    },
    focus: () => editorRef.current?.focus(),
    reveal: (line, column = 1) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.revealLineInCenter(line);
      editor.setPosition({ lineNumber: line, column });
      editor.focus();
    },
    getValue: () => editorRef.current?.getValue() ?? "",
    triggerAction: (action) => {
      void editorRef.current?.getAction(action)?.run();
    },
  }));

  const beforeMount: BeforeMount = (monaco) => {
    configureMonaco(monaco);
  };

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.focus();

    editor.onDidChangeCursorPosition((event) => {
      const selection = editor.getSelection();
      const model = editor.getModel();
      const selected =
        selection && model && !selection.isEmpty()
          ? model.getValueInRange(selection).length
          : 0;
      onCursor({
        line: event.position.lineNumber,
        column: event.position.column,
        selected,
      });
    });

    editor.onMouseDown((event) => {
      const type = event.target.type;
      if (
        type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      ) {
        const line = event.target.position?.lineNumber;
        if (line) {
          event.event.preventDefault();
          toggleRef.current(line);
        }
      }
    });

    applyDecorations();
  };

  useEffect(() => {
    applyDecorations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakpoints, debugLine, file.id]);

  useEffect(() => {
    const model = editorRef.current?.getModel();
    model?.updateOptions({ tabSize: settings.tabSize, insertSpaces: true });
  }, [settings.tabSize, file.id]);

  useEffect(() => {
    if (!revealRequest || !editorRef.current) return;
    const editor = editorRef.current;
    editor.revealLineInCenter(revealRequest.line);
    editor.setPosition({
      lineNumber: revealRequest.line,
      column: revealRequest.column ?? 1,
    });
    editor.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealRequest?.nonce]);

  function applyDecorations() {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;
    const maxLine = model.getLineCount();
    const decorations: Parameters<typeof editor.deltaDecorations>[1] = [];

    for (const line of breakpoints) {
      if (line < 1 || line > maxLine) continue;
      decorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: "breakpoint-glyph",
          glyphMarginHoverMessage: { value: `Breakpoint · line ${line}` },
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    }

    if (debugLine && debugLine >= 1 && debugLine <= maxLine) {
      decorations.push({
        range: new monaco.Range(debugLine, 1, debugLine, 1),
        options: {
          isWholeLine: true,
          className: "debug-current-line",
          glyphMarginClassName: "debug-glyph",
          overviewRuler: {
            color: "rgba(255, 201, 107, 0.85)",
            position: monaco.editor.OverviewRulerLane.Left,
          },
        },
      });
    }

    decorationRef.current = editor.deltaDecorations(decorationRef.current, decorations);
  }

  const language = getLanguage(file.path);

  return (
    <Editor
      path={file.path}
      language={language.id}
      value={file.content ?? ""}
      theme={settings.theme === "dark" ? "nova-dark" : "nova-light"}
      beforeMount={beforeMount}
      onMount={onMount}
      onChange={(value) => {
        if (typeof value === "string") onChange(value);
      }}
      onValidate={(markers) => {
        const problems: Problem[] = markers.map((marker) => ({
          fileId: fileRef.current.id,
          path: fileRef.current.path,
          line: marker.startLineNumber,
          column: marker.startColumn,
          message: marker.message,
          severity:
            marker.severity === 8 ? "error" : marker.severity === 4 ? "warning" : "info",
        }));
        problemsRef.current(problems);
      }}
      loading={
        <div className="editor-loading">
          <span className="editor-loading-dot" />
          <span>Loading Monaco…</span>
        </div>
      }
      options={{
        automaticLayout: true,
        fontFamily: '"JetBrains Mono", "SFMono-Regular", ui-monospace, Menlo, monospace',
        fontSize: settings.fontSize,
        fontLigatures: settings.fontLigatures,
        lineHeight: Math.round(settings.fontSize * 1.65),
        minimap: {
          enabled:
            settings.minimap &&
            (typeof window === "undefined" || window.innerWidth > 720),
          maxColumn: 90,
          renderCharacters: false,
          scale: 1,
        },
        wordWrap: settings.wordWrap,
        tabSize: settings.tabSize,
        insertSpaces: true,
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        cursorWidth: 2,
        padding: { top: 14, bottom: 24 },
        renderLineHighlight: "all",
        renderWhitespace: "selection",
        renderControlCharacters: true,
        glyphMargin: true,
        folding: true,
        foldingHighlight: true,
        showFoldingControls: "mouseover",
        bracketPairColorization: { enabled: true },
        guides: {
          bracketPairs: true,
          indentation: true,
          highlightActiveIndentation: true,
        },
        stickyScroll: { enabled: false },
        scrollBeyondLastLine: false,
        fixedOverflowWidgets: true,
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        contextmenu: true,
        quickSuggestions: { other: true, comments: false, strings: true },
        suggest: { preview: true, showStatusBar: true },
        acceptSuggestionOnEnter: "on",
        formatOnPaste: true,
        formatOnType: true,
        autoClosingBrackets: "languageDefined",
        autoClosingQuotes: "languageDefined",
        matchBrackets: "always",
        occurrencesHighlight: "singleFile",
        selectionHighlight: true,
        linkedEditing: true,
        codeLens: true,
        inlayHints: { enabled: "on" },
        lineNumbersMinChars: 3,
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
          useShadows: false,
        },
      }}
    />
  );
});
