#!/usr/bin/env node
// Validates every Markdown file in courses/ and programmes/ against its schema and the taxonomy files.
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const root = path.join(__dirname, "..");
const tax = (name, key) => JSON.parse(fs.readFileSync(path.join(root, "taxonomy", name), "utf8"))[key];
const names = (list) => new Set(list.map((x) => x.name));

const SIX = [
  "Aim and Purpose",
  "Intended Audience",
  "Learning Objectives",
  "Syllabus",
  "Structure and Format",
  "Useful Prior Knowledge and Experience",
];
const OPTIONAL = ["Core Reading"];

const COLLECTIONS = [
  { dir: "courses", schema: "course.frontmatter.schema.json", format: "Course" },
  { dir: "programmes", schema: "programme.frontmatter.schema.json", format: "Programme" },
];

function sections(body) {
  const out = [];
  const re = /^##\s+(.+?)\s*$/gm;
  let m;
  while ((m = re.exec(body)) !== null) out.push(m[1].trim());
  return out;
}

function sectionBody(body, heading) {
  const parts = body.split(/^##\s+(.+)$/gm);
  for (let i = 1; i < parts.length; i += 2) if (parts[i].trim() === heading) return parts[i + 1] || "";
  return "";
}

function main() {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);

  const T = {
    businessFunctions: new Map(tax("business-functions.json", "businessFunctions").map((f) => [f.name, f.appliesTo])),
    pillars: names(tax("pillars.json", "pillars")),
    tracks: new Map(tax("tracks.json", "tracks").map((t) => [t.name, t.pillar])),
    audiences: new Set(tax("audiences.json", "audiences").map((a) => a.key)),
    firmTypes: names(tax("firm-types.json", "firmTypes")),
    roles: new Map(tax("roles.json", "audiences").flatMap((g) => g.roles.map((r) => [r.name, g.audience]))),
    topics: names(tax("topics.json", "topics")),
  };

  let errors = 0;
  let checked = 0;
  const ids = new Map();
  const programmeSlugs = new Set();
  const counterparts = [];

  for (const col of COLLECTIONS) {
    const dir = path.join(root, col.dir);
    if (!fs.existsSync(dir)) continue;
    const validate = ajv.compile(JSON.parse(fs.readFileSync(path.join(root, "schema", col.schema), "utf8")));
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
      checked += 1;
      const problems = [];
      let parsed;
      try {
        parsed = matter(fs.readFileSync(path.join(dir, file), "utf8"));
      } catch (e) {
        console.error(`✗ ${col.dir}/${file}: could not parse frontmatter (${e.message})`);
        errors += 1;
        continue;
      }
      const d = parsed.data;
      if (!validate(d)) {
        for (const e of validate.errors) problems.push(`${e.instancePath || "/"} ${e.message}`);
      } else {
        if (d.id !== path.basename(file, ".md")) problems.push(`id "${d.id}" must match the file name`);
        if (ids.has(d.id)) problems.push(`duplicate id "${d.id}" (also ${ids.get(d.id)})`);
        ids.set(d.id, `${col.dir}/${file}`);
        if (d.format && d.format !== col.format) problems.push(`format must be "${col.format}" in ${col.dir}/`);
        if (!T.pillars.has(d.pillar)) problems.push(`pillar "${d.pillar}" not in taxonomy/pillars.json`);
        if (!T.tracks.has(d.track)) problems.push(`track "${d.track}" not in taxonomy/tracks.json`);
        else if (T.tracks.get(d.track) !== d.pillar) problems.push(`track "${d.track}" belongs to pillar "${T.tracks.get(d.track)}", not "${d.pillar}"`);
        for (const a of d.audience) if (!T.audiences.has(a)) problems.push(`audience "${a}" not in taxonomy/audiences.json`);
        for (const x of d.firmType || []) if (!T.firmTypes.has(x)) problems.push(`firmType "${x}" not in taxonomy/firm-types.json`);
        for (const x of d.role || []) {
          if (!T.roles.has(x)) problems.push(`role "${x}" not in taxonomy/roles.json`);
          else if (!d.audience.includes(T.roles.get(x))) problems.push(`role "${x}" belongs to audience "${T.roles.get(x)}", which this item is not tagged for`);
        }
        for (const x of d.topics || []) if (!T.topics.has(x)) problems.push(`topic "${x}" not in taxonomy/topics.json`);
        for (const fn of d.businessFunction) {
          if (!T.businessFunctions.has(fn)) problems.push(`businessFunction "${fn}" not in taxonomy/business-functions.json`);
          else if (!d.clientType.some((ct) => T.businessFunctions.get(fn).includes(ct)))
            problems.push(`businessFunction "${fn}" does not apply to clientType [${d.clientType.join(", ")}]`);
        }
        const found = sections(parsed.content);
        const missing = SIX.filter((s) => !found.includes(s));
        if (missing.length) problems.push(`missing section(s): ${missing.join(", ")}`);
        const extra = found.filter((s) => !SIX.includes(s) && !(col.format === "Programme" && OPTIONAL.includes(s)));
        if (extra.length) problems.push(`unrecognised section(s): ${extra.join(", ")}`);
        if (col.format === "Programme") {
          programmeSlugs.add(d.slug);
          if (d.internationalCounterpart) counterparts.push([file, d.internationalCounterpart]);
          const blocks = sectionBody(parsed.content, "Syllabus").split(/^###\s+/m).slice(1);
          if (blocks.length !== d.moduleCount) problems.push(`moduleCount is ${d.moduleCount} but Syllabus has ${blocks.length} '### Module' blocks`);
          blocks.forEach((b, i) => {
            if (!new RegExp(`^Module ${i + 1}:\\s+\\S`).test(b)) problems.push(`module block ${i + 1} must start '### Module ${i + 1}: <title>'`);
            if (!/\*\*Syllabus\*\*/.test(b)) problems.push(`module ${i + 1} has no **Syllabus** list`);
          });
        }
      }
      if (problems.length) {
        errors += 1;
        console.error(`✗ ${col.dir}/${file}:\n    ${problems.join("\n    ")}`);
      }
    }
  }
  for (const [file, slug] of counterparts)
    if (!programmeSlugs.has(slug)) {
      errors += 1;
      console.error(`✗ programmes/${file}: internationalCounterpart "${slug}" is not a programme`);
    }

  if (errors) {
    console.error(`\n${checked} file(s) checked, ${errors} with errors.`);
    process.exit(1);
  }
  console.log(`${checked} file(s) validated successfully.`);
}

main();
