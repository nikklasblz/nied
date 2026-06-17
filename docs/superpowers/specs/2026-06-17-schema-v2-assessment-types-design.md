# Diseño: Schema v2 — Tipos de evaluación auto-corregibles

- **Fecha:** 2026-06-17
- **Estado:** Aprobado (diseño)
- **Alcance:** Paquete `@nied/schema` (tipos + grader), app (`D:\nied/app`: grading, DB, UI de quiz) y plugin (methodology + writer + auditor).
- **Fuera de alcance:** quests v0.5, evaluación no determinista (juez LLM en runtime), banco de preguntas/aleatorización entre intentos.

## 1. Problema y objetivo

El quiz v1 solo soporta **opción múltiple de una sola respuesta** (`options[]` + `correct_index`), acoplado en toda la cadena: schema, DB (`selected_answer` entero), server action (`selectedAnswer === correct_index`), SRS (card por pregunta) y UI. Esto limita la riqueza pedagógica — especialmente para cursos cuantitativos como el demo de estadística.

**Objetivo:** soportar 5 tipos adicionales **deterministas y auto-corregibles**, manteniendo retrocompatibilidad total con los quizzes v1 existentes y el modelo de puntaje **todo-o-nada**, XP, racha y SRS intactos.

## 2. Tipos de pregunta (unión discriminada por `type`)

Base compartida en todos: `question` (string ≥1), `explanation` (string ≥1), `section?` (string). Discriminador: `type`.

1. **`single`** (= v1, **default** si `type` falta): `options` (string[] ≥2, únicas) + `correct_index` (int ≥0, `< options.length`).
2. **`multiple`** (varias correctas): `options` (string[] ≥2, únicas) + `correct_indices` (int[] ≥1, únicos, cada uno `< options.length`).
3. **`numeric`**: `answer` (number) + `tolerance` (number ≥0, default 0) + `unit?` (string, solo display).
4. **`short`** (respuesta corta): `accepted` (string[] ≥1, no vacías). Normalización fija al comparar.
5. **`matching`** (emparejar): `pairs` ({left:string, right:string}[] ≥2). Los `left` se muestran en orden; los `right` se barajan en la app; el par correcto es `left[i] ↔ right[i]`.
6. **`ordering`** (ordenar): `items` (string[] ≥2) escritos **en el orden correcto**; la app los baraja para mostrar; el usuario reordena (drag-and-drop).

**Retrocompatibilidad:** `type` es opcional vía un `z.preprocess` que inyecta `type:"single"` cuando falta → los `quizzes/uN.json` v1 (sin `type`) validan sin cambios. `courseSchema.schema_version` pasa a `z.union([z.literal(1), z.literal(2)])` (el 2 es informativo: "usa evaluaciones ricas"; no es obligatorio para usar los tipos nuevos).

## 3. Respuestas y calificación

**`QuizResponse`** (unión, según el tipo de la pregunta):
- `single` → `number` (índice elegido)
- `multiple` → `number[]` (índices elegidos)
- `numeric` → `number`
- `short` → `string`
- `matching` → `number[]`: para cada `left` en índice `i`, el índice **original** del `right` elegido. Correcto si `response[i] === i` para todo `i`.
- `ordering` → `number[]`: la secuencia del usuario como índices **originales** de los ítems. Correcto si `response` es `[0,1,…,n-1]`.

**Grader puro** — `gradeQuestion(question, response): boolean` en `@nied/schema` (nuevo `src/grade.ts`, exportado por `index.ts`). Discrimina por `question.type`, valida la **forma** de la respuesta y devuelve boolean. **Defensivo:** respuesta mal formada → `false` (nunca lanza). Reglas:
- `single`: `response === correct_index`.
- `multiple`: conjunto de `response` igual al conjunto de `correct_indices` (mismo tamaño, mismos elementos).
- `numeric`: `Number.isFinite(response) && Math.abs(response - answer) <= tolerance`.
- `short`: `normalizeText(response)` ∈ `accepted.map(normalizeText)`.
- `matching`: `response.length === pairs.length && response.every((v,i)=> v === i)`.
- `ordering`: `response.length === items.length && response.every((v,i)=> v === i)`.

**`normalizeText(s)`** (helper en grade.ts, testeable): `s.normalize("NFD")` → quitar marcas diacríticas (`\p{Diacritic}`/rango combinante) → `toLowerCase()` → `trim()` → colapsar espacios internos a uno.

**Numeric:** `unit` es solo visual (se muestra junto al input); no se compara.

## 4. Cambios en la app

- **Server action** `submitQuizAnswer(courseId, unitId, questionIndex, response: QuizResponse)`: carga el quiz server-side, califica con `gradeQuestion`. Idempotencia, XP, multiplicador de racha, **todo-o-nada** y creación de card SRS **sin cambios** (la corrección sigue siendo binaria por pregunta).
- **DB:** la columna `quiz_attempts.selected_answer` (INTEGER) se reemplaza por `response` (TEXT, JSON). DB **desechable** → sin migración; se actualiza `schema.ts` y las queries (`insertQuizAttempt`, `getQuizAttempts`). Se guarda `JSON.stringify(response)`.
- **Restauración de estado previo (UI):** `getQuizAttempts` sigue devolviendo `correct` por `question_index`. La UI restaura "respondida (correcta/incorrecta)" y **revela la respuesta correcta** por tipo en modo lectura; no re-hidrata la respuesta exacta del usuario (simplicidad; YAGNI).
- **`quiz-section.tsx`:** `QuizSection` itera preguntas; `QuizQuestion` **ramifica por `type`** para renderizar el input correcto y el feedback/respuesta correcta:
  - `single`/`multiple`: botones/checkboxes (reusa el render actual; multiple = selección múltiple, valida al enviar).
  - `numeric`: input numérico + unidad opcional.
  - `short`: input de texto.
  - `matching`: lista de `left` con un dropdown por fila para elegir su `right` (rights barajados).
  - `ordering`: lista reordenable por **drag-and-drop** (pointer events, con fallback de teclado para accesibilidad).
- **Barajado sin hydration mismatch:** `matching` (rights) y `ordering` (items) se barajan con un **shuffle determinista sembrado** por el índice de pregunta (misma salida en SSR y cliente), de modo que (a) no hay mismatch de hidratación y (b) el orden mostrado no es el de autoría (no revela la respuesta). Helper `seededShuffle(array, seed)`.

## 5. Cambios en el plugin

- **`methodology` (SKILL.md):** documentar los 6 tipos, sus campos, reglas de autoría y la **exigencia de determinismo** (toda pregunta debe ser auto-corregible sin ambigüedad).
- **`course-writer`:** puede emitir los tipos nuevos cuando encajen pedagógicamente (p. ej. `numeric` para cálculos).
- **`course-auditor`:** verifica por tipo que cada pregunta sea **bien formada y autoconsistente** (numeric con `tolerance≥0`; short con `accepted` no vacío y respuestas distinguibles tras normalizar; multiple con `correct_indices` no vacío y en rango; matching ≥2 pares; ordering ≥2 ítems; índices en rango) y, adversarialmente, que **la respuesta declarada sea efectivamente correcta**.
- El **validador CLI** del schema valida `quizzes/uN.json` con la unión discriminada → estructura garantizada en build.

## 6. Arquitectura y archivos

**`@nied/schema`:**
- `src/quiz.ts` — extender `quizQuestionSchema` a unión discriminada + `preprocess` de default; tipos `QuizQuestion`, `QuizResponse`.
- `src/grade.ts` (nuevo) — `gradeQuestion`, `normalizeText`, tipos de respuesta. Puro, sin DOM/DB.
- `src/types.ts` — `courseSchema.schema_version` a `1 | 2`.
- `src/index.ts` — exportar grader y tipos.

**app:**
- `src/app/actions/quiz.ts` — firma `response`, grading vía `gradeQuestion`.
- `src/lib/db/schema.ts` + `src/lib/db/queries/quiz.ts` — columna `response` TEXT.
- `src/components/quiz-section.tsx` — render por tipo (puede dividirse en subcomponentes por tipo si crece: `quiz-inputs/*`).
- `src/lib/quiz/seeded-shuffle.ts` (nuevo) — shuffle determinista (puro, testeable).
- `src/lib/i18n/{es,en}.json` — cadenas nuevas (instrucciones por tipo, "tu respuesta", "respuesta correcta", aria del drag, etc.).

**plugin:** `skills/methodology/SKILL.md`, `agents/course-writer.md`, `agents/course-auditor.md`.

## 7. Flujo de datos

1. Autor/escritor genera `quizzes/uN.json` con preguntas tipadas → validador CLI (unión discriminada) en build.
2. App carga el quiz (server). `QuizQuestion` renderiza el input por tipo; matching/ordering barajan determinista.
3. El usuario responde → `submitQuizAnswer(..., response)` → `gradeQuestion` (server) → binario → XP/racha/SRS igual que v1 → persiste `response` JSON + `correct`.
4. Feedback inmediato (correcto/incorrecto + explicación + respuesta correcta por tipo).

## 8. Errores y casos borde

- **Respuesta mal formada** (tipo equivocado, fuera de rango): `gradeQuestion` → `false`, sin lanzar; el server action no rompe.
- **`short` ambiguo:** la normalización puede colisionar respuestas; el auditor advierte si dos `accepted` colapsan o si la pregunta admite respuestas no listadas obvias.
- **`numeric` con tolerance 0:** comparación exacta (cuidado con floats; se documenta usar tolerance para decimales).
- **Quiz v1 sin `type`:** preprocess → `single`; cero cambios en los `.json` existentes (demo intacto).
- **Hydration:** barajado determinista por semilla evita mismatch; el drag-and-drop se monta solo en cliente.
- **Accesibilidad ordering:** además del drag, mover ítems por teclado (flechas) y `aria` adecuada.

## 9. Testing

- **schema (bun):** validación de cada tipo (válidos + inválidos), default `single` por retrocompat, `schema_version` 1 y 2.
- **grade (bun):** `gradeQuestion` por tipo — multiple (igualdad de conjunto, orden irrelevante), numeric (tolerancia, no-finito), short (acentos/mayúsculas/espacios vía `normalizeText`), matching/ordering (exacto), respuestas mal formadas → false. `normalizeText` casos. `seededShuffle` (determinista, es permutación).
- **i18n:** paridad ES/EN de claves nuevas.
- **app:** smoke Playwright de al menos `multiple`, `numeric` y `ordering` (drag): responder → corrige → XP. (Requiere quizzes de prueba con esos tipos.)
- No regresar la suite existente (42 tests) ni el CI.

## 10. Riesgos y nota de decomposición

- **Mayor superficie de UI** (6 variantes + drag-drop táctil/accesible) es el principal costo; el plan debe secuenciarlo: (Fase A) schema + grader + tests puros; (Fase B) app grading + DB + un tipo de UI end-to-end; (Fase C) tipos de UI restantes (incl. drag-drop); (Fase D) plugin (methodology/writer/auditor) + quiz demo de prueba. Cada fase deja software verificable.
- **Drag-and-drop** sin librería (pointer events) requiere cuidado en móvil y accesibilidad; es el riesgo de implementación más alto — se aísla en su subcomponente.
- **Determinismo de `short`** depende de la calidad de `accepted`; se mitiga con validación del auditor, no con grading difuso.
