import matter from "gray-matter";
import { z } from "zod";
import type { Issue } from "./types";

// z.object (not z.strictObject) — unit frontmatter may carry extra optional keys
// (e.g. hours, objectives) which are tolerated; only id and title are contract.
const unitFrontmatterSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
});

// block-level only: indented or list-item directives are not matched
// note: [^}]* spans newlines — multiline directives are accepted
const VIDEO_DIRECTIVE_RE = /^::video\{([^}]*)\}/gm;

// Remove fenced code blocks so documented directive examples are not validated.
function stripFences(body: string): string {
  return body.replace(/^```[\s\S]*?^```/gm, "");
}

function parseAttrs(raw: string): Map<string, string> {
  const attrs = new Map<string, string>();
  const ATTR_RE = /(\w+)=(?:"([^"]*)"|'([^']*)')/g;
  for (const m of raw.matchAll(ATTR_RE)) attrs.set(m[1]!, m[2] ?? m[3] ?? "");
  return attrs;
}

/** Valida un units/uN.md contra lo declarado en course.yaml. */
export function validateUnitMarkdown(
  content: string,
  expected: { id: string; title: string },
  file: string
): Issue[] {
  const issues: Issue[] = [];

  let fm: ReturnType<typeof matter>;
  try {
    fm = matter(content);
  } catch {
    return [{ file, severity: "error", message: "invalid frontmatter (YAML parse failed)" }];
  }

  const parsed = unitFrontmatterSchema.safeParse(fm.data);
  if (!parsed.success) {
    issues.push({
      file,
      severity: "error",
      message: "missing or invalid frontmatter: requires id and title",
    });
    return issues;
  }

  if (parsed.data.id !== expected.id) {
    issues.push({
      file,
      severity: "error",
      message: `frontmatter id "${parsed.data.id}" does not match course.yaml id "${expected.id}"`,
    });
  }
  if (parsed.data.title !== expected.title) {
    issues.push({
      file,
      severity: "warning",
      message: `frontmatter title differs from course.yaml ("${parsed.data.title}" vs "${expected.title}")`,
    });
  }

  for (const m of stripFences(fm.content).matchAll(VIDEO_DIRECTIVE_RE)) {
    const attrs = parseAttrs(m[1]!);
    if (!attrs.has("src")) {
      issues.push({ file, severity: "error", message: "::video directive missing src attribute" });
    } else if (attrs.get("src") === "") {
      issues.push({ file, severity: "warning", message: "::video with empty src (pending link)" });
    }
    if (!attrs.has("caption")) {
      issues.push({ file, severity: "warning", message: "::video directive missing caption" });
    }
  }

  return issues;
}
