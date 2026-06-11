import type { CourseMeta, UnitMeta } from "@nied/schema";

/** Curso descubierto: id = nombre de carpeta bajo coursesRoot. */
export interface CourseEntry {
  id: string;
  meta: CourseMeta;
  totalHours: number;
  writtenUnits: string[]; // ids de unidades con units/<id>.md existente
}

export interface SectionView {
  index: number;
  title: string;
  html: string;
}

export interface UnitView {
  course: CourseEntry;
  unit: UnitMeta;
  preambleHtml: string;
  sections: SectionView[];
}
