import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

export default function MarkdownPreview({ content }) {
  if (!content.trim()) {
    return <p className="preview-empty">Your Markdown preview will appear here.</p>;
  }
  return (
    <div className="markdown-content">
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{content}</ReactMarkdown>
    </div>
  );
}
