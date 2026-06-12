---
description: Create a new nied course — interview, top-down domain research, course.yaml + SYLLABUS.md
argument-hint: "<topic> [--level intro|intermediate|advanced] [--language <code>] [--dir <path>]"
---

Create a new nied course on: **$ARGUMENTS**

Load the `nied:methodology` skill rules first. Then:

## 1. Interview (one question at a time)

Ask only what was not provided in the arguments:
- Learning goal: what should the learner be able to DO at the end?
- Starting level (maps to `level`: intro / intermediate / advanced).
- Audience / educational level: who is this course for, beyond the schema's
  three levels — e.g. school student, university undergrad, postgrad, working
  professional, self-taught hobbyist. Map the answer to the closest schema
  `level` (which is what course.yaml stores) AND record the answer verbatim as
  the course's audience (it lives in SYLLABUS.md, not in course.yaml — the
  schema is strict and takes no extra keys).
- Audiovisual material and educational elements: how many verified videos per
  unit (default: 1–2, per the methodology's unit anatomy; options: none, or
  more), and how much emphasis on diagrams (Mermaid), worked-example density,
  datasets / hands-on exercises, and capstone style. Defaults are the
  methodology's unit anatomy; this question lets the user dial each element up
  or down within the hard rules.
- Assessments and their types: quiz length per unit (default: 8–15 auto-graded
  multiple-choice questions — the only auto-graded type in schema v1), the
  quiz's emphasis (conceptual recall vs applied scenarios), and whether to
  include open-ended elements (exercises with rubrics, capstone projects).
  Be explicit with the user: multiple-choice quizzes are what the reader app
  auto-grades; any other assessment type lives as exercise/capstone sections
  inside the unit (manual / honor-system, rendered as unit sections).
- Hours per week available (sets unit pacing).
- Content language (`language`, default: the language the user is writing in).
- Target directory (default: `./courses/<slug>` relative to current directory).

## 2. Top-down domain research

Dispatch the `nied:course-researcher` agent with this brief: "Identify the
canonical structure of <topic> as taught at university level: standard
curriculum sequence, 8–12 major topic blocks, the consensus textbooks/courses
(free/open only) that define the field's pedagogy. Verify sources."

Build the unit sequence from the DISCIPLINE's canonical order, not from the
user's personal projects (hard rule 7).

If research returns no verified canonical sources for the topic, stop and
present the gaps to the user before generating course.yaml.

## 3. Generate artifacts

Write into the target directory:

1. `course.yaml` — conforming to schema v1 (strict schema — no additional
   keys): `schema_version: 1`, kebab-case `slug`, `title`, `language`, `level`,
   `description`, and `units[]` where each unit has `id` (u1, u2, ...), `title`,
   `objectives` (2–5 measurable, verb-first), `hours`, `depends_on`.
2. `SYLLABUS.md` — human-readable syllabus: course overview, per-unit section
   (objectives, key concepts, the verified canonical sources from research),
   dependency map (Mermaid), suggested weekly pacing for the user's hours/week,
   and a `## Preferencias del curso` section (heading `## Course preferences`
   when the course language is English) recording the interview answers:
   audiencia (verbatim), videos por unidad, énfasis multimedia (diagramas,
   ejemplos resueltos, datasets/ejercicios prácticos, estilo de capstone),
   longitud y énfasis del quiz, y elementos abiertos (ejercicios con rúbrica,
   capstone). Downstream agents (writer/auditor) read SYLLABUS.md and MUST
   honor this section.
3. `units/` and `quizzes/` directories, each containing a `.gitkeep` file
   (`units/.gitkeep`, `quizzes/.gitkeep`) so git preserves them (units are
   generated later, one by one, via /nied:course-unit — hard rule 6).

## 4. Validate and finish

Locate the schema validator, in order: (1) `schema/` in the repo this plugin
was loaded from (`${CLAUDE_PLUGIN_ROOT}/../schema` when running from a clone of
the nied repo), (2) `schema/` in the user's current project. If found and `bun`
is installed, run from that directory:
`bun run validate <target-dir> --allow-missing-units` (incremental builds) —
must exit 0; fix any errors before finishing. For a final/release audit, run
without the flag. If the validator or `bun` is unavailable, do NOT fail:
perform a manual structural check against the methodology's schema summary and
report `schema_errors: not-run`, telling the user to install bun / clone the
repo for full validation.

Report: course location, unit list, and the next command to run
(`/nied:course-unit u1 --dir <target-dir>`).
