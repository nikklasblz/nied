export interface RawSection {
  index: number;
  title: string;
  markdown: string;
}

export interface SplitContent {
  preamble: string;
  sections: RawSection[];
}

/** Divide un unit markdown en secciones por headings `## ` (fence-aware).
 *  Cada `##` fuera de code fences abre una sección; `###` y menores no cortan. */
export function splitMarkdownSections(markdown: string): SplitContent {
  const lines = markdown.split(/\r?\n/);
  let inFence = false;
  const heads: { line: number; title: string }[] = [];
  lines.forEach((l, i) => {
    if (/^(```|~~~)/.test(l)) {
      inFence = !inFence;
    } else if (!inFence && /^## (?!#)/.test(l)) {
      heads.push({ line: i, title: l.slice(3).trim() });
    }
  });
  if (heads.length === 0) return { preamble: markdown, sections: [] };
  const preamble = lines.slice(0, heads[0]!.line).join("\n").trim();
  const sections = heads.map((h, k) => ({
    index: k + 1,
    title: h.title,
    markdown: lines
      .slice(h.line, k + 1 < heads.length ? heads[k + 1]!.line : lines.length)
      .join("\n")
      .trim(),
  }));
  return { preamble, sections };
}
