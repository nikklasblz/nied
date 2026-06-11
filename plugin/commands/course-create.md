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

## 3. Generate artifacts

Write into the target directory:

1. `course.yaml` — conforming to schema v1: `schema_version: 1`, kebab-case
   `slug`, `title`, `language`, `level`, `description`, and `units[]` where each
   unit has `id` (u1, u2, ...), `title`, `objectives` (2–5 measurable, verb-first),
   `hours`, `depends_on`.
2. `SYLLABUS.md` — human-readable syllabus: course overview, per-unit section
   (objectives, key concepts, the verified canonical sources from research),
   dependency map (Mermaid), suggested weekly pacing for the user's hours/week.
3. Empty `units/` and `quizzes/` directories (units are generated later,
   one by one, via /nied:course-unit — hard rule 6).

## 4. Validate and finish

If this repo's schema validator is available (`schema/` exists in the plugin's
repo or the user's project), run:
`bun run validate <target-dir>` from the schema package directory and fix any
errors before finishing.

Report: course location, unit list, and the next command to run
(`/nied:course-unit u1 --dir <target-dir>`).
