# nied methodology

[Versión en español](methodology.es.md)

This document is the pedagogical contract of nied. Every course the framework
generates — regardless of topic, language, or level — must satisfy the rules
described here. The plugin's commands and agents enforce them mechanically: a
violation is not a style issue, it is an audit blocker that stops the pipeline.
If you want to know *why* a nied course looks the way it does, this is the
explanation.

## The 7 hard rules

### 1. 100% free, primary sources

Every source in a nied course is free to access: official documentation, open
courseware (MIT OCW and similar), open-access papers (ArXiv, PubMed), regulator
and standards-body websites, open textbooks, university lectures on YouTube.
Zero paywalled or pirated content. The reason is reproducibility and equal
access: a course whose sources you cannot afford to open is not a course, it is
a bibliography of locked doors. If no free equivalent of a canonical source
exists, the source is omitted and the gap is reported — never papered over with
a paid link.

### 2. Teachable inline content

A unit is a complete lesson someone can learn from directly: explanations,
worked examples, analogies, diagrams. Links are "go deeper" material, never the
substance. This is a defense against link rot: external resources die, move, or
change, and a course that is merely an index of URLs dies with them. The unit
IS the lesson; links add depth. A unit that is a list of links is an automatic
audit FAIL.

### 3. Anti-fabrication of URLs

Every URL in a course was fetched and verified — both that it resolves and that
its content actually covers what the course claims — before being included. If
a source cannot be verified, it is named and described without a URL. Language
models can invent plausible-looking links; a framework that ships hallucinated
references has nothing to offer a learner. Trust is the product.

### 4. Markdown is the truth

Generated content is plain markdown plus JSON conforming to a versioned schema.
No course content lives in a database. The reader app only reads; it never
modifies course files. Learner progress (XP, streaks, spaced-repetition state)
lives in a local SQLite file that is explicitly disposable: delete it and the
course is intact. Plain files are diffable, versionable, portable, and
inspectable with any text editor — properties a learning corpus should never
trade away.

### 5. Non-coercive gamification

Quizzes reward XP for correct answers; daily activity builds a streak that
multiplies XP gains. Crucially, nothing punishes: breaking a streak resets the
multiplier, never the progress already earned. Gamification in nied exists to
make consistency feel good, not to make absence feel bad. Loss-aversion
mechanics produce anxiety, not learning.

### 6. One unit at a time

A course's content is never generated in one shot. Each unit gets its own full
cycle — research, then writing, then a blocking audit — before the next unit
begins. Batch generation optimizes for volume and amortizes errors across the
whole course; per-unit quality gates catch problems while they are still cheap
to fix. Depth beats throughput.

### 7. Top-down canonical structure

Syllabi follow the canonical structure of the discipline — how a university
department would sequence it — not the user's current projects or hobbies. A
curriculum organized around what you already do tends to reinforce what you
already know. Personal anchoring (examples drawn from the learner's own
context) is welcome as optional flavor, added only where it fits naturally.

## Learning science grounding

The unit anatomy is not arbitrary; it implements three well-replicated findings
from cognitive science. Following our own anti-fabrication rule, we cite
author, year, and concept without URLs.

- **Retrieval practice.** Actively recalling information strengthens memory far
  more than re-reading it — the testing effect (Roediger & Karpicke, 2006).
  This is why every major section ends in a retrieval checkpoint and every unit
  ships an auto-graded quiz: the questions are part of the teaching, not just
  the measurement.
- **Spaced repetition.** Reviews distributed over time produce more durable
  learning than massed study — the spacing effect (Cepeda et al., 2006). Each
  unit includes a spaced-review guide (1 day / 1 week / 1 month), and the
  reader app implements a classic 5-box Leitner system: a card in box N comes
  due after 1, 2, 4, 8, or 16 days; a correct answer promotes it, a miss
  returns it to box 1.
- **Immediate feedback that teaches.** Every quiz answer comes with an
  explanation of *why* the correct option is correct. Feedback delivered at the
  moment of retrieval corrects misconceptions before they consolidate; a bare
  "wrong" teaches nothing.

## Unit anatomy

Every unit (target 600–900 lines) has eight parts, each with a job:

1. **Frontmatter** (`id`, `title`) — machine-readable identity, validated
   against the syllabus.
2. **Intro and objectives** — why this unit matters and what the learner will
   be able to do, so effort has a visible target.
3. **Route map** — a table of the unit's sections with estimated hours and
   internal prerequisites, so the learner can plan the unit.
4. **4–7 teachable sections** — the substance: inline explanations, at least
   one worked example or case each, LaTeX where math applies, Mermaid diagrams
   for processes and relations, and 1–2 verified embedded videos per unit.
5. **Retrieval checkpoints** — 2–3 recall questions after each major section,
   exploiting the testing effect while the material is fresh.
6. **Exercises and capstone** — 3–5 applied tasks of increasing difficulty,
   plus one integrative mini-project that ties the unit's objectives together.
7. **Spaced-review guide** — what to revisit in 1 day / 1 week / 1 month,
   making the spacing effect actionable on paper, not just in the app.
8. **Annotated sources** ("Para profundizar") — the verified free source list,
   each with a one-line note on what it contributes.

## The quiz contract

Quizzes are strict JSON conforming to schema v2 — no extra keys anywhere;
unknown keys are validation errors. The canonical envelope:

```json
{
  "unit_id": "u1",
  "title": "Quiz: <unit title>",
  "instructions": "<how to take it>",
  "xp_per_question": 10,
  "questions": [
    {
      "type": "single",
      "question": "<text>",
      "options": ["<a>", "<b>", "<c>"],
      "correct_index": 1,
      "explanation": "<why>",
      "section": "<## section name>"
    }
  ]
}
```

Every question has `question`, `explanation`, an optional `section`, and a
`type`. A question without a `type` is treated as `single` (v1 compatibility).
All six types are **deterministic and auto-gradable** — no LLM judge:

- `single` — `options` (≥2, unique) + `correct_index` (0-based, less than the
  options length).
- `multiple` — `options` (≥2, unique) + `correct_indices` (≥1, unique, in
  range). Graded all-or-nothing.
- `numeric` — `answer` (number) + `tolerance` (≥0) + optional `unit`. Any value
  with decimals or rounding gets a non-zero tolerance.
- `short` — `accepted` (≥1 strings). Grading is case/accent/space-insensitive;
  list every acceptable surface form. Only for a single unambiguous term.
- `matching` — `pairs` (≥2 `{left, right}`). The app shuffles the rights.
- `ordering` — `items` (≥2) written **in the correct order**. The app shuffles
  them for the learner.

Rules:

- `unit_id` must equal the unit id in the filename (`quizzes/u1.json` → `"u1"`).
- `xp_per_question` is a positive integer.
- 8–15 questions covering every major section (the `section` field says which).
- Prefer a mix of types: the type should fit the cognitive task, not force
  everything into multiple choice.
- Wrong options must be plausible misconceptions, not jokes — a good distractor
  diagnoses a specific misunderstanding.
- `explanation` teaches WHY the answer is right, in 1–3 sentences.

## The audit rubric

Every unit passes a blocking audit before it counts as done. Two hard gates run
first: **schema validation** (the JSON/markdown must validate against the
course schema) and **URL liveness** (every URL is re-fetched; a dead or content-mismatched
URL fails the unit). Then six pedagogical dimensions are scored 1–5, and any
dimension scoring 2 or below blocks the unit:

| Dimension | What it measures |
|---|---|
| depth | University-grade treatment reaching apply/analyze on Bloom's taxonomy, not blog-post recall |
| inline-teaching | The substance is in the text; links are supplementary |
| objective-coverage | Every syllabus objective is addressed in a section |
| retrieval-practice | Checkpoints present after major sections |
| assessment | Quiz covers all major sections with teaching explanations |
| language-consistency | All content in the course's declared language |

The auditor also flags padding — filler text, repeated paragraphs, sections
that restate without teaching — and must cite section names and line evidence
in every blocker, so the revision loop has something concrete to act on.

## Why an agent pipeline

Unit generation is split across three specialized agents, and the split is a
separation of powers, not an implementation detail:

- **course-researcher** has network tools and one job: find and *verify* free
  primary sources, fetching every URL before reporting it.
- **course-writer** has file tools only — it literally has no network access,
  so it *cannot* fabricate a working-looking URL even if it wanted to. It may
  only use URLs from the researcher's verified list; anything else is named
  without a link.
- **course-auditor** is adversarial by instruction: its job is to find reasons
  the unit is NOT ready, not to rubber-stamp it.

The write–audit loop caps at 3 revisions. If a unit still fails after three
cycles, the pipeline stops and presents the remaining blockers to a human
rather than converging on mediocrity. The architecture assumes any single
agent can fail, and makes the failure modes structurally impossible or loudly
visible instead of trusting good intentions.
