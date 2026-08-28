#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const rootDir = path.join(__dirname, "..");
const coursesDir = path.join(rootDir, "courses");
const schemaPath = path.join(rootDir, "schema", "course.frontmatter.schema.json");
const businessFunctionsPath = path.join(rootDir, "taxonomy", "business-functions.json");
const pillarsPath = path.join(rootDir, "taxonomy", "pillars.json");
const tracksPath = path.join(rootDir, "taxonomy", "tracks.json");

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

  const businessFunctions = new Map(
    JSON.parse(fs.readFileSync(businessFunctionsPath, "utf8")).businessFunctions.map(
      (f) => [f.name, f.appliesTo]
    )
  );
  const pillars = new Set(
    JSON.parse(fs.readFileSync(pillarsPath, "utf8")).pillars.map((p) => p.name)
  );
  const tracks = new Map(
    JSON.parse(fs.readFileSync(tracksPath, "utf8")).tracks.map((t) => [t.name, t.pillar])
  );

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
  let filesWithGaps = 0;
  let inactiveCount = 0;

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

    if (!pillars.has(frontmatter.pillar)) {
      console.error(`✗ ${file}: pillar "${frontmatter.pillar}" is not in taxonomy/pillars.json`);
      fileHasErrors = true;
    }

    if (!tracks.has(frontmatter.track)) {
      console.error(`✗ ${file}: track "${frontmatter.track}" is not in taxonomy/tracks.json`);
      fileHasErrors = true;
    } else if (tracks.get(frontmatter.track) !== frontmatter.pillar) {
      console.error(
        `✗ ${file}: track "${frontmatter.track}" belongs to pillar "${tracks.get(frontmatter.track)}", but this course's pillar is "${frontmatter.pillar}"`
      );
      fileHasErrors = true;
    }

    for (const fn of frontmatter.businessFunction) {
      if (!businessFunctions.has(fn)) {
        console.error(
          `✗ ${file}: businessFunction "${fn}" is not in taxonomy/business-functions.json`
        );
        fileHasErrors = true;
        continue;
      }
      const appliesTo = businessFunctions.get(fn);
      const overlaps = frontmatter.clientType.some((ct) => appliesTo.includes(ct));
      if (!overlaps) {
        console.error(
          `✗ ${file}: businessFunction "${fn}" only applies to [${appliesTo.join(", ")}], but this course's clientType is [${frontmatter.clientType.join(", ")}]`
        );
        fileHasErrors = true;
      }
    }

    if (frontmatter.contentGaps && frontmatter.contentGaps.length > 0) {
      filesWithGaps += 1;
    }
    if (frontmatter.active === false) {
      inactiveCount += 1;
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
  console.log(`${filesWithGaps} file(s) flag contentGaps; ${inactiveCount} file(s) are inactive.`);
}

main();
