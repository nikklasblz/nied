/**
 * Parser de markdown del content layer.
 *
 * Responsabilidad: renderizar markdown a HTML con soporte GFM (tablas,
 * checklists, etc), LaTeX (KaTeX), directivas custom (:::video) y bloques
 * mermaid (que pasan como <pre><code class="language-mermaid"> y los
 * renderiza un client component).
 */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Plugin } from "unified";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Custom remark plugin que convierte directivas `:::video{src=... caption=...}`
 * en un wrapper 16:9 con <iframe> (lazy load, allowfullscreen) y figcaption.
 */
const remarkVideoDirective: Plugin = () => (tree) => {
  visit(tree, (node: unknown) => {
    const n = node as {
      type?: string;
      name?: string;
      attributes?: Record<string, string>;
      data?: Record<string, unknown>;
      children?: unknown[];
    };
    if (
      n.type === "containerDirective" ||
      n.type === "leafDirective" ||
      n.type === "textDirective"
    ) {
      if (n.name === "video") {
        const src = String(n.attributes?.src ?? "").trim();
        const caption = String(n.attributes?.caption ?? "");
        const data = n.data ?? (n.data = {});
        data.hName = "figure";

        if (src) {
          data.hProperties = { className: ["video-embed"] };
          n.children = [
            {
              type: "html",
              value: `<div class="video-embed-container"><iframe src="${escapeHtml(src)}" loading="lazy" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" title="${escapeHtml(caption || "Video")}"></iframe></div>${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}`,
            },
          ];
        } else {
          data.hProperties = { className: ["video-embed", "video-embed--placeholder"] };
          n.children = [
            {
              type: "html",
              value: `<div class="video-embed-container"><div class="video-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg><span>Video por vincular</span></div></div>${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}`,
            },
          ];
        }
      }
    }
  });
};

/**
 * Renderiza markdown a HTML con pipeline unified:
 *   parse → gfm → math → directive → video-directive
 *     → rehype (allowDangerousHtml) → raw → katex → stringify
 *
 * Importante: rehype-katex va DESPUÉS de rehype-raw para que los nodos de
 * matemáticas (que remark-math marca antes de pasar a hast) sigan siendo
 * detectables. remark-rehype con allowDangerousHtml + rehype-raw permite que
 * el HTML inline emitido por la directiva :::video se parsee como nodos hast
 * reales, no quede como texto escapado.
 */
export async function renderMarkdownToHtml(md: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkDirective)
    .use(remarkVideoDirective)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex, {
      strict: false,
      throwOnError: false,
    })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(md);
  return String(file);
}
