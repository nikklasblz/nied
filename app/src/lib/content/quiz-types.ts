/**
 * Tipos para el sistema de quizzes de niED.
 */

export interface QuizQuestion {
  pregunta: string;
  opciones: string[];
  respuesta_correcta: number;
  explicacion: string;
  seccion?: string;
}

export interface Quiz {
  track_id: string;
  unit_id: string;
  titulo: string;
  instrucciones: string;
  xp_por_pregunta: number;
  preguntas: QuizQuestion[];
}
