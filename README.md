# nied

> An open-source educational agent framework: generate complete, university-grade
> courses on any topic with Claude Code, then study them in a gamified local web app.

**Status: pre-release (v0.1 — Phase 1 in progress).** The course schema and the
generator plugin are under active development. The reader app lands in Phase 2.

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

```
/plugin marketplace add <this-repo>
/plugin install nied@nied
```

## License

MIT
