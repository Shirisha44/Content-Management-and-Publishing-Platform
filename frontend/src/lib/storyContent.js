import { marked } from "marked";
import { defaultSchema } from "rehype-sanitize";
import { API_URL } from "./api.js";

export const TEXT_COLORS = [
  { label: "Ink", value: "#202735", className: "rich-color-ink" },
  { label: "Red", value: "#b42318", className: "rich-color-red" },
  { label: "Orange", value: "#d97706", className: "rich-color-orange" },
  { label: "Green", value: "#15803d", className: "rich-color-green" },
  { label: "Blue", value: "#2563eb", className: "rich-color-blue" },
  { label: "Purple", value: "#7c3aed", className: "rich-color-purple" },
];

export const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "#fef08a", className: "rich-highlight-yellow" },
  { label: "Green", value: "#bbf7d0", className: "rich-highlight-green" },
  { label: "Blue", value: "#bfdbfe", className: "rich-highlight-blue" },
  { label: "Pink", value: "#fecaca", className: "rich-highlight-pink" },
];

const FONT_FAMILIES = [
  { label: "Sans serif", value: "Arial", className: "rich-font-sans" },
  { label: "Serif", value: "Georgia", className: "rich-font-serif" },
  { label: "Rounded", value: "Trebuchet MS", className: "rich-font-rounded" },
  { label: "Monospace", value: "Courier New", className: "rich-font-mono" },
];

const FONT_SIZES = ["14px", "18px", "24px", "32px"];
const FONT_WEIGHTS = ["400", "500", "600", "700"];
const highlightClasses = HIGHLIGHT_COLORS.map((color) => color.className);
const allowedClasses = [
  ...TEXT_COLORS.map((color) => color.className),
  ...highlightClasses,
  ...FONT_FAMILIES.map((font) => font.className),
  ...FONT_SIZES.map((size) => `rich-size-${Number.parseInt(size, 10)}`),
  ...FONT_WEIGHTS.map((weight) => `rich-weight-${weight}`),
];

export function prepareStoryContent(content) {
  const html = marked.parse(content || "");
  const document = new DOMParser().parseFromString(html, "text/html");
  for (const image of document.querySelectorAll("img[src^='/uploads/']")) {
    image.src = `${API_URL}${image.getAttribute("src")}`;
  }
  return document.body.innerHTML;
}

export function normalizeStoryContent(html) {
  const document = new DOMParser().parseFromString(html, "text/html");
  for (const image of document.querySelectorAll("img[src]")) {
    const source = image.getAttribute("src");
    if (source?.startsWith(`${API_URL}/uploads/`)) {
      image.setAttribute("src", source.slice(API_URL.length));
    }
  }
  return document.body.innerHTML;
}

function getClassName(value, options) {
  const normalizedValue = value.toLowerCase().replace(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*1(?:\.0+)?)?\s*\)$/,
    (_match, red, green, blue) => `#${[red, green, blue]
      .map((channel) => Number(channel).toString(16).padStart(2, "0"))
      .join("")}`,
  );
  const color = options.find((option) => option.value.toLowerCase() === normalizedValue);
  return color?.className;
}

function collectRichTextClasses(tree) {
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "element") {
      const properties = node.properties || {};
      const current = Array.isArray(properties.className)
        ? properties.className.filter((value) => allowedClasses.includes(value))
        : [];
      const style = typeof properties.style === "string" ? properties.style : "";
      for (const declaration of style.split(";")) {
        const separator = declaration.indexOf(":");
        if (separator < 0) continue;
        const property = declaration.slice(0, separator).trim().toLowerCase();
        const value = declaration.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
        let className;
        if (property === "color") className = getClassName(value, TEXT_COLORS);
        if (property === "background-color") className = getClassName(value, HIGHLIGHT_COLORS);
        if (property === "font-family") {
          className = FONT_FAMILIES.find(
            (font) => font.value.toLowerCase() === value.split(",")[0].trim().toLowerCase(),
          )?.className;
        }
        if (property === "font-size" && FONT_SIZES.includes(value)) {
          className = `rich-size-${Number.parseInt(value, 10)}`;
        }
        if (property === "font-weight" && FONT_WEIGHTS.includes(value)) {
          className = `rich-weight-${value}`;
        }
        if (className) current.push(className);
      }

      const highlight = properties.dataColor || properties["data-color"];
      if (node.tagName === "mark" && typeof highlight === "string") {
        const className = getClassName(highlight, HIGHLIGHT_COLORS);
        if (className) current.push(className);
      }

      delete properties.style;
      delete properties.dataColor;
      delete properties["data-color"];
      properties.className = [...new Set(current)];
      if (!properties.className.length) delete properties.className;
    }
    for (const child of node.children || []) visit(child);
  }
  visit(tree);
}

export const storyHtmlSanitizeSchema = {
  ...defaultSchema,
  tagNames: [...new Set([...defaultSchema.tagNames, "span", "mark"])],
  attributes: {
    ...defaultSchema.attributes,
    span: [["className", ...allowedClasses]],
    mark: [["className", ...highlightClasses]],
  },
};

export const sanitizeRichTextStyles = () => (tree) => collectRichTextClasses(tree);
