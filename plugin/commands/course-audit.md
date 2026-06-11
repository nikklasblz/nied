---
description: Audit a nied course — schema validation, live-URL checks, pedagogical rubric per unit
argument-hint: "[<course-path>] [--units u1,u3]"
---

Audit the nied course at: **$ARGUMENTS** (default: the only `course.yaml` under
`./courses/`, or ask).

Load the `nied:methodology` skill first.

## 1. Schema validation

From the schema package directory run `bun run validate <course-dir>` and
capture the full output. Schema errors are blockers regardless of anything else.

## 2. Per-unit audit

For each written unit (or only `--units` if given), dispatch one
`nied:course-auditor` agent. Dispatch them in parallel when there are 2+ units.

## 3. Consolidated report

Present a single table:

| Unit | Verdict | Schema | Dead URLs | Lowest rubric dimension | Blockers |
|------|---------|--------|-----------|------------------------|----------|

Then:
- **Course verdict: PASS** only if every audited unit PASSes and schema errors = 0.
- List every blocker grouped by unit, each specific and actionable.
- List warnings (missing quizzes, placeholder videos) separately as non-blocking.

Do NOT fix anything in this command — it is a read-only gate. Offer
`/nied:course-unit <id>` for revision of failing units.
