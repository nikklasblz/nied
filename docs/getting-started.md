# Getting started with nied

[Versión en español](getting-started.es.md)

This guide takes you from zero to a generated course you can study in the
reader app. For the rules every course must satisfy — and why — see the
[methodology](methodology.md).

## Prerequisites

- **Claude Code >= 2.0** — runs the agent: the plugin's commands, the
  research/write/audit pipeline, everything generative.
- **bun >= 1.2** — runs the schema validator (`schema/`) and the reader app
  (`app/`).
- **git** — to clone the repo and to version your generated courses (the unit
  command commits each finished unit when the course lives in a git repo).

## Install

### From GitHub (once published)

Inside Claude Code:

```text
/plugin marketplace add nikklasblz/nied
/plugin install nied@nied
```

### From a local clone

```text
git clone https://github.com/nikklasblz/nied
```

Then, inside Claude Code:

```text
/plugin marketplace add <local-path-to-the-clone>
/plugin install nied@nied
```

### Single session, no install

From the repo root:

```text
claude --plugin-dir ./plugin
```

The commands are available for that session only.

**What the names mean:** `nied@nied` is `<plugin>@<marketplace>`. The
marketplace is named "nied" in `.claude-plugin/marketplace.json`; the plugin it
publishes is also named "nied". Commands are namespaced as `/nied:<command>`.

## Create your first course

```text
/nied:course-create "Applied statistics for data analysis" --level intro --language es --dir ./courses/my-course
```

The command interviews you, one question at a time, for anything not already
in the arguments:

- **Learning goal** — what you should be able to DO at the end.
- **Starting level** — intro, intermediate, or advanced.
- **Audience / educational level** — who the course is for (school student,
  undergrad, postgrad, working professional, self-taught hobbyist...), beyond
  the three schema levels.
- **Audiovisual material and educational elements** — videos per unit
  (default 1–2 verified), emphasis on diagrams, worked examples,
  datasets/hands-on exercises, capstone style.
- **Assessments and their types** — quiz length per unit (default 8–15
  auto-graded multiple-choice — what the reader app grades) and emphasis
  (conceptual recall vs applied scenarios), plus optional open-ended elements
  (exercises with rubrics, capstone projects) rendered as unit sections.
- **Hours per week** — sets the pacing of the units.
- **Content language** — defaults to the language you are writing in.

It then researches the canonical university-level structure of the domain and
generates:

- `course.yaml` — the machine-readable syllabus (schema v1).
- `SYLLABUS.md` — the human-readable syllabus: per-unit objectives, verified
  sources, a Mermaid dependency map, weekly pacing for your hours, and a
  "Course preferences" section recording your audience, multimedia and
  assessment answers — unit generation (writer and auditor) reads and honors
  it.
- `units/` and `quizzes/` — empty directories.

No unit content is generated at this point. This is by design — hard rule 6 of
the [methodology](methodology.md): units are generated one at a time, each
with its own research, writing, and blocking audit, never a whole course in
one shot.

## Generate units one at a time

```text
/nied:course-unit u1 --dir ./courses/my-course
```

Each unit runs a three-stage pipeline:

1. **Research** — a network-enabled agent finds free primary sources and
   fetches every URL to verify it before reporting it.
2. **Write** — a file-only agent (no network access, so it cannot fabricate
   URLs) writes `units/u1.md` and `quizzes/u1.json` from the verified list.
3. **Audit** — an adversarial agent checks schema, URL liveness, and six
   pedagogical dimensions. A FAIL sends blockers back to the writer.

What to expect, honestly:

- **10–20 minutes per unit** is normal.
- **A few hundred thousand tokens per unit**, including research and audit.
  Depth is the point; this is not a cheap operation.
- The auditor may force **up to 3 revision cycles**. If the unit still fails
  after three, the pipeline stops and presents the remaining blockers to you.
- If research finds **gaps** (no verified free source for a core objective),
  they are surfaced for your decision — accept fewer sources or adjust the
  objective — never papered over.

Repeat for u2, u3, ... following the dependency order in the syllabus.

## Audit a course

```text
/nied:course-audit ./courses/my-course
```

A read-only quality gate: it validates the schema, re-checks every URL, and
audits each written unit in parallel, then presents one consolidated table
(verdict, schema errors, dead URLs, lowest rubric dimension, blockers per
unit). It never fixes anything — failing units are revised with
`/nied:course-unit <id>`.

Use it before sharing or publishing a course. Final audits run the validator
without the incremental `--allow-missing-units` flag, so every unit declared
in the syllabus must actually exist.

## Study with the reader app

From the repo root:

```text
bun install
cd app && bun run dev
```

Open http://localhost:3000.

| Env var | Default | What it does |
|---|---|---|
| `NIED_COURSES_ROOT` | `../courses` | Directory the app scans for courses |
| `NIED_UI_LANGUAGE` | `es` | UI language: `es` or `en` |
| `NIED_DB_PATH` | — | Path of the progress SQLite file |
| `NIED_INSTANCE_NAME` | — | Branding name shown in the app |
| `NIED_XP_PER_HOUR` | `25` | XP awarded per estimated study hour |

Progress (XP, streaks, spaced-repetition state) lives in a disposable local
SQLite file; delete it and your courses are intact — markdown is the truth,
and the app never modifies course files. Quizzes award XP and seed
spaced-repetition cards (5-box Leitner) that come due at `/review`.

## Course structure on disk

Schema v1, using the demo course as the example:

```text
courses/estadistica-aplicada/
├── course.yaml        # machine-readable syllabus: slug, title, language, level, units[]
├── SYLLABUS.md        # human-readable syllabus: objectives, sources, dependency map, pacing
├── units/
│   └── u1.md          # one complete teachable unit (frontmatter + 600–900 lines)
└── quizzes/
    └── u1.json        # auto-graded quiz for u1 (strict JSON, 8–15 questions)
```

For programmatic validation, the JSON Schema lives at
[`schema/json/course.schema.json`](../schema/json/course.schema.json), and the
full validator runs from `schema/`:

```text
bun run validate <course-dir>
```

## Troubleshooting

- **Validator reports units "not written yet".** Expected in the middle of a
  build — units are generated one at a time. Use
  `bun run validate <dir> --allow-missing-units` for incremental checks; the
  plugin commands already pass this flag automatically. Only a final audit
  runs without it.
- **`better-sqlite3` fails with a NODE_MODULE_VERSION error.** The native
  module was compiled against a different Node/Bun ABI. Run
  `npm rebuild better-sqlite3` inside `app/`, or reinstall dependencies with
  the same runtime you use to start the app.
- **Reader app shows stale content or odd build errors.** Turbopack's cache
  can go stale. Run `bun run dev:clean` in `app/` to delete `.next/` and
  restart the dev server.
