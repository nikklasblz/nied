# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning: [SemVer](https://semver.org/).

## [0.2.0] — 2026-07-01

### Added
- **Quiz schema v2** (`schema/`): five new auto-gradable question types —
  `multiple` (all-or-nothing), `numeric` (tolerance + optional unit), `short`
  (case/accent/space-insensitive), `matching` and `ordering` — modeled as a
  discriminated union, fully backward-compatible with v1 single-choice quizzes
  (`type` defaults to `single`); pure shared grader (`gradeQuestion`) exported
  from the package.
- **Per-type quiz UI** (`app/`): one focused input per question type —
  checkboxes, numeric field, free-text, shuffled-dropdown matching, and
  drag-and-drop + keyboard ordering — with deterministic seeded shuffles
  (no hydration mismatch).
- **Reading pacer** (`app/`): word/sentence pacing over lesson prose with
  play/pause, seek buttons, scrubber, click-to-seek and keyboard shortcuts,
  plus a real "Reading" settings section; skips math, tables and code.
- Demo course: u2 quiz extended to exercise all six question types.

### Changed
- `quiz_attempts` stores the learner's full JSON `response` instead of a
  single `selected_answer` (local DB is disposable; it recreates on demand).
- Spaced-repetition review reveals the correct answer per question type.
- Plugin methodology, writer and auditor document, emit and verify the schema
  v2 question types.
- User-generated courses stay local; only the demo course ships in the repo.

### Fixed
- YouTube `watch` URLs are converted to `/embed/` so lesson videos play.

## [0.1.0] — 2026-06-11

First public release.

### Added
- **Course schema v1** (`schema/`): zod validators for `course.yaml`, `units/uN.md`
  (frontmatter + `::video` directives) and `quizzes/uN.json`; dependency-graph
  checks (duplicates, missing deps, cycles); CLI with incremental mode
  (`--allow-missing-units`); JSON Schema export.
- **Claude Code plugin** (`plugin/`): `/nied:course-create`, `/nied:course-unit`
  (research → write → audit loop), `/nied:course-audit`; subagents
  course-researcher (URL verification), course-writer, course-auditor
  (blocking 6-dimension rubric); methodology skill with the 7 hard rules.
- **Reader app** (`app/`): Next.js 16 gamified local reader — XP/levels/streaks/
  achievements, auto-graded quizzes (server-side grading), capsular lessons with
  KaTeX/Mermaid/video embeds, Leitner spaced-repetition review, ES/EN UI.
- **Demo course**: applied statistics (Spanish), units generated end-to-end by
  the framework itself with verified free sources.
- **Course preferences**: the `/nied:course-create` interview captures
  audience/educational level, audiovisual material and assessment-type
  preferences; recorded in SYLLABUS.md and honored by the writer and auditor.
