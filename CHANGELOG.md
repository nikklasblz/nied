# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning: [SemVer](https://semver.org/).

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
