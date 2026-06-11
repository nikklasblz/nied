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
});
