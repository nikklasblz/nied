// src/lib/reading/tokenize-dom.ts
import { segment } from "./segment";

export interface Tokenized {
  chars: HTMLElement[];
  charWord: number[];
  charSent: number[];
  total: number;
}

// Containers whose text must NOT be paced (kept intact + selectable).
const OMIT_SELECTOR =
  "pre, code, table, figure, img, svg, .katex, .katex-display, .mermaid";

/** Nearest block-level ancestor used to detect paragraph boundaries. */
function blockOf(node: Node, root: Element): Element | null {
  let el: Element | null =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  while (el && el !== root) {
    if (/^(P|LI|H1|H2|H3|H4|H5|H6|BLOCKQUOTE)$/.test(el.tagName)) return el;
    el = el.parentElement;
  }
  return null;
}

/**
 * Wrap pacable text in spans. Mutates the DOM under `root`. Idempotent guard:
 * if already tokenized (a `.pc` exists), returns the existing spans.
 */
export function tokenizeArticle(root: HTMLElement): Tokenized {
  const existing = root.querySelectorAll<HTMLElement>("span.pc");
  if (existing.length > 0) {
    const chars = Array.from(existing);
    return {
      chars,
      charWord: chars.map((c) => Number(c.dataset.w)),
      charSent: chars.map((c) => Number(c.dataset.s)),
      total: chars.length,
    };
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.nodeValue ?? "";
      if (!text.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest(OMIT_SELECTOR)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    textNodes.push(n as Text);
  }

  const chars: HTMLElement[] = [];
  const charWord: number[] = [];
  const charSent: number[] = [];
  let widBase = 0;
  let sidBase = 0;
  let prevBlock: Element | null = null;

  for (const textNode of textNodes) {
    const block = blockOf(textNode, root);
    if (prevBlock !== null && block !== prevBlock) {
      // new paragraph: advance counters so segments don't merge
      widBase = (charWord[charWord.length - 1] ?? -1) + 1;
      sidBase = (charSent[charSent.length - 1] ?? -1) + 1;
    }
    prevBlock = block;

    const text = textNode.nodeValue ?? "";
    const seg = segment(text);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < text.length; i++) {
      const span = document.createElement("span");
      span.className = "pc";
      span.textContent = text[i];
      const w = widBase + seg.wordOf[i];
      const s = sidBase + seg.sentOf[i];
      span.dataset.w = String(w);
      span.dataset.s = String(s);
      frag.appendChild(span);
      chars.push(span);
      charWord.push(w);
      charSent.push(s);
    }
    textNode.replaceWith(frag);
  }

  return { chars, charWord, charSent, total: chars.length };
}
