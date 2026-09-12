export interface HtmlElement {
  type: "element";
  tagName: string;
  attrs: Record<string, string>;
  children: HtmlNode[];
  parent: HtmlElement | null;
}

export interface HtmlText {
  type: "text";
  text: string;
  parent: HtmlElement | null;
}

export type HtmlNode = HtmlElement | HtmlText;

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const TOKEN_RE = /<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][^>]*>|[^<]+/g;
const ATTR_RE = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

export function parseHtml(html: string): HtmlElement {
  const root: HtmlElement = { type: "element", tagName: "#document", attrs: {}, children: [], parent: null };
  const stack: HtmlElement[] = [root];

  for (const token of html.match(TOKEN_RE) ?? []) {
    if (token.startsWith("<!--") || token.startsWith("<!")) continue;

    if (token.startsWith("</")) {
      const closingTag = /^<\/\s*([^\s>]+)/.exec(token)?.[1]?.toLowerCase();
      if (!closingTag) continue;
      const index = stack.findLastIndex((node) => node.tagName === closingTag);
      if (index > 0) stack.splice(index);
      continue;
    }

    if (token.startsWith("<")) {
      const opening = /^<\s*([^\s/>]+)([\s\S]*?)\/?\s*>$/.exec(token);
      if (!opening) continue;
      const tagName = opening[1]!.toLowerCase();
      const attrs = parseAttributes(opening[2] ?? "");
      const parent = stack[stack.length - 1]!;
      const element: HtmlElement = { type: "element", tagName, attrs, children: [], parent };
      parent.children.push(element);
      if (!VOID_TAGS.has(tagName) && !token.trimEnd().endsWith("/>") && tagName !== "script" && tagName !== "style") {
        stack.push(element);
      }
      continue;
    }

    const parent = stack[stack.length - 1]!;
    parent.children.push({ type: "text", text: decodeEntities(token), parent });
  }

  return root;
}

function parseAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of raw.matchAll(ATTR_RE)) {
    const name = match[1]?.toLowerCase();
    if (!name) continue;
    attrs[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attrs;
}

export function decodeEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z][a-z\d]+);/gi, (full, entity: string) => {
    const normalized = entity.toLowerCase();
    if (normalized === "nbsp") return " ";
    if (normalized === "amp") return "&";
    if (normalized === "quot") return '"';
    if (normalized === "apos") return "'";
    if (normalized === "lt") return "<";
    if (normalized === "gt") return ">";
    if (normalized.startsWith("#x")) return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
    if (normalized.startsWith("#")) return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
    return full;
  });
}

export function findAll(node: HtmlNode, predicate: (element: HtmlElement) => boolean): HtmlElement[] {
  const result: HtmlElement[] = [];
  walk(node, (current) => {
    if (current.type === "element" && predicate(current)) result.push(current);
  });
  return result;
}

export function findFirst(node: HtmlNode, predicate: (element: HtmlElement) => boolean): HtmlElement | null {
  let result: HtmlElement | null = null;
  walk(node, (current) => {
    if (!result && current.type === "element" && predicate(current)) result = current;
  });
  return result;
}

export function descendants(node: HtmlNode): HtmlElement[] {
  return findAll(node, () => true);
}

export function textContent(node: HtmlNode): string {
  if (node.type === "text") return node.text;
  return node.children.map(textContent).join(" ");
}

export function normalizedText(node: HtmlNode): string {
  return textContent(node).replace(/\s+/g, " ").trim();
}

export function hasClass(node: HtmlElement, className: string): boolean {
  return (node.attrs.class ?? "").split(/\s+/).includes(className);
}

export function findAncestor(node: HtmlNode, predicate: (element: HtmlElement) => boolean): HtmlElement | null {
  let parent = node.type === "element" ? node.parent : node.parent;
  while (parent) {
    if (predicate(parent)) return parent;
    parent = parent.parent;
  }
  return null;
}

function walk(node: HtmlNode, visit: (current: HtmlNode) => void) {
  visit(node);
  if (node.type === "element") {
    for (const child of node.children) walk(child, visit);
  }
}
