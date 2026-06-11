import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { courseSchema } from "./types";
import { validateCourseDir } from "./course-dir";

const arg = process.argv[2];

if (arg === "--emit-jsonschema") {
  const jsonSchema = z.toJSONSchema(courseSchema);
  const outDir = join(import.meta.dir, "..", "json");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "course.schema.json"),
    JSON.stringify(jsonSchema, null, 2) + "\n"
  );
  console.log("wrote json/course.schema.json");
  process.exit(0);
}

if (!arg) {
  console.error("usage: bun run src/cli.ts <course-dir> | --emit-jsonschema");
  process.exit(2);
}

const result = validateCourseDir(arg);

for (const w of result.warnings) console.log(`WARN  ${w.file}: ${w.message}`);
for (const e of result.errors) console.log(`ERROR ${e.file}: ${e.message}`);

console.log(
  `\n${result.errors.length} error(s), ${result.warnings.length} warning(s)` +
    (result.course ? ` — course "${result.course.slug}" (${result.course.units.length} units)` : "")
);
process.exit(result.errors.length > 0 ? 1 : 0);
