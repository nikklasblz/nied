# nied

> An open-source educational agent framework: generate complete, university-grade
> courses on any topic with Claude Code, then study them in a gamified local web app.

**Status: Phase 1 (schema + plugin) and Phase 2 (reader app) shipped.
Phase 3 (public demo + release) is next.**

[Versión en español](README.es.md)

## What it does

- `/nied:course-create "topic"` — interviews you, researches the domain top-down,
  and generates a full syllabus (`course.yaml` + `SYLLABUS.md`).
- `/nied:course-unit u3` — researches **verified, 100% free primary sources** and
  writes a complete teachable unit: inline explanations, LaTeX, Mermaid diagrams,
  embedded videos, auto-graded quizzes, retrieval practice, and a capstone.
- `/nied:course-audit` — blocking QA: schema validation, live-URL checks, and a
  pedagogical rubric (university-level depth, Bloom alignment).

## Methodology (the hard rules)

1. 100% free, primary sources — zero paywalled content.
2. Teachable inline content — the syllabus is an index; the unit is the heart.
3. Anti-fabrication: every URL is fetched and verified before inclusion.
4. Markdown is the truth — apps only read; progress lives elsewhere.
5. Non-coercive gamification.
6. Units are generated one at a time, never a whole course in one shot.
7. Top-down canonical domain structure; personal project anchoring is optional.

## Install (development)

From a local clone of this repo, inside Claude Code:

```text
/plugin marketplace add <local-path-to-this-clone>   # registers the "nied" marketplace (name comes from .claude-plugin/marketplace.json)
/plugin install nied@nied                            # installs the "nied" plugin from the "nied" marketplace
```

Or load the plugin directly for a single session:

```text
claude --plugin-dir ./plugin
```

See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## Reader app

A gamified local web app to study your generated courses: XP, streaks,
achievements, auto-graded quizzes, and spaced-repetition review (Leitner).

```text
bun install
cd app && bun run dev
```

Open http://localhost:3000. Configuration via env vars: `NIED_COURSES_ROOT`
(default `../courses`), `NIED_UI_LANGUAGE` (`es` | `en`), `NIED_DB_PATH`,
`NIED_INSTANCE_NAME`, `NIED_XP_PER_HOUR` (default `25`).

Progress lives in a local SQLite file; the app never modifies course content.
The progress database is disposable — markdown is the truth.

## License

MIT
