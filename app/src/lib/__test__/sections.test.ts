import { describe, expect, test } from "bun:test";
import { splitMarkdownSections } from "../content/sections";

const md = `Intro del documento.

## 1. Primera sección

Texto uno.

\`\`\`js
## esto NO es heading (está en fence)
\`\`\`

## Segunda — con guión

Texto dos.

### Subsección (no corta)

Más texto dos.
`;

describe("splitMarkdownSections", () => {
  test("splits by ## headings outside fences", () => {
    const r = splitMarkdownSections(md);
    expect(r.sections.length).toBe(2);
    expect(r.sections[0]!.title).toBe("1. Primera sección");
    expect(r.sections[1]!.title).toBe("Segunda — con guión");
    expect(r.sections[0]!.index).toBe(1);
    expect(r.preamble).toContain("Intro del documento");
  });

  test("fenced fake heading stays inside section 1", () => {
    const r = splitMarkdownSections(md);
    expect(r.sections[0]!.markdown).toContain("esto NO es heading");
  });

  test("### does not split", () => {
    const r = splitMarkdownSections(md);
    expect(r.sections[1]!.markdown).toContain("Subsección");
  });

  test("no headings -> all preamble", () => {
    const r = splitMarkdownSections("solo texto\nsin headings");
    expect(r.sections).toEqual([]);
    expect(r.preamble).toContain("solo texto");
  });

  test("CRLF input works", () => {
    const r = splitMarkdownSections(md.replace(/\n/g, "\r\n"));
    expect(r.sections.length).toBe(2);
  });
});
