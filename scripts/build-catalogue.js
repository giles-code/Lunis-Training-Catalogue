// Builds the website feed from programmes/ and modules/.
//   dist/index.json        everything the catalogue, filters and counts need (no long text)
//   dist/items/<id>.json   one file per programme or module, with every field and section, links resolved
// Run: npm run build:catalogue   (CI runs it on every push and commits the result)
const fs = require('fs');
const path = require('path');
const { root, readJson, loadEntries } = require('./lib');

const clientTypes = readJson('taxonomy/client-types.json').clientTypes;
const label = Object.fromEntries(clientTypes.map((c) => [c.key, c.label]));
const pillars = readJson('taxonomy/pillars.json').pillars;
const roles = readJson('taxonomy/roles.json').roles;
const levels = readJson('taxonomy/levels.json');
const topics = readJson('taxonomy/topics.json');
const firmTypes = readJson('taxonomy/firm-types.json');
const listOf = (obj) => Object.values(obj).find(Array.isArray) || [];

const all = loadEntries();
const entries = all.filter((e) => e.data.active !== false);
const byId = new Map(entries.map((e) => [e.data.id, e]));

const exists = (rel) => fs.existsSync(path.join(root, rel));
const hours = (d) => (d.durationUnit === 'hours' ? d.durationValue : d.durationUnit === 'days' ? d.durationValue * 7 : d.durationValue * 35);

// programme -> ordered active modules
const modulesOf = new Map();
for (const e of entries) {
  for (const link of e.data.partOf || []) {
    if (!byId.has(link.programme)) continue;
    if (!modulesOf.has(link.programme)) modulesOf.set(link.programme, []);
    modulesOf.get(link.programme).push({ number: link.module, e });
  }
}
for (const list of modulesOf.values()) list.sort((a, b) => a.number - b.number);

function base(e) {
  const d = e.data;
  const out = {
    id: d.id, entryType: d.entryType, title: d.title, summary: d.summary,
    clientType: d.clientType, clientTypeLabels: d.clientType.map((c) => label[c]),
    pillar: d.pillar, topic: d.topic || '', tags: d.tags || [], level: d.level || '',
    deliveryFormat: d.deliveryFormat, durationValue: d.durationValue, durationUnit: d.durationUnit,
    role: d.role || [], firmType: d.firmType || [],
    slug: d.legacySlug || e.name
  };
  const img = `images/${d.id}.webp`;
  if (exists(img)) out.image = img;
  const pdf = `brochures/${d.id}.pdf`;
  if (exists(pdf)) out.brochure = pdf;
  if (d.entryType === 'programme') {
    const mods = modulesOf.get(d.id) || [];
    out.moduleCount = mods.length;
    out.hoursPerModule = d.hoursPerModule || (mods.length ? Math.round((hours(d) / mods.length) * 10) / 10 : undefined);
  }
  return out;
}

// Modules inherit missing values from their first programme.
function inherit(e) {
  const d = e.data;
  const first = (d.partOf || []).map((l) => byId.get(l.programme)).find(Boolean);
  const inherited = [];
  const sections = { ...e.sections };
  const extra = {};
  if (first) {
    for (const name of ['Intended Audience', 'Useful Prior Knowledge and Experience', 'Core Reading']) {
      if (!sections[name] && first.sections[name]) { sections[name] = first.sections[name]; inherited.push(name); }
    }
    if (!d.level && first.data.level) { extra.level = first.data.level; inherited.push('level'); }
  }
  return { sections, extra, inherited };
}

function cardOf(id) {
  const e = byId.get(id);
  if (!e) return null;
  const b = base(e);
  return { id: b.id, entryType: b.entryType, title: b.title, summary: b.summary, level: b.level,
    moduleCount: b.moduleCount, hours: hours(e.data), clientTypeLabels: b.clientTypeLabels };
}

// Related: the entry's own list, otherwise the closest programmes sharing a client type (tags, then pillar, then topic).
function related(e) {
  const d = e.data;
  if ((d.related || []).length) return d.related.map(cardOf).filter(Boolean);
  const siblings = new Set((d.partOf || []).map((l) => l.programme));
  const want = d.entryType === 'programme' ? 6 : 3;
  const scored = [];
  for (const o of entries) {
    if (o === e || o.data.entryType !== 'programme' || siblings.has(o.data.id)) continue;
    if (!o.data.clientType.some((c) => d.clientType.includes(c))) continue;
    let s = 0;
    for (const t of d.tags || []) if ((o.data.tags || []).includes(t)) s += 3;
    for (const c of d.clientType) if (d.pillar[c] && o.data.pillar[c] === d.pillar[c]) s += 2;
    if (d.topic && o.data.topic === d.topic) s += 2;
    if (s) scored.push([s, o]);
  }
  scored.sort((a, b) => b[0] - a[0] || a[1].data.title.localeCompare(b[1].data.title));
  return scored.slice(0, want).map(([, o]) => cardOf(o.data.id));
}

const items = [];
fs.rmSync(path.join(root, 'dist'), { recursive: true, force: true });
fs.mkdirSync(path.join(root, 'dist', 'items'), { recursive: true });

for (const e of entries) {
  const d = e.data;
  const card = base(e);
  const full = { ...card, intro: d.intro || '', lastUpdated: d.lastUpdated || '', businessFunction: d.businessFunction || [],
    contentGaps: d.contentGaps || [] };

  if (d.entryType === 'programme') {
    full.sections = e.sections;
    full.modules = (modulesOf.get(d.id) || []).map(({ number, e: m }) => ({
      id: m.data.id, number, title: m.data.title, summary: m.data.summary,
      objectives: Array.isArray(m.sections['Learning Objectives']) ? m.sections['Learning Objectives'] : [],
      syllabus: Array.isArray(m.sections['Syllabus']) ? m.sections['Syllabus'] : [],
      durationValue: m.data.durationValue, durationUnit: m.data.durationUnit
    }));
  } else {
    const { sections, extra, inherited } = inherit(e);
    Object.assign(card, extra);
    Object.assign(full, extra);
    full.sections = sections;
    full.inherited = inherited;
    full.partOf = (d.partOf || []).filter((l) => byId.has(l.programme)).sort((a, b) => a.programme - b.programme).map((l) => {
      const p = byId.get(l.programme).data;
      const mods = modulesOf.get(p.id) || [];
      return { programme: p.id, module: l.module, title: p.title, moduleCount: mods.length,
        durationValue: p.durationValue, durationUnit: p.durationUnit, level: p.level || '',
        modules: mods.map(({ number, e: m }) => ({ id: m.data.id, number, title: m.data.title })) };
    });
    card.partOf = full.partOf.map((p) => ({ programme: p.programme, module: p.module, title: p.title, moduleCount: p.moduleCount }));
  }
  full.related = related(e);
  items.push(card);
  fs.writeFileSync(path.join(root, 'dist', 'items', `${d.id}.json`), JSON.stringify(full, null, 1) + '\n');
}

items.sort((a, b) => (a.entryType === b.entryType ? 0 : a.entryType === 'programme' ? -1 : 1) || a.title.localeCompare(b.title));

const index = {
  version: 'v3',
  generatedAt: new Date().toISOString(),
  taxonomy: {
    clientTypes,
    audiences: clientTypes.map((c) => ({ key: c.key, label: c.label, description: c.description })),
    pillars, roles, levels: listOf(levels), topics: listOf(topics), firmTypes: listOf(firmTypes)
  },
  counts: {
    programmes: items.filter((i) => i.entryType === 'programme').length,
    modules: items.filter((i) => i.entryType === 'module').length,
    inactive: all.length - entries.length
  },
  items
};
fs.writeFileSync(path.join(root, 'dist', 'index.json'), JSON.stringify(index) + '\n');
console.log(`Built dist/index.json (${index.counts.programmes} programmes, ${index.counts.modules} modules) and ${items.length} item files; ${index.counts.inactive} inactive left out.`);
