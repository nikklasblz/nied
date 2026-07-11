# CLAUDE.md — nied

Quick context for Claude Code sessions in this repo.

## What this is

Open-source educational agent framework (`github.com/nikklasblz/nied`):
generate university-grade courses with Claude Code, study them in a gamified
local reader app. Three packages:

- `schema/` — course schema (Zod v4), validation CLI, JSON Schema export.
- `plugin/` — Claude Code plugin: `/nied:course-create`, `/nied:course-unit`
  (research → write → audit loop), `/nied:course-audit`; agents
  course-researcher / course-writer / course-auditor; methodology skill.
- `app/` — Next.js 16 gamified reader: XP/levels/streaks, auto-graded quizzes,
  Leitner spaced repetition, reading pacer, ES/EN UI.
- `courses/estadistica-aplicada` — demo course (u1-u3 written, u4-u12 declared).

## Hard rules

- Free primary sources only; the writer agent must never fabricate URLs (it has
  no network tools by design — only the researcher verifies URLs).
- Quizzes are deterministic and auto-gradable — no LLM judge. Schema v2 types:
  `single` (default), `multiple`, `numeric`, `short`, `matching`, `ordering`.
- Markdown/JSON on disk is the source of truth; SQLite only stores progress.
- UI strings via i18n (`app/src/lib/i18n/{es,en}.json` — keep key parity).
- Public docs ship in EN/ES pairs (`docs/X.md` + `docs/X.es.md`, both READMEs);
  CI blocks PRs that change one without the other.
- Icons: lucide-react re-exported from `app/src/components/icons.tsx`. No emojis.

## Commands

```bash
# schema package
cd schema && bun test && bunx tsc --noEmit
cd schema && bun run validate ../courses/estadistica-aplicada --allow-missing-units
cd schema && bun run gen:jsonschema        # regenerate json/ after schema changes

# app
cd app && bun test src/lib/__test__ && bunx tsc --noEmit
cd app && bun run dev                      # localhost:3000
cd app && bun run build                    # CI runs this with NIED_COURSES_ROOT=<repo>/courses
```

## CI gotchas (all bit us at least once)

- CI typechecks **both** `app/` and `schema/` — run `bunx tsc --noEmit` in both
  before pushing. Schema test fixtures must use `satisfies QuizQuestion`, not
  `as const` (readonly arrays don't assign to Zod's mutable inferred types).
- CI diffs `schema/json/` against a fresh `gen:jsonschema` run — regenerate and
  commit whenever `schema/src/` changes shape.
- `better-sqlite3` has no Bun native binding: DB smoke tests run via tsx/Node.
- Local DB files (`app/db/*.db*`) are disposable — delete to reset; schema
  recreates on first request. No migrations.

## Conventions

- Code and identifiers in English; demo-course content in Spanish.
- Conventional commits, one concern per commit; commit after each plan task.
- Feature work on a branch; plans/specs live in `docs/superpowers/{plans,specs}/`.
- Releases: update `CHANGELOG.md` (Keep a Changelog), tag `vX.Y.Z`, then
  `gh release create` with the changelog section as notes. Wait for CI green
  on main before tagging.
