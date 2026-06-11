/**
 * Tipos del content layer de niED.
 *
 * Los SYLLABUS.md viven en `<NIED_ROOT>/0X-<slug>/SYLLABUS.md` y tienen frontmatter
 * YAML que el loader parsea con `gray-matter`. La estructura del frontmatter
 * está documentada en `D:\niED\00-meta\diseño\2026-04-19-niED-diseño.md` §6
 * y validada contra el sílabo real de `02-ia-ml`.
 */

export type NivelDedicacion = "ligero" | "sostenido" | "intensivo";
export type EstadoTrack = "esqueleto" | "en-progreso" | "completo";

export type UnitMeta = {
  id: string;
  titulo: string;
  dominio?: string;
  horas_estimadas: number;
  xp_reward: number;
  anclaje_sugerido: string | null;
};

export type Track = {
  track_id: string;
  titulo: string;
  nivel_dedicacion: NivelDedicacion;
  duracion_estimada_meses: number;
  horas_semanales_objetivo: number;
  prerequisitos: string[];
  proyectos_reales_relacionados: string[];
  fecha_creacion: string;
  fecha_ultima_actualizacion: string;
  estado: EstadoTrack;
  unidades: UnitMeta[];
};

export type SyllabusBody = {
  meta: Track;
  /** Markdown crudo (sin frontmatter) por unidad — keyed por `unit.id` */
  unitsMarkdown: Record<string, string>;
  /** HTML renderizado por unidad — keyed por `unit.id` */
  unitsHtml: Record<string, string>;
  /** HTML renderizado del cuerpo completo del sílabo */
  fullHtml: string;
  /** Markdown crudo del cuerpo completo (sin frontmatter) */
  fullMarkdown: string;
};
