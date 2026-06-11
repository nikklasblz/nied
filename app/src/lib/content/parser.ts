/**
 * Parser de markdown del content layer.
 *
 * Responsabilidades:
 *  - Aislar frontmatter YAML del cuerpo (gray-matter).
 *  - Renderizar markdown a HTML con soporte GFM (tablas, checklists, etc),
 *    LaTeX (KaTeX), directivas custom (:::video) y bloques mermaid (que pasan
 *    como <pre><code class="language-mermaid"> y los renderiza un client comp).
 *  - Splitear el cuerpo por unidad (## Unidad N) para que la UI pueda mostrar
 *    una unidad por vez sin re-procesar el sílabo entero.
 */

import matter from "gray-matter";
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
import type { Track, UnitMeta } from "./types";

const UNIT_HEADING_RE = /^## Unidad (\d+)/m;

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

/**
 * Divide el cuerpo de un SYLLABUS.md (sin frontmatter) en bloques por unidad.
 *
 * El primer bloque ("preámbulo") es todo lo que está antes del primer
 * `## Unidad 1`. Cada bloque siguiente empieza en su propio `## Unidad N`
 * y termina cuando empieza el siguiente.
 */
export function splitBodyByUnit(body: string): {
  preamble: string;
  units: Map<number, string>;
} {
  const lines = body.split(/\r?\n/);
  const blocks: { num: number | null; lines: string[] }[] = [
    { num: null, lines: [] },
  ];
  let current = blocks[0];

  for (const line of lines) {
    const m = UNIT_HEADING_RE.exec(line);
    if (m) {
      current = { num: Number(m[1]), lines: [line] };
      blocks.push(current);
    } else {
      current.lines.push(line);
    }
  }

  const preamble = (blocks[0]?.lines ?? []).join("\n").trim();
  const units = new Map<number, string>();
  for (const b of blocks.slice(1)) {
    if (b.num !== null) {
      units.set(b.num, b.lines.join("\n").trim());
    }
  }
  return { preamble, units };
}

/**
 * Divide el contenido de una unidad (uN.md) en secciones individuales.
 *
 * Cada sección empieza con un heading `## Sección N — Título` (o variantes
 * con guion / em-dash). El preámbulo es todo lo que está antes del primer
 * heading de sección.  Los headings que NO coincidan con el patrón (ej.:
 * `## Ejercicios`, `## Capstone`) terminan la lista de secciones; su contenido
 * queda descartado aquí — el caller extrae ejercicios por separado si lo necesita.
 */
export function splitContentBySections(markdown: string): {
  preamble: string;
  sections: { index: number; title: string; markdown: string }[];
} {
  const lines = markdown.split(/\r?\n/);
  const sectionRe =
    /^## (?:Sección|Seccion)\s+(\d+)\s*[—–-]\s*(.+?)(?:\s*\(~?\d+h?\))?$/i;

  const blocks: { index: number; title: string; lines: string[] }[] = [];
  const preambleLines: string[] = [];
  let current: { index: number; title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const m = sectionRe.exec(line);
    if (m) {
      if (current) blocks.push(current);
      current = { index: Number(m[1]), title: m[2].trim(), lines: [line] };
    } else if (current) {
      // Un h2 que no sea de sección termina el bloque de secciones
      if (/^## /.test(line) && !sectionRe.test(line)) {
        blocks.push(current);
        current = null;
        // El resto (ejercicios, capstone, cierre) se ignora aquí
      } else {
        current.lines.push(line);
      }
    } else {
      preambleLines.push(line);
    }
  }
  if (current) blocks.push(current);

  return {
    preamble: preambleLines.join("\n").trim(),
    sections: blocks.map((b) => ({
      index: b.index,
      title: b.title,
      markdown: b.lines.join("\n").trim(),
    })),
  };
}

/** Resultado de parsear el frontmatter de un SYLLABUS.md sin tocar el cuerpo. */
export type ParsedFrontmatter = {
  meta: Track;
  body: string;
};

/**
 * Lee un SYLLABUS.md completo, valida y normaliza el frontmatter, y devuelve
 * tanto la metadata como el cuerpo crudo (sin frontmatter).
 */
export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;

  const unidadesRaw = (data.unidades as unknown[]) ?? [];
  const unidades: UnitMeta[] = unidadesRaw.map((u) => {
    const obj = u as Record<string, unknown>;
    return {
      id: String(obj.id ?? ""),
      titulo: String(obj.titulo ?? ""),
      dominio: obj.dominio ? String(obj.dominio) : undefined,
      horas_estimadas: Number(obj.horas_estimadas ?? 0),
      xp_reward: Number(obj.xp_reward ?? 0),
      anclaje_sugerido:
        obj.anclaje_sugerido === null || obj.anclaje_sugerido === undefined
          ? null
          : String(obj.anclaje_sugerido),
    };
  });

  const meta: Track = {
    track_id: String(data.track_id ?? ""),
    titulo: String(data.titulo ?? ""),
    nivel_dedicacion:
      (data.nivel_dedicacion as Track["nivel_dedicacion"]) ?? "ligero",
    duracion_estimada_meses: Number(data.duracion_estimada_meses ?? 0),
    horas_semanales_objetivo: Number(data.horas_semanales_objetivo ?? 0),
    prerequisitos: ((data.prerequisitos as unknown[]) ?? []).map(String),
    proyectos_reales_relacionados: (
      (data.proyectos_reales_relacionados as unknown[]) ?? []
    ).map(String),
    fecha_creacion: String(data.fecha_creacion ?? ""),
    fecha_ultima_actualizacion: String(data.fecha_ultima_actualizacion ?? ""),
    estado: (data.estado as Track["estado"]) ?? "esqueleto",
    unidades,
  };

  return { meta, body: parsed.content };
}
