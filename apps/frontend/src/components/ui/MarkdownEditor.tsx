"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import { Bold, Code, Heading2, Italic, Link, List, Quote } from "lucide-react";

const steelEditorTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "var(--color-on-surface)",
    fontSize: "14px",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "1.7",
  },
  ".cm-content": {
    caretColor: "var(--color-primary)",
    padding: "12px 0",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--color-primary)" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--color-primary-fixed-dim)",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    color: "var(--color-outline-variant)",
    border: "none",
  },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 8px 0 0" },
  ".cm-placeholder": { color: "var(--color-on-surface-variant)" },
  ".cm-matchingBracket": {
    backgroundColor: "var(--color-surface-container-highest)",
    outline: "1px solid var(--color-outline-variant)",
  },
});

type Props = {
  value: string;
  onChange: (value: string) => void;
  minHeight?: string;
  placeholder?: string;
};

const toolbar: Array<{ label: string; icon: typeof Bold; snippet: string; title: string }> = [
  { label: "Título", icon: Heading2, title: "Título (H2)", snippet: "\n## Título\n" },
  { label: "Negrita", icon: Bold, title: "Negrita", snippet: "**negrita**" },
  { label: "Cursiva", icon: Italic, title: "Cursiva", snippet: "*cursiva*" },
  { label: "Lista", icon: List, title: "Lista", snippet: "\n- elemento\n" },
  { label: "Cita", icon: Quote, title: "Cita", snippet: "\n> cita\n" },
  { label: "Código", icon: Code, title: "Código", snippet: "`código`" },
  { label: "Enlace", icon: Link, title: "Enlace", snippet: "[texto](https://)" },
];

export function MarkdownEditor({ value, onChange, minHeight = "18rem", placeholder }: Props) {
  const extensions = useMemo(
    () => [markdown({ base: markdownLanguage, codeLanguages: languages }), steelEditorTheme, EditorView.lineWrapping],
    [],
  );

  const insert = (snippet: string) => {
    onChange(`${value}${snippet}`);
  };

  return (
    <div className="border border-outline-variant bg-surface-container-lowest">
      <div className="flex flex-wrap items-center gap-1 border-b border-outline-variant bg-surface-container-low px-2 py-1">
        {toolbar.map((item) => (
          <button
            aria-label={item.title}
            className="flex h-7 w-7 items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            key={item.label}
            onClick={() => insert(item.snippet)}
            title={item.title}
            type="button"
          >
            <item.icon size={15} />
          </button>
        ))}
        <span className="ml-auto hidden font-label-caps text-label-caps text-[10px] text-on-surface-variant sm:block">MARKDOWN</span>
      </div>
      <div className="px-3" style={{ minHeight }}>
        <CodeMirror
          extensions={extensions}
          onChange={onChange}
          placeholder={placeholder}
          value={value}
        />
      </div>
    </div>
  );
}
