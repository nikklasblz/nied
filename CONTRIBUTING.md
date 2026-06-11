# Contributing to nied

## Ground rules

- **Conventional commits** (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- **Tests required** for any change in `schema/` (`cd schema && bun test`).
- **Docs in pairs**: any change to `README.md` must update `README.es.md` in the
  same commit, and vice versa.
- **Plugin changes** must pass `claude plugin validate ./plugin`.
- Code and structural docs in English. Generated course content can be any language.

## Dev setup

- Bun >= 1.3, git, Claude Code >= 2.0.
- `cd schema && bun install && bun test`
- Try the plugin locally: `claude --plugin-dir ./plugin`

## Submitting changes

1. Fork the repo (or create a branch for collaborators).
2. Keep each PR focused on **one problem or improvement**.
3. Open your PR against `main`.
4. CI must pass (schema tests + plugin validation) before review.
