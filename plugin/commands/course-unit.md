---
description: Generate one complete nied course unit — research with verified sources, write, audit, iterate until PASS
argument-hint: "<unit-id> [--dir <course-path>]"
---

Generate the unit **$ARGUMENTS** of a nied course.

Load the `nied:methodology` skill rules first.

## 0. Locate and read context

- Resolve the course directory (`--dir`, or the only `course.yaml` under
  `./courses/`, or ask).
- Read `course.yaml` and `SYLLABUS.md`. Extract this unit's title, objectives,
  hours, and `depends_on`. Read the last ~50 lines of each dependency unit's
  `units/<dep>.md` (if written) so the new unit builds on, and does not repeat,
  prior material.
- If the unit file already exists, STOP and ask whether to overwrite or revise.

## 1. Research

Dispatch `nied:course-researcher` with the unit's title, objectives, level, and
language. Wait for the verified source list. If it reports gaps on a core
objective, surface them to the user before writing (they may accept fewer
sources or adjust the objective).

## 2. Write

Dispatch `nied:course-writer` with: course directory, unit id, the syllabus
entry, and the FULL verified source list. It writes `units/<id>.md` and
`quizzes/<id>.json`.

## 3. Audit (blocking)

Dispatch `nied:course-auditor` on the unit. Then:

- **PASS** -> continue to step 4.
- **FAIL** -> send the blockers back to `nied:course-writer` for revision and
  re-audit. Each revision dispatch to `nied:course-writer` must include: the
  course directory, unit id, the syllabus entry, the FULL verified source list,
  and the auditor's blockers (subagents are stateless). Maximum 3 write-audit
  cycles; if still FAIL, stop and present the remaining blockers to the user
  with your recommendation.

## 4. Validate schema and commit

Locate the schema validator, in order: (1) `schema/` in the repo this plugin
was loaded from (`${CLAUDE_PLUGIN_ROOT}/../schema` when running from a clone of
the nied repo), (2) `schema/` in the user's current project. If found and `bun`
is installed, run from that directory:
`bun run validate <course-dir> --allow-missing-units` (incremental builds) —
must exit 0. For a final/release audit, run without the flag. If the validator
or `bun` is unavailable, do NOT fail: perform a manual structural check against
the methodology's schema summary and report `schema_errors: not-run`, telling
the user to install bun / clone the repo for full validation.

If the course directory is inside a git repo, commit:
`content(<course-slug>): <unit-id> — <unit title>`

Report: audit rubric scores, source count, file paths, and the next unit id.
