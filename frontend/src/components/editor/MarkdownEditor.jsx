import React from "react";
import MarkdownPreview from "./MarkdownPreview.jsx";

export default function MarkdownEditor({ content, onChange, mode, onModeChange }) {
  return (
    <section className="markdown-editor" aria-label="Story content editor">
      <div className="preview-tabs" role="group" aria-label="Editor display">
        <button
          type="button"
          aria-pressed={mode === "edit"}
          onClick={() => onModeChange("edit")}
        >
          Write
        </button>
        <button
          type="button"
          aria-pressed={mode === "preview"}
          onClick={() => onModeChange("preview")}
        >
          Preview
        </button>
      </div>
      <div className={`markdown-panes markdown-mode-${mode}`}>
        <label className="form-label markdown-source">
          STORY CONTENT (MARKDOWN)
          <textarea
            aria-label="Story content in Markdown"
            maxLength={20000}
            required
            rows={18}
            value={content}
            onChange={(event) => onChange(event.target.value)}
            placeholder={"Write your story in Markdown…\n\n# A heading\n\nYour ideas go here."}
          />
        </label>
        <section className="markdown-preview" aria-label="Rendered Markdown preview">
          <h2 className="preview-heading">Preview</h2>
          <MarkdownPreview content={content} />
        </section>
      </div>
    </section>
  );
}
