/**
 * Loader del content layer de niED.
 *
 * Lee `<NIED_ROOT>/0X-<slug>/SYLLABUS.md` desde el filesystem y devuelve estructuras
 * tipadas. La verdad vive en markdown — esta capa es solo lectora.
 *
 * NIED_ROOT se resuelve desde `process.env.NIED_ROOT`; si no existe, asume
 * que el cwd del servidor Next.js es `<NIED_ROOT>/app/`.
 */

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
  parseFrontmatter,
  renderMarkdownToHtml,
  splitBodyByUnit,
  splitContentBySections,
} from "./parser";
import type { SyllabusBody, Track } from "./types";

const TRACK_DIR_RE = /^0[1-9]-/;

export function getNiedRoot(): string {
  const envRoot = process.env.NIED_ROOT;
  if (envRoot && existsSync(envRoot)) {
    return path.resolve(envRoot);
  }
  // Fallback: asumir que el server corre desde `<NIED_ROOT>/app/`.
  const fallback = path.resolve(process.cwd(), "..");
  return fallback;
}

/** Lista de directorios de track (`01-…`, `02-…`, …) bajo NIED_ROOT. */
async function listTrackDirs(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && TRACK_DIR_RE.test(e.name))
    .map((e) => e.name)
    .sort();
}

/** Lee y parsea solo el frontmatter de todos los SYLLABUS.md. */
export async function getAllTracks(): Promise<Track[]> {
  const root = getNiedRoot();
  const dirs = await listTrackDirs(root);
  const out: Track[] = [];
  for (const dir of dirs) {
    const file = path.join(root, dir, "SYLLABUS.md");
    if (!existsSync(file)) continue;
    const raw = await readFile(file, "utf8");
    const { meta } = parseFrontmatter(raw);
    out.push(meta);
  }
  return out;
}

/**
 * Lee un sílabo completo, parsea frontmatter, splitea el cuerpo por unidad
 * y renderiza HTML para cada bloque y para el cuerpo entero.
 *
 * Devuelve null si el track_id no existe o no tiene SYLLABUS.md.
 */
export async function getTrackById(
  trackId: string
): Promise<SyllabusBody | null> {
  const root = getNiedRoot();
  const dirs = await listTrackDirs(root);
  // Match estricto: preferir match exacto. Solo si no existe ninguna
  // carpeta con nombre idéntico al trackId, caer al match por prefijo
  // `${trackId}-`. Si hay múltiples prefijos, log y elige el primero
  // determinísticamente (orden alfabético — `dirs` ya viene ordenado).
  const exact = dirs.find((d) => d === trackId);
  const prefix = !exact
    ? dirs.filter((d) => d.startsWith(`${trackId}-`))
    : [];
  if (!exact && prefix.length > 1) {
    console.warn(
      `[content] Multiple track dirs match "${trackId}":`,
      prefix
    );
  }
  const match = exact ?? prefix[0];
  if (!match) return null;
  const file = path.join(root, match, "SYLLABUS.md");
  if (!existsSync(file)) return null;

  const raw = await readFile(file, "utf8");
  const { meta, body } = parseFrontmatter(raw);
  const { units } = splitBodyByUnit(body);

  const unitsMarkdown: Record<string, string> = {};
  const unitsHtml: Record<string, string> = {};

  // Empareja cada `unit.id` (uN) con el bloque ## Unidad N por número.
  for (const unit of meta.unidades) {
    const num = Number(unit.id.replace(/^u/, ""));
    const md = units.get(num) ?? "";
    unitsMarkdown[unit.id] = md;
    unitsHtml[unit.id] = md ? await renderMarkdownToHtml(md) : "";
  }

  const fullHtml = await renderMarkdownToHtml(body);
  return {
    meta,
    unitsMarkdown,
    unitsHtml,
    fullHtml,
    fullMarkdown: body,
  };
}

/** Lee el contenido pedagógico de una unidad (`<track>/contenido/uN.md`).
 *  Devuelve null si no existe — el caller debe fallback al cuerpo del sílabo. */
export async function getUnitContent(
  trackId: string,
  unitId: string
): Promise<{ markdown: string; html: string } | null> {
  const root = getNiedRoot();
  const dirs = await listTrackDirs(root);
  const exact = dirs.find((d) => d === trackId);
  const prefix = !exact ? dirs.filter((d) => d.startsWith(`${trackId}-`)) : [];
  const match = exact ?? prefix[0];
  if (!match) return null;
  const file = path.join(root, match, "contenido", `${unitId}.md`);
  if (!existsSync(file)) return null;
  const raw = await readFile(file, "utf8");
  // El archivo PUEDE tener frontmatter; descartarlo si lo hay.
  const { content } = matter(raw);
  const html = await renderMarkdownToHtml(content || raw);
  return { markdown: content || raw, html };
}

/**
 * Carga el contenido de una unidad y lo divide en secciones individuales.
 *
 * Devuelve null si no existe el archivo `contenido/uN.md`.
 * Los ejercicios/capstone (todo lo que sigue al bloque `## Ejercicios`) se
 * devuelven en el campo `exercises` separados del cuerpo de las secciones.
 */
export async function getUnitSections(
  trackId: string,
  unitId: string
): Promise<{
  preamble: { markdown: string; html: string };
  sections: { index: number; title: string; markdown: string; html: string }[];
  exercises: { markdown: string; html: string } | null;
} | null> {
  const content = await getUnitContent(trackId, unitId);
  if (!content) return null;

  const { preamble, sections } = splitContentBySections(content.markdown);

  // Extraer ejercicios/capstone (todo después del primer `## Ejercicios` o `## Capstone`)
  const exerciseRe = /^## (?:\d+\.\s*)?(?:Ejercicios|Capstone)/m;
  const exerciseMatch = content.markdown.match(exerciseRe);
  let exercisesMd = "";
  if (exerciseMatch && exerciseMatch.index !== undefined) {
    exercisesMd = content.markdown.slice(exerciseMatch.index).trim();
  }

  const renderedSections = await Promise.all(
    sections.map(async (s) => ({
      ...s,
      html: await renderMarkdownToHtml(s.markdown),
    }))
  );

  return {
    preamble: {
      markdown: preamble,
      html: await renderMarkdownToHtml(preamble),
    },
    sections: renderedSections,
    exercises: exercisesMd
      ? {
          markdown: exercisesMd,
          html: await renderMarkdownToHtml(exercisesMd),
        }
      : null,
  };
}

/** Helper para obtener una unidad puntual ya parseada. */
export async function getUnit(
  trackId: string,
  unitId: string
): Promise<{
  track: Track;
  unit: Track["unidades"][number];
  markdown: string;
  html: string;
} | null> {
  const syllabus = await getTrackById(trackId);
  if (!syllabus) return null;
  const unit = syllabus.meta.unidades.find((u) => u.id === unitId);
  if (!unit) return null;
  return {
    track: syllabus.meta,
    unit,
    markdown: syllabus.unitsMarkdown[unitId] ?? "",
    html: syllabus.unitsHtml[unitId] ?? "",
  };
}
