# Security Policy

## Supported versions

Pre-1.0: only the latest minor release receives fixes.

## Reporting a vulnerability

Open a private report via GitHub Security Advisories
("Report a vulnerability" on the repo). Do not open public issues for
exploitable problems. Expected response: within 7 days.

## Scope notes

- The reader app is a **local** single-user app; it binds to localhost and has
  no auth by design. Do not expose it to untrusted networks.
- Course content is rendered from local markdown with `rehype-raw` enabled —
  only study courses from sources you trust.
