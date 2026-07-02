---
name: methodology
description: nied course methodology — hard rules and unit anatomy. Use whenever creating, writing, or auditing nied course content.
user-invocable: false
---

# nied methodology

Non-negotiable rules for every course generated with nied. Commands and agents
in this plugin MUST follow them; violations are audit blockers.

## Hard rules

1. **100% free, primary sources.** MIT OCW, open textbooks, ArXiv, official docs,
   regulator websites, university lecture series on YouTube. Zero paywalled or
   pirated content. If no free equivalent exists, omit the source — never link
   paid content.
2. **Teachable inline content.** A unit is a complete lesson someone can learn
   from directly: explanations, worked examples, analogies. Links are "go deeper"
   material, never the substance. A list of links is an audit FAIL.
3. **Anti-fabrication of URLs.** Every URL must be fetched and verified to exist
   AND to contain what it claims before inclusion. If unverifiable: write the
   source name + description without a URL.
4. **Markdown is the truth.** Generated content is plain markdown + JSON conforming
   to schema v1 (`schema/`). No content lives in databases.
5. **Non-coercive gamification.** Quizzes reward XP for correct answers; nothing
   punishes or destroys progress.
6. **One unit at a time.** Never generate a whole course's content in one shot.
   Each unit gets research → writing → audit before moving on.
7. **Top-down canonical structure.** Syllabi follow the discipline's canonical
   structure (how a university would teach it), not the user's projects. Personal
   anchoring is optional flavor, added only on natural fit.

## Course preferences

SYLLABUS.md may contain a course-preferences section (`## Preferencias del
curso` / `## Course preferences`) recorded during the course-create interview:
audience, videos per unit, quiz length and emphasis, multimedia density
(diagrams, worked examples, datasets/hands-on), open-ended elements. These
preferences tune the dials of the unit anatomy below — within the bounds of
the hard rules. Hard rules always win: a preference can adjust how many videos
or quiz questions a unit has, never remove retrieval practice, inline
teaching, or source verification.

## Unit anatomy (target: 600–900 lines)

1. Frontmatter: `id`, `title`.
2. Intro: why this unit matters, what you'll be able to do (objectives restated).
3. 4–7 sections (`##`), each with: teachable explanation, at least one worked
   example or case, LaTeX (`$..$`, `$$..$$`) where math applies, Mermaid diagrams
   for processes/relations, `::video{src="..." caption="..."}` for 1–2 verified
   videos per unit.
4. **Retrieval checkpoints**: after each major section, 2–3 recall questions
   (plain text, answers hidden below or at the end).
5. Exercises: 3–5 applied tasks with increasing difficulty.
6. Capstone: one integrative mini-project tying the unit's objectives together.
7. Spaced-review guide: what to revisit in 1 day / 1 week / 1 month.
8. "Para profundizar": the verified free sources list with one-line annotations.

## Quiz anatomy (`quizzes/uN.json`, schema v2)

- 8–15 questions covering every major section (`section` field set).
- Every question has `question`, `explanation`, optional `section`, and a `type`.
  If `type` is omitted it defaults to `single` (v1 compatibility).
- All types are **deterministic and auto-gradable** (no LLM judge). Choose the
  type that fits the cognitive task; do not force everything into multiple choice.
- Wrong options must be plausible misconceptions, not jokes.
- `explanation` teaches WHY the answer is right (1–3 sentences).

Types and their fields:
- `single` — `options` (≥2, unique) + `correct_index` (0-based, `< options.length`).
- `multiple` — `options` (≥2, unique) + `correct_indices` (≥1, unique, in range). All-or-nothing.
- `numeric` — `answer` (number) + `tolerance` (≥0) + optional `unit`. Use a non-zero
  tolerance for any value with decimals or rounding.
- `short` — `accepted` (≥1 strings). Grading is case/accent/space-insensitive; list
  every acceptable surface form. Only use when the answer is a single unambiguous term.
- `matching` — `pairs` (≥2 `{left, right}`). The app shuffles the rights.
- `ordering` — `items` (≥2) written **in the correct order**. The app shuffles them.

Canonical envelope (STRICT — no extra keys anywhere; unknown keys are validation errors):

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

Rules: `unit_id` must equal the unit id in the filename; `xp_per_question` is a
positive integer; all user-facing text is in the course language; schema keys and
identifiers stay in English. Prefer a mix of types across the quiz.

## Language

The course's `language` field in `course.yaml` governs ALL generated content,
including quiz text. Code identifiers and schema keys stay in English.

## Quality bar

The reference standard is a research-grade unit of ~700 lines with verified
sources, retrieval practice, and a capstone. When in doubt, go deeper, not wider.
