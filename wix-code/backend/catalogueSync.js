// Lunis catalogue — sync the GitHub feed into Wix CMS collections (Route A in INSTALL.md).
// Runs hourly from jobs.config, and can be run by hand from the Velo backend test tool.
// GitHub stays the single source of truth: items edited by hand in the CMS are overwritten on the next sync.
import wixData from 'wix-data';
import { fetch } from 'wix-fetch';

const SITE_JSON = 'https://raw.githubusercontent.com/giles-code/Lunis-Training-Catalogue/main/dist/site.json';
const OPTS = { suppressAuth: true };
const CHUNK = 500; // bulkSave accepts up to 1000 items per call

async function upsertAll(collection, items) {
  for (let i = 0; i < items.length; i += CHUNK) {
    await wixData.bulkSave(collection, items.slice(i, i + CHUNK), OPTS);
  }
  // Remove items that are no longer in the feed (retired or renamed).
  const keep = new Set(items.map((x) => x._id));
  let page = await wixData.query(collection).limit(1000).find(OPTS);
  const stale = [];
  for (;;) {
    page.items.forEach((x) => { if (!keep.has(x._id)) stale.push(x._id); });
    if (!page.hasNext()) break;
    page = await page.next();
  }
  for (let i = 0; i < stale.length; i += CHUNK) {
    await wixData.bulkRemove(collection, stale.slice(i, i + CHUNK), OPTS);
  }
  return { saved: items.length, removed: stale.length };
}

const md2text = (s = '') => s.replace(/\*\*(.+?)\*\*/g, '$1');

export async function syncCatalogue() {
  const res = await fetch(SITE_JSON, { method: 'get' });
  if (!res.ok) throw new Error(`site.json request failed (${res.status})`);
  const site = await res.json();

  const programmes = site.programmes.map((p) => ({
    _id: p.id,
    title: p.title,
    slug: p.slug,
    summary: p.summary,
    intro: p.intro,
    audience: p.audience,
    firmType: p.firmType,
    role: p.role || [],
    topics: p.topics,
    primaryTopic: p.topics[0],
    edition: p.edition,
    level: p.level,
    moduleCount: p.moduleCount,
    hoursPerModule: p.hoursPerModule,
    totalHours: p.durationValue,
    deliveryFormat: p.deliveryFormat,
    delivered: !!p.delivered,
    bookingMode: p.bookingMode,
    internationalCounterpart: p.internationalCounterpart || '',
    aim: md2text(p.sections['Aim and Purpose']),
    whoShouldAttend: p.sections['Intended Audience'],
    learningObjectives: p.sections['Learning Objectives'],
    structure: p.sections['Structure and Format'],
    priorKnowledge: p.sections['Useful Prior Knowledge and Experience'],
    coreReading: p.sections['Core Reading'] || '',
    modules: p.modules, // array: { id, number, title, overview, objectives[], syllabus[] }
    brochure: p.brochure,
    lastUpdated: p.lastUpdated,
  }));

  const modules = site.modules.map((m) => ({
    _id: m.id,
    title: m.title,
    overview: m.overview,
    objectives: m.objectives,
    syllabus: m.syllabus,
    syllabusText: m.syllabus.join(' · '),
    number: m.number,
    programme: m.programmeSlug, // set this field type to Reference → Programmes in the CMS
    programmeTitle: m.programmeTitle,
    audience: m.audience,
    firmType: m.firmType,
    role: m.role || [],
    topics: m.topics,
    edition: m.edition,
    level: m.level,
    hours: m.hours,
  }));

  const courses = site.courses.map((c) => ({
    _id: c.id,
    title: c.title,
    slug: c.slug,
    summary: c.summary,
    audience: c.audience,
    firmType: c.firmType,
    topics: c.topics,
    primaryTopic: c.topics[0],
    edition: c.edition,
    deliveryFormat: c.deliveryFormat,
    durationValue: c.durationValue,
    durationUnit: c.durationUnit,
    bookingMode: c.bookingMode,
    aim: md2text(c.sections['Aim and Purpose']),
    whoShouldAttend: c.sections['Intended Audience'],
    learningObjectives: c.sections['Learning Objectives'],
    syllabus: c.sections['Syllabus'],
    structure: c.sections['Structure and Format'],
    priorKnowledge: c.sections['Useful Prior Knowledge and Experience'],
  }));

  const firmTypes = site.taxonomy.firmTypes.map((f, i) => ({
    _id: f.slug, title: f.name, slug: f.slug, description: f.description, order: i,
    firmProgrammes: site.counts.byFirmType[f.name].firmProgrammes,
    supervisorProgrammes: site.counts.byFirmType[f.name].supervisorProgrammes,
  }));
  const audiences = site.taxonomy.audiences.map((a, i) => ({
    _id: a.slug, title: a.label, key: a.key, slug: a.slug, description: a.description, order: i,
    programmes: site.counts.byAudience[a.key].programmes, courses: site.counts.byAudience[a.key].courses,
  }));
  const roles = site.taxonomy.roles.flatMap((g) => g.roles.map((r, i) => ({
    _id: r.slug, // role slugs are unique across audiences
    title: r.name, slug: r.slug, audience: g.audience, description: r.description, order: i,
    programmes: site.counts.byRole[r.name].programmes, courses: site.counts.byRole[r.name].courses,
  })));
  const topics = site.taxonomy.topics.map((t, i) => ({ _id: t.slug, title: t.name, slug: t.slug, order: i, count: site.counts.byTopic[t.name] || 0 }));

  const result = {
    Programmes: await upsertAll('Programmes', programmes),
    Modules: await upsertAll('Modules', modules),
    Courses: await upsertAll('Courses', courses),
    FirmTypes: await upsertAll('FirmTypes', firmTypes),
    Audiences: await upsertAll('Audiences', audiences),
    Topics: await upsertAll('Topics', topics),
    Roles: await upsertAll('Roles', roles),
    generatedAt: site.generatedAt,
  };
  console.log('Catalogue sync complete', JSON.stringify(result));
  return result;
}
