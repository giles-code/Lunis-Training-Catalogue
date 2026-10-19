#!/usr/bin/env node
// Builds the website feed from courses/, programmes/ and taxonomy/.
//
// dist/site.json           everything (Markdown text, no HTML) for syncing into Wix CMS: taxonomy, programmes (with modules), a flat
//                          module catalogue, standalone courses and counts per audience / firm type / topic.
// dist/index.json          the same without long text (cards, filters and search on hub pages).
// dist/programmes/<slug>.json and dist/courses/<slug>.json   one record per detail page.
// dist/catalogue.json      legacy v1 feed (standalone courses only) so the current Wix pages keep working.
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
// All website URLs live under the /training section of the Lunis Partners site.
const BASE = "/training";
const tax = (name, key) => JSON.parse(fs.readFileSync(path.join(root, "taxonomy", name), "utf8"))[key];

function splitSections(markdown) {
  const sections = {};
  const parts = markdown.split(/^##\s+(.+)$/gm);
  for (let i = 1; i < parts.length; i += 2) sections[parts[i].trim()] = (parts[i + 1] || "").trim();
  return sections;
}

function inline(v) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function toHtml(md = "") {
  const html = [];
  let list = false;
  const close = () => {
    if (list) html.push("</ul>");
    list = false;
  };
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      close();
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (!list) html.push("<ul>");
      list = true;
      html.push(`<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }
    close();
    if (line.startsWith("### ")) html.push(`<h3>${inline(line.slice(4))}</h3>`);
    else if (line.startsWith("> ")) html.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
    else html.push(`<p>${inline(line)}</p>`);
  }
  close();
  return html.join("");
}

const bullets = (text) => (text.match(/^[-*]\s+.+$/gm) || []).map((l) => l.replace(/^[-*]\s+/, "").trim());

function parseModules(syllabus, programme) {
  return syllabus
    .split(/^###\s+/m)
    .slice(1)
    .map((block, i) => {
      const [heading, ...rest] = block.split(/\r?\n/);
      const body = rest.join("\n");
      const [pre, afterObj = ""] = body.split(/\*\*Objectives\*\*/);
      const [objText, sylText = ""] = afterObj.split(/\*\*Syllabus\*\*/);
      const number = i + 1;
      return {
        id: `${programme.slug}--m${String(number).padStart(2, "0")}`,
        number,
        title: heading.replace(/^Module\s+\d+:\s*/, "").trim(),
        overview: pre.trim(),
        objectives: bullets(objText),
        syllabus: bullets(sylText),
      };
    });
}

function load(dir) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => {
      const parsed = matter(fs.readFileSync(path.join(full, f), "utf8"));
      const sections = splitSections(parsed.content);
      return {
        ...parsed.data,
        _id: parsed.data.id,
        sections,
        sectionHtml: Object.fromEntries(Object.entries(sections).map(([h, b]) => [h, toHtml(b)])),
      };
    });
}

const taxonomy = {
  audiences: tax("audiences.json", "audiences"),
  firmTypes: tax("firm-types.json", "firmTypes"),
  roles: tax("roles.json", "audiences"),
  topics: tax("topics.json", "topics"),
  editions: tax("editions.json", "editions"),
  levels: tax("levels.json", "levels"),
  pillars: tax("pillars.json", "pillars"),
  tracks: tax("tracks.json", "tracks"),
};

const allCourses = load("courses");
const courses = allCourses.filter((c) => c.active === true).map((c) => ({ ...c, format: c.format || "Course", url: `${BASE}/course/${c.slug}` }));
const programmes = load("programmes")
  .filter((p) => p.active === true)
  .map((p) => ({ ...p, url: `${BASE}/programme/${p.slug}`, modules: parseModules(p.sections.Syllabus || "", p) }));

const modules = programmes.flatMap((p) =>
  p.modules.map((m) => ({
    ...m,
    format: "Module",
    programmeSlug: p.slug,
    programmeTitle: p.title,
    audience: p.audience,
    firmType: p.firmType,
    role: p.role,
    topics: p.topics,
    edition: p.edition,
    level: p.level,
    hours: p.hoursPerModule,
    url: `${BASE}/programme/${p.slug}#module-${m.number}`,
  }))
);

const count = (list, key, value) => list.filter((x) => (Array.isArray(x[key]) ? x[key].includes(value) : x[key] === value)).length;
const counts = {
  programmes: programmes.length,
  modules: modules.length,
  courses: courses.length,
  byAudience: Object.fromEntries(taxonomy.audiences.map((a) => [a.key, { programmes: count(programmes, "audience", a.key), courses: count(courses, "audience", a.key) }])),
  byFirmType: Object.fromEntries(
    taxonomy.firmTypes.map((f) => [
      f.name,
      {
        firmProgrammes: programmes.filter((p) => p.audience.includes("Firms") && (p.firmType || []).includes(f.name)).length,
        supervisorProgrammes: programmes.filter((p) => p.audience.includes("Financial Supervisors") && (p.firmType || []).includes(f.name)).length,
      },
    ])
  ),
  byRole: Object.fromEntries(taxonomy.roles.flatMap((g) => g.roles.map((r) => [r.name, { programmes: count(programmes, "role", r.name), courses: count(courses, "role", r.name) }]))),
  byTopic: Object.fromEntries(taxonomy.topics.map((t) => [t.name, count(programmes, "topics", t.name) + count(courses, "topics", t.name)])),
};

// Light records for listings and search (no long text).
const card = (x) => ({
  id: x.id,
  slug: x.slug,
  format: x.format,
  title: x.title,
  summary: x.summary,
  url: x.url,
  audience: x.audience,
  firmType: x.firmType,
  role: x.role,
  topics: x.topics,
  edition: x.edition,
  level: x.level,
  deliveryFormat: x.deliveryFormat,
  durationValue: x.durationValue,
  durationUnit: x.durationUnit,
  moduleCount: x.moduleCount,
  delivered: x.delivered,
  bookingMode: x.bookingMode,
});
const moduleCard = (m) => ({
  id: m.id,
  format: "Module",
  title: m.title,
  summary: m.overview,
  syllabus: m.syllabus,
  url: m.url,
  number: m.number,
  programmeSlug: m.programmeSlug,
  programmeTitle: m.programmeTitle,
  audience: m.audience,
  firmType: m.firmType,
  role: m.role,
  topics: m.topics,
  edition: m.edition,
  level: m.level,
  hours: m.hours,
});

const generatedAt = new Date().toISOString();
const write = (rel, obj) => {
  const file = path.join(dist, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(obj)}\n`);
};

fs.rmSync(path.join(dist, "programmes"), { recursive: true, force: true });
fs.rmSync(path.join(dist, "courses"), { recursive: true, force: true });
const noHtml = ({ sectionHtml, ...rest }) => rest;
write("site.json", { version: 2, generatedAt, taxonomy, counts, programmes: programmes.map(noHtml), modules, courses: courses.map(noHtml) });
write("index.json", {
  version: 2,
  generatedAt,
  taxonomy,
  counts,
  programmes: programmes.map(card),
  modules: modules.map(moduleCard),
  courses: courses.map(card),
});
for (const p of programmes) write(`programmes/${p.slug}.json`, { generatedAt, ...p });
for (const c of courses) write(`courses/${c.slug}.json`, { generatedAt, ...c });
// Legacy v1 feed: same shape as before (courses only, pretty-printed).
fs.writeFileSync(
  path.join(dist, "catalogue.json"),
  `${JSON.stringify({ generatedAt, count: allCourses.length, courses: allCourses }, null, 2)}\n`
);

console.log(`Built ${programmes.length} programmes, ${modules.length} modules and ${courses.length} active courses into dist/`);
