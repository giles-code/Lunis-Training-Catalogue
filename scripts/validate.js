#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const rootDir = path.join(__dirname, "..");
const coursesDir = path.join(rootDir, "courses");
const schemaPath = path.join(rootDir, "schema", "course.schema.json");

function main() {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const files = fs
    .readdirSync(coursesDir)
    .filter((name) => name.endsWith(".json"));

  if (files.length === 0) {
    console.error(`No course files found in ${coursesDir}`);
    process.exit(1);
  }

  let hasErrors = false;
  const seenIds = new Map();
  const seenSlugs = new Map();

  for (const file of files) {
    const filePath = path.join(coursesDir, file);
    let fileHasErrors = false;
    let course;
    try {
      course = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (err) {
      console.error(`✗ ${file}: invalid JSON (${err.message})`);
      hasErrors = true;
      continue;
    }

    const valid = validate(course);
    if (!valid) {
      console.error(`✗ ${file}:`);
      for (const err of validate.errors) {
        console.error(`    ${err.instancePath || "/"} ${err.message}`);
      }
      hasErrors = true;
      continue;
    }

    if (course.id !== path.basename(file, ".json")) {
      console.error(
        `✗ ${file}: "id" ("${course.id}") must match the filename ("${path.basename(file, ".json")}")`
      );
      fileHasErrors = true;
    }

    if (seenIds.has(course.id)) {
      console.error(
        `✗ ${file}: duplicate "id" "${course.id}" (also used in ${seenIds.get(course.id)})`
      );
      fileHasErrors = true;
    } else {
      seenIds.set(course.id, file);
    }

    if (seenSlugs.has(course.slug)) {
      console.error(
        `✗ ${file}: duplicate "slug" "${course.slug}" (also used in ${seenSlugs.get(course.slug)})`
      );
      fileHasErrors = true;
    } else {
      seenSlugs.set(course.slug, file);
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
