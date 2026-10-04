import React, { useState } from "react";
import {
  Bold,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  LoaderCircle,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Smile,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { Color } from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { mediaUrl, apiRequest } from "../../lib/api.js";
import {
  HIGHLIGHT_COLORS,
  normalizeStoryContent,
  prepareStoryContent,
  TEXT_COLORS,
} from "../../lib/storyContent.js";

const FONT_FAMILIES = [
  { label: "Sans serif", value: "Arial" },
  { label: "Serif", value: "Georgia" },
  { label: "Rounded", value: "Trebuchet MS" },
  { label: "Monospace", value: "Courier New" },
];
const FONT_SIZES = [
  { label: "Small", value: "14px" },
  { label: "Normal", value: "18px" },
  { label: "Large", value: "24px" },
  { label: "Extra large", value: "32px" },
];
const FONT_WEIGHTS = [
  { label: "Regular", value: "400" },
  { label: "Medium", value: "500" },
  { label: "Semibold", value: "600" },
  { label: "Bold", value: "700" },
];
const EMOJIS = ["😀", "😊", "😂", "🥰", "😍", "🤔", "✨", "❤️", "👍", "🎉", "🌱", "☀️", "🌈", "📚", "✍️", "💡"];

const RichTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => (
          attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {}
        ),
      },
      fontWeight: {
        default: null,
        parseHTML: (element) => element.style.fontWeight || null,
        renderHTML: (attributes) => (
          attributes.fontWeight ? { style: `font-weight: ${attributes.fontWeight}` } : {}
        ),
      },
    };
  },
});

function ToolbarButton({ label, active = false, disabled = false, children, onClick }) {
  return (
    <button
      className={`rich-toolbar-button${active ? " is-active" : ""}`}
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function MarkdownEditor({ content, onChange, onUploadStateChange, token }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ code: false }),
      Underline,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      Image.configure({ allowBase64: false }),
      Link.configure({ openOnClick: false, defaultProtocol: "https" }),
      Placeholder.configure({ placeholder: "Write your story here…" }),
      RichTextStyle,
    ],
    content: prepareStoryContent(content),
    editorProps: {
      attributes: {
        class: "rich-text-area",
        role: "textbox",
        "aria-label": "Write your story",
        "aria-multiline": "true",
        "data-placeholder": "Write your story here…",
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      onChange(normalizeStoryContent(updatedEditor.getHTML()), updatedEditor.getText());
    },
  });

  async function uploadInlineImage(event) {
    const image = event.target.files?.[0];
    event.target.value = "";
    if (!image || !editor) return;

    setUploading(true);
    onUploadStateChange(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("image", image);
      const uploaded = await apiRequest("/images", { method: "POST", body: formData }, token);
      const alt = image.name.replace(/\.[^.]+$/, "").trim() || "Story image";
      editor.chain().focus().setImage({ src: mediaUrl(uploaded.url), alt }).run();
    } catch (requestError) {
      setUploadError(requestError.message);
    } finally {
      setUploading(false);
      onUploadStateChange(false);
    }
  }

  if (!editor) return null;

  const active = (name, options) => editor.isActive(name, options);
  const setFontSize = (value) => editor.chain().focus().setMark("textStyle", { fontSize: value }).run();
  const setFontWeight = (value) => editor.chain().focus().setMark("textStyle", { fontWeight: value }).run();
  const setLink = () => {
    const currentLink = editor.getAttributes("link").href || "";
    const url = window.prompt("Enter a link URL", currentLink);
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <section className="rich-editor" aria-label="Story content editor">
      <div className="rich-toolbar" role="toolbar" aria-label="Story formatting">
        <ToolbarButton label="Paragraph" active={active("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}>
          <Pilcrow size={16} />
        </ToolbarButton>
        <ToolbarButton label="Heading" active={active("heading")} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <span className="toolbar-heading-icon">H</span>
        </ToolbarButton>
        <span className="rich-toolbar-divider" />
        <ToolbarButton label="Bold" active={active("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton label="Italic" active={active("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton label="Underline" active={active("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton label="Strikethrough" active={active("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={16} />
        </ToolbarButton>
        <ToolbarButton label="Highlight" active={active("highlight")} onClick={() => editor.chain().focus().toggleHighlight({ color: HIGHLIGHT_COLORS[0].value }).run()}>
          <Highlighter size={16} />
        </ToolbarButton>
        <span className="rich-toolbar-divider" />
        <label className="rich-toolbar-select-label">
          <span className="sr-only">Font family</span>
          <select
            aria-label="Font family"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) editor.chain().focus().setFontFamily(event.target.value).run();
              event.target.value = "";
            }}
          >
            <option value="">Font</option>
            {FONT_FAMILIES.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
          </select>
        </label>
        <label className="rich-toolbar-select-label">
          <span className="sr-only">Font size</span>
          <select
            aria-label="Font size"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) setFontSize(event.target.value);
              event.target.value = "";
            }}
          >
            <option value="">Size</option>
            {FONT_SIZES.map((size) => <option key={size.value} value={size.value}>{size.label}</option>)}
          </select>
        </label>
        <label className="rich-toolbar-select-label">
          <span className="sr-only">Font weight</span>
          <select
            aria-label="Font weight"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) setFontWeight(event.target.value);
              event.target.value = "";
            }}
          >
            <option value="">Weight</option>
            {FONT_WEIGHTS.map((weight) => <option key={weight.value} value={weight.value}>{weight.label}</option>)}
          </select>
        </label>
        <label className="rich-toolbar-select-label">
          <span className="sr-only">Text color</span>
          <select
            aria-label="Text color"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) editor.chain().focus().setColor(event.target.value).run();
              event.target.value = "";
            }}
          >
            <option value="">Text color</option>
            {TEXT_COLORS.map((color) => <option key={color.value} value={color.value}>{color.label}</option>)}
          </select>
        </label>
        <label className="rich-toolbar-select-label">
          <span className="sr-only">Highlight color</span>
          <select
            aria-label="Highlight color"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                editor.chain().focus().toggleHighlight({ color: event.target.value }).run();
              }
              event.target.value = "";
            }}
          >
            <option value="">Highlight</option>
            {HIGHLIGHT_COLORS.map((color) => <option key={color.value} value={color.value}>{color.label}</option>)}
          </select>
        </label>
        <span className="rich-toolbar-divider" />
        <ToolbarButton label="Bulleted list" active={active("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" active={active("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton label="Block quote" active={active("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={16} />
        </ToolbarButton>
        <ToolbarButton label="Add link" active={active("link")} onClick={setLink}>
          <Link2 size={16} />
        </ToolbarButton>
        <ToolbarButton label="Emoji" active={emojiPickerOpen} onClick={() => setEmojiPickerOpen((open) => !open)}>
          <Smile size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Add image in story"
          disabled={uploading}
          onClick={() => document.getElementById("rich-story-image-upload")?.click()}
        >
          {uploading ? <LoaderCircle className="spin" size={16} /> : <ImagePlus size={16} />}
        </ToolbarButton>
        <ToolbarButton label="Horizontal divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={16} />
        </ToolbarButton>
        <ToolbarButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={16} />
        </ToolbarButton>
        <ToolbarButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={16} />
        </ToolbarButton>
      </div>
      {emojiPickerOpen && (
        <div className="emoji-picker" aria-label="Choose an emoji">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`Insert ${emoji}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                editor.chain().focus().insertContent(emoji).run();
                setEmojiPickerOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      <input
        id="rich-story-image-upload"
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={uploadInlineImage}
        disabled={uploading}
        aria-label="Choose an image to add inside the story"
      />
      <p className="rich-editor-hint">
        Format text with the toolbar. Add an image or emoji at the cursor; image uploads support JPEG, PNG, GIF, and WebP up to 5 MB.
      </p>
      {uploadError && <div className="error-banner" role="alert">{uploadError}</div>}
      <EditorContent editor={editor} />
    </section>
  );
}
