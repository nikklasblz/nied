---
description: Audit a nied course — schema validation, live-URL checks, pedagogical rubric per unit
argument-hint: "[<course-path>] [--units u1,u3]"
---

Audit the nied course at: **$ARGUMENTS** (default: the only `course.yaml` under
`./courses/`, or ask).

Load the `nied:methodology` skill first.

## 1. Schema validation

Locate the schema validator, in order: (1) `schema/` in the repo this plugin
was loaded from (`${CLAUDE_PLUGIN_ROOT}/../schema` when running from a clone of
the nied repo), (2) `schema/` in the user's current project. If found and `bun`
is installed, run from that directory:
`bun run validate <course-dir> --allow-missing-units` (incremental builds) —
must exit 0 — and capture the full output. For a final/release audit, run
without the flag. Schema errors are blockers regardless of anything else. If
the validator or `bun` is unavailable, do NOT fail: perform a manual structural
check against the methodology's schema summary and report
`schema_errors: not-run`, telling the user to install bun / clone the repo for
full validation.

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
