import { describe, expect, test } from "bun:test";
import { validateUnitMarkdown } from "../src/unit";

const expected = { id: "u1", title: "Datos y variables" };

const good = `---
id: u1
title: Datos y variables
---

## Sección 1

Texto enseñable con $x^2$.

::video{src="https://www.youtube.com/watch?v=abc123" caption="Intro"}

\`\`\`mermaid
graph TD; A-->B;
\`\`\`
`;

describe("validateUnitMarkdown", () => {
  test("valid unit has no errors", () => {
    const issues = validateUnitMarkdown(good, expected, "units/u1.md");
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  test("missing frontmatter -> error", () => {
    const issues = validateUnitMarkdown("## Hola\n", expected, "units/u1.md");
    expect(issues.some((i) => i.severity === "error")).toBe(true);
  });

  test("frontmatter id mismatch -> error", () => {
    const bad = good.replace("id: u1", "id: u2");
    const issues = validateUnitMarkdown(bad, expected, "units/u1.md");
    expect(issues.some((i) => i.message.includes("id"))).toBe(true);
  });

  test("video without src attribute -> error", () => {
    const bad = good.replace(
      `::video{src="https://www.youtube.com/watch?v=abc123" caption="Intro"}`,
      `::video{caption="Intro"}`
    );
    const issues = validateUnitMarkdown(bad, expected, "units/u1.md");
    expect(
      issues.some((i) => i.severity === "error" && i.message.includes("src"))
    ).toBe(true);
  });

  test("video with empty src -> warning, not error", () => {
    const placeholder = good.replace(
      `src="https://www.youtube.com/watch?v=abc123"`,
      `src=""`
    );
    const issues = validateUnitMarkdown(placeholder, expected, "units/u1.md");
    expect(issues.some((i) => i.severity === "warning")).toBe(true);
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  test("video without caption -> warning", () => {
    const noCap = good.replace(` caption="Intro"`, "");
    const issues = validateUnitMarkdown(noCap, expected, "units/u1.md");
    expect(
      issues.some((i) => i.severity === "warning" && i.message.includes("caption"))
    ).toBe(true);
  });

  test("frontmatter title mismatch -> warning, not error", () => {
    const t = good.replace("title: Datos y variables", "title: Otra cosa");
    const issues = validateUnitMarkdown(t, expected, "units/u1.md");
    expect(issues.some((i) => i.severity === "warning" && i.message.includes("title"))).toBe(true);
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  // ── Fenced code blocks ───────────────────────────────────────────────────
  test("::video example inside fenced block is not validated (no false-positive issues)", () => {
    // The fenced ::video has empty src (normally a warning) — must be suppressed.
    // The real directive outside the fence has valid src+caption — must stay clean.
    const withFence = [
      "---",
      "id: u1",
      "title: Datos y variables",
      "---",
      "",
      "Usage example:",
      "",
      "```md",
      '::video{src="" caption="Example"}',
      "```",
      "",
      '::video{src="https://real.example.com/v" caption="Real video"}',
      "",
    ].join("\n");
    const issues = validateUnitMarkdown(withFence, expected, "units/u1.md");
    expect(issues).toEqual([]);
  });

  // ── Single-quoted attributes ─────────────────────────────────────────────
  test("::video with single-quoted attributes → no issues", () => {
    const singleQuoted = [
      "---",
      "id: u1",
      "title: Datos y variables",
      "---",
      "",
      "::video{src='https://x' caption='Intro'}",
      "",
    ].join("\n");
    const issues = validateUnitMarkdown(singleQuoted, expected, "units/u1.md");
    expect(issues).toEqual([]);
  });

  // ── YAML parse-failure branch ────────────────────────────────────────────
  test("invalid YAML frontmatter → exactly one error with correct message", () => {
    // gray-matter (js-yaml) throws on unclosed flow sequences; the catch
    // must return exactly one structured error and nothing else.
    const issues = validateUnitMarkdown(
      "---\nid: [unclosed\n---\nbody\n",
      expected,
      "units/u1.md"
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual({
      file: "units/u1.md",
      severity: "error",
      message: "invalid frontmatter (YAML parse failed)",
    });
  });

  // ── CRLF line endings ────────────────────────────────────────────────────
  test("CRLF line endings in good fixture → no errors, no warnings", () => {
    const crlf = good.replace(/\n/g, "\r\n");
    const issues = validateUnitMarkdown(crlf, expected, "units/u1.md");
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(issues.filter((i) => i.severity === "warning")).toEqual([]);
  });
});
