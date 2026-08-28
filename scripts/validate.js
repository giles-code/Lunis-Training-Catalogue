#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const rootDir = path.join(__dirname, "..");
const coursesDir = path.join(rootDir, "courses");
const schemaPath = path.join(rootDir, "schema", "course.frontmatter.schema.json");

const REQUIRED_SECTIONS = [
  "Aim and Purpose",
  "Intended Audience",
  "Learning Objectives",
  "Syllabus",
  "Structure and Format",
  "Useful Prior Knowledge and Experience",
];

function extractSections(body) {
  const headingPattern = /^##\s+(.+?)\s*$/gm;
  const found = [];
  let match;
  while ((match = headingPattern.exec(body)) !== null) {
    found.push(match[1].trim());
  }
  return found;
}

function main() {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const files = fs
    .readdirSync(coursesDir)
    .filter((name) => name.endsWith(".md"));

  if (files.length === 0) {
    console.error(`No course files found in ${coursesDir}`);
    process.exit(1);
  }

  let hasErrors = false;
  const seenIds = new Map();
  const seenSlugs = new Map();

  for (const file of files) {
    const filePath = path.join(coursesDir, file);
    const fileId = path.basename(file, ".md");
    let fileHasErrors = false;
    let parsed;
    try {
      parsed = matter(fs.readFileSync(filePath, "utf8"));
    } catch (err) {
      console.error(`✗ ${file}: could not parse frontmatter (${err.message})`);
      hasErrors = true;
      continue;
    }

    const frontmatter = parsed.data;
    const valid = validate(frontmatter);
    if (!valid) {
      console.error(`✗ ${file}:`);
      for (const err of validate.errors) {
        console.error(`    ${err.instancePath || "/"} ${err.message}`);
      }
      hasErrors = true;
      continue;
    }

    if (frontmatter.id !== fileId) {
      console.error(
        `✗ ${file}: "id" ("${frontmatter.id}") must match the filename ("${fileId}")`
      );
      fileHasErrors = true;
    }

    if (seenIds.has(frontmatter.id)) {
      console.error(
        `✗ ${file}: duplicate "id" "${frontmatter.id}" (also used in ${seenIds.get(frontmatter.id)})`
      );
      fileHasErrors = true;
    } else {
      seenIds.set(frontmatter.id, file);
    }

    if (seenSlugs.has(frontmatter.slug)) {
      console.error(
        `✗ ${file}: duplicate "slug" "${frontmatter.slug}" (also used in ${seenSlugs.get(frontmatter.slug)})`
      );
      fileHasErrors = true;
    } else {
      seenSlugs.set(frontmatter.slug, file);
    }

    const sectionsFound = extractSections(parsed.content);
    const missing = REQUIRED_SECTIONS.filter((s) => !sectionsFound.includes(s));
    if (missing.length > 0) {
      console.error(`✗ ${file}: missing required section(s): ${missing.join(", ")}`);
      fileHasErrors = true;
    }

    const unexpected = sectionsFound.filter((s) => !REQUIRED_SECTIONS.includes(s));
    if (unexpected.length > 0) {
      console.error(
        `✗ ${file}: unrecognised section heading(s), must exactly match the required set: ${unexpected.join(", ")}`
      );
      fileHasErrors = true;
    }

    if (fileHasErrors) {
      hasErrors = true;
    } else {
      console.log(`✓ ${file}`);
    }
  }

  if (hasErrors) {
    console.error(`\n${files.length} file(s) checked, errors found.`);
    process.exit(1);
  }

  console.log(`\n${files.length} course file(s) validated successfully.`);
}

main();
