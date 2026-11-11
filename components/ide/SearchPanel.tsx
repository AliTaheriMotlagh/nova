"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaseSensitive, Regex, Search, WholeWord, X } from "lucide-react";
import type { ProjectFile } from "@/lib/types";
import { FileGlyph } from "./FileIcon";

interface Match {
  line: number;
  column: number;
  text: string;
  before: string;
  match: string;
  after: string;
}

interface FileMatches {
  file: ProjectFile;
  matches: Match[];
}

export function SearchPanel({
  files,
  focusNonce,
  onOpenAt,
}: {
  files: ProjectFile[];
  focusNonce: number;
  onOpenAt: (fileId: string, line: number, column: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [regex, setRegex] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusNonce > 0) inputRef.current?.focus();
  }, [focusNonce]);

  const { results, total, invalid } = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) return { results: [] as FileMatches[], total: 0, invalid: false };
    let pattern: RegExp;
    try {
      const source = regex ? trimmed : trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      pattern = new RegExp(
        wholeWord ? `\\b(?:${source})\\b` : source,
        caseSensitive ? "g" : "gi",
      );
    } catch {
      return { results: [] as FileMatches[], total: 0, invalid: true };
    }

    const next: FileMatches[] = [];
    let count = 0;
    for (const file of files) {
      if (file.kind !== "file") continue;
      const matches: Match[] = [];
      const lines = (file.content ?? "").split("\n");
      for (let index = 0; index < lines.length && matches.length < 25; index += 1) {
        const line = lines[index];
        pattern.lastIndex = 0;
        let found = pattern.exec(line);
        let guard = 0;
        while (found && guard < 8) {
          matches.push({
            line: index + 1,
            column: found.index + 1,
            text: line,
            before: line.slice(0, found.index),
            match: found[0] || "",
            after: line.slice(found.index + found[0].length),
          });
          count += 1;
          if (found[0] === "") break;
          found = pattern.exec(line);
          guard += 1;
        }
        if (count >= 120) break;
      }
      if (matches.length > 0) next.push({ file, matches });
      if (count >= 120) break;
    }
    return { results: next, total: count, invalid: false };
  }, [query, files, caseSensitive, wholeWord, regex]);

  return (
    <div className="search-panel">
      <div className="search-input-wrap">
        <Search size={13} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search workspace"
          spellCheck={false}
          aria-label="Search workspace"
        />
        <div className="search-toggles">
          <button
            className={caseSensitive ? "active" : ""}
            onClick={() => setCaseSensitive((value) => !value)}
            title="Match case"
          >
            <CaseSensitive size={13} />
          </button>
          <button
            className={wholeWord ? "active" : ""}
            onClick={() => setWholeWord((value) => !value)}
            title="Match whole word"
          >
            <WholeWord size={13} />
          </button>
          <button
            className={regex ? "active" : ""}
            onClick={() => setRegex((value) => !value)}
            title="Use regular expression"
          >
            <Regex size={13} />
          </button>
        </div>
      </div>

      <div className="search-summary">
        {invalid ? (
          <span style={{ color: "var(--danger)" }}>Invalid regular expression</span>
        ) : query.trim() ? (
          <span>
            {total} result{total === 1 ? "" : "s"} in {results.length} file{results.length === 1 ? "" : "s"}
          </span>
        ) : (
          <span>Search every file in this workspace</span>
        )}
        {query && (
          <button className="search-clear" onClick={() => setQuery("")} title="Clear search">
            <X size={11} />
          </button>
        )}
      </div>

      <div className="search-results">
        {results.map(({ file, matches }) => (
          <div className="search-file" key={file.id}>
            <div className="search-file-head">
              <FileGlyph path={file.path} size={12} />
              <span className="search-file-name">{file.path.split("/").pop()}</span>
              <span className="search-file-path">{file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : ""}</span>
              <span className="search-file-count">{matches.length}</span>
            </div>
            {matches.map((match, index) => (
              <button
                className="search-match"
                key={`${match.line}-${match.column}-${index}`}
                onClick={() => onOpenAt(file.id, match.line, match.column)}
              >
                <span className="search-line-no">{match.line}</span>
                <span className="search-line-text">
                  {match.before}
                  <mark>{match.match || " "}</mark>
                  {match.after}
                </span>
              </button>
            ))}
          </div>
        ))}
        {query.trim() && !invalid && results.length === 0 && (
          <div className="panel-empty">
            <Search size={20} />
            <p>No matches for “{query}”</p>
          </div>
        )}
      </div>
    </div>
  );
}
