// Checks every programme and module file before it is published.
// Run: npm run validate   (CI runs it on every push and pull request)
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { root, readJson, loadEntries, SECTION_ORDER } = require('./lib');

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(readJson('schema/entry.schema.json'));

const clientTypes = readJson('taxonomy/client-types.json').clientTypes.map((c) => c.key);
const pillarsByCt = {};
for (const block of readJson('taxonomy/pillars.json').pillars) pillarsByCt[block.clientType] = block.pillars.map((p) => p.name);

const REQUIRED_SECTIONS = {
  programme: ['Aim and Purpose', 'Intended Audience', 'Learning Objectives', 'Structure and Format', 'Useful Prior Knowledge and Experience'],
  module: ['Aim and Purpose', 'Learning Objectives']
};

const entries = loadEntries();
const errors = [];
const warnings = [];
const err = (e, msg) => errors.push(`✗ ${e.dir}/${e.file}: ${msg}`);

const byId = new Map();
for (const e of entries) {
  const d = e.data;
  if (!validate(d)) {
    for (const x of validate.errors) err(e, `${x.instancePath || '/'} ${x.message}${x.params && x.params.allowedValues ? ' (' + x.params.allowedValues.join(', ') + ')' : ''}`);
    continue;
  }
  const expected = e.dir === 'programmes' ? 'programme' : 'module';
  if (d.entryType !== expected) err(e, `entryType is "${d.entryType}" but the file is in ${e.dir}/`);
  if (byId.has(d.id)) err(e, `duplicate id ${d.id} (also used in ${byId.get(d.id).dir}/${byId.get(d.id).file})`);
  else byId.set(d.id, e);

  // one pillar per client type, from that client type's list, and nothing extra
  const keys = Object.keys(d.pillar || {});
  for (const ct of d.clientType) {
    if (!(ct in d.pillar)) err(e, `no pillar given for client type "${ct}"`);
    else if (!pillarsByCt[ct].includes(d.pillar[ct])) err(e, `pillar "${d.pillar[ct]}" is not in the ${ct} list (${pillarsByCt[ct].join(', ')})`);
  }
  for (const k of keys) if (!d.clientType.includes(k)) err(e, `pillar given for "${k}" but that is not one of its client types`);

  // sections
  for (const name of Object.keys(e.rawSections)) {
    if (!SECTION_ORDER.includes(name)) err(e, `unknown section "## ${name}" (allowed: ${SECTION_ORDER.join(', ')})`);
  }
  const isLinkedModule = d.entryType === 'module' && (d.partOf || []).length > 0;
  for (const name of REQUIRED_SECTIONS[d.entryType]) {
    if (!e.rawSections[name]) err(e, `missing section "## ${name}"`);
  }
  if (d.entryType === 'module' && !isLinkedModule) {
    for (const name of ['Intended Audience', 'Syllabus']) if (!e.rawSections[name]) warnings.push(`! ${e.dir}/${e.file}: standalone module has no "${name}" section`);
  }
  if (d.entryType === 'module' && !d.level && !isLinkedModule) warnings.push(`! ${e.dir}/${e.file}: no level (shown without one)`);
  if (/Placeholder — this section/.test(Object.values(e.rawSections).join('\n'))) err(e, 'still contains a "Placeholder" line');
}

// programme / module links
const modulesOf = new Map();
for (const e of entries) {
  const d = e.data;
  for (const link of d.partOf || []) {
    const p = byId.get(link.programme);
    if (!p) { err(e, `partOf programme ${link.programme} does not exist`); continue; }
    if (p.data.entryType !== 'programme') { err(e, `partOf ${link.programme} is a module, not a programme`); continue; }
    if (!modulesOf.has(link.programme)) modulesOf.set(link.programme, []);
    modulesOf.get(link.programme).push({ number: link.module, e });
  }
  for (const r of d.related || []) if (!byId.has(r)) err(e, `related id ${r} does not exist`);
  if (d.image && !fs.existsSync(path.join(root, d.image))) err(e, `image ${d.image} not found`);
  if (d.brochure && !fs.existsSync(path.join(root, d.brochure))) err(e, `brochure ${d.brochure} not found`);
}
for (const e of entries.filter((x) => x.data.entryType === 'programme')) {
  const mods = (modulesOf.get(e.data.id) || []).sort((a, b) => a.number - b.number);
  if (!mods.length) { err(e, 'programme has no modules (no module lists it in partOf)'); continue; }
  mods.forEach((m, i) => {
    if (m.number !== i + 1) err(e, `module numbers must run 1, 2, 3 … without gaps or repeats; found ${mods.map((x) => x.number).join(', ')}`);
  });
}

const nProg = entries.filter((e) => e.data.entryType === 'programme').length;
for (const w of warnings.slice(0, 20)) console.warn(w);
if (warnings.length > 20) console.warn(`  … and ${warnings.length - 20} more warnings`);
if (errors.length) {
  for (const x of errors) console.error(x);
  console.error(`\n${errors.length} error(s) in ${entries.length} file(s).`);
  process.exit(1);
}
console.log(`\n${entries.length} file(s) valid: ${nProg} programmes, ${entries.length - nProg} modules. ${warnings.length} warning(s).`);
