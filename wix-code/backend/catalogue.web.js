// Lunis catalogue — backend web module (Velo).
// Reads the feed built by GitHub Actions from this repository and serves it to page code.
// Route B in INSTALL.md ("live feed"). Route A (CMS sync) uses catalogueSync.js instead; both can run side by side.
import { webMethod, Permissions } from 'wix-web-module';
import { fetch } from 'wix-fetch';

// Points at main once catalogue-v2 is merged. Until then use .../catalogue-v2/dist
const BASE = 'https://raw.githubusercontent.com/giles-code/Lunis-Training-Catalogue/main/dist';
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map();

async function getJson(rel) {
  const hit = cache.get(rel);
  if (hit && Date.now() < hit.expires) return hit.value;
  const res = await fetch(`${BASE}/${rel}`, { method: 'get', headers: { Accept: 'application/json' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Catalogue request failed (${res.status}) for ${rel}`);
  const value = await res.json();
  cache.set(rel, { value, expires: Date.now() + CACHE_MS });
  return value;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const has = (field, value) => !value || (Array.isArray(field) ? field.includes(value) : field === value);

// Filters shared by every listing; every key is optional.
// { audience, role, firmType, sectorOnly, topic, edition, level, delivered, q, kinds: ['Programme','Module','Course'] }
function matches(item, f) {
  if (!has(item.audience, f.audience)) return false;
  if (f.firmType) {
    const types = item.firmType || [];
    // Cross-sector content ("All firm types") shows on every firm-type page unless sectorOnly is set.
    if (!(types.includes(f.firmType) || (!f.sectorOnly && types.includes('All firm types')))) return false;
  }
  if (!has(item.role, f.role)) return false;
  if (!has(item.topics, f.topic)) return false;
  if (!has(item.edition, f.edition)) return false;
  if (!has(item.level, f.level)) return false;
  if (f.delivered && !item.delivered) return false;
  if (f.q) {
    const text = [item.title, item.summary, item.programmeTitle, ...(item.syllabus || []), ...(item.topics || [])].join(' ').toLowerCase();
    if (!f.q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => text.includes(w))) return false;
  }
  return true;
}

/** Taxonomy and headline counts for menus, hub pages and the firm-type map. */
export const getSiteIndex = webMethod(Permissions.Anyone, async () => {
  const idx = await getJson('index.json');
  return { generatedAt: idx.generatedAt, taxonomy: idx.taxonomy, counts: idx.counts };
});

/** One search across programmes, modules and courses. Returns light cards. */
export const searchCatalogue = webMethod(Permissions.Anyone, async (filters = {}, limit = 60, skip = 0) => {
  const idx = await getJson('index.json');
  const kinds = filters.kinds && filters.kinds.length ? filters.kinds : ['Programme', 'Course'];
  const pool = [
    ...(kinds.includes('Programme') ? idx.programmes : []),
    ...(kinds.includes('Module') ? idx.modules : []),
    ...(kinds.includes('Course') ? idx.courses : []),
  ];
  const hits = pool.filter((x) => matches(x, filters));
  return { total: hits.length, items: hits.slice(skip, skip + limit) };
});

const rolesOf = (taxonomy, audienceKey) => (taxonomy.roles.find((g) => g.audience === audienceKey) || { roles: [] }).roles;

/** Audience hub: its four role tiles (with counts), programmes grouped by primary topic, and the facets the hub shows. */
export const getAudienceHub = webMethod(Permissions.Anyone, async (audienceSlug) => {
  const idx = await getJson('index.json');
  const audience = idx.taxonomy.audiences.find((a) => a.slug === audienceSlug);
  if (!audience) return null;
  const programmes = idx.programmes.filter((p) => p.audience.includes(audience.key));
  const byTopic = {};
  programmes.forEach((p) => (byTopic[p.topics[0]] = byTopic[p.topics[0]] || []).push(p));
  return {
    audience,
    programmes,
    byTopic,
    courseCount: idx.courses.filter((c) => c.audience.includes(audience.key)).length,
    firmTypes: idx.taxonomy.firmTypes,
    roles: rolesOf(idx.taxonomy, audience.key).map((r) => ({
      ...r,
      url: `/training/${audience.slug}/${r.slug}`,
      programmes: programmes.filter((p) => (p.role || []).includes(r.name)).length,
      courses: idx.courses.filter((c) => (c.role || []).includes(r.name)).length,
    })),
    counts: idx.counts,
  };
});

/** Role page (/training/<audience>/<role>, e.g. /training/firms/boards-directors):
 *  programmes and courses for that group, grouped by primary topic. */
export const getRolePage = webMethod(Permissions.Anyone, async (audienceSlug, roleSlug) => {
  const idx = await getJson('index.json');
  const audience = idx.taxonomy.audiences.find((a) => a.slug === audienceSlug);
  if (!audience) return null;
  const role = rolesOf(idx.taxonomy, audience.key).find((r) => r.slug === roleSlug);
  if (!role) return null;
  const programmes = idx.programmes.filter((p) => (p.role || []).includes(role.name));
  const courses = idx.courses.filter((c) => (c.role || []).includes(role.name));
  const byTopic = {};
  programmes.forEach((p) => (byTopic[p.topics[0]] = byTopic[p.topics[0]] || []).push(p));
  return { audience, role, siblings: rolesOf(idx.taxonomy, audience.key), programmes, courses, byTopic };
});

/** Firm-type page: sector programmes, cross-sector programmes, and what supervisors of the sector are trained on. */
export const getFirmTypePage = webMethod(Permissions.Anyone, async (firmTypeSlug, role) => {
  const idx = await getJson('index.json');
  const ft = idx.taxonomy.firmTypes.find((t) => t.slug === firmTypeSlug);
  if (!ft) return null;
  const firm = idx.programmes.filter((p) => p.audience.includes('Firms') && has(p.role, role));
  return {
    firmType: ft,
    sector: firm.filter((p) => (p.firmType || []).includes(ft.name)),
    crossSector: firm.filter((p) => (p.firmType || []).includes('All firm types')),
    forSupervisors: idx.programmes.filter((p) => p.audience.includes('Financial Supervisors') && (p.firmType || []).includes(ft.name)),
  };
});

/** Full programme record (section HTML plus structured modules). */
export const getProgramme = webMethod(Permissions.Anyone, async (slug) => {
  if (typeof slug !== 'string' || !SLUG.test(slug)) return null;
  return getJson(`programmes/${slug}.json`);
});

/** Full standalone course record. */
export const getCourse = webMethod(Permissions.Anyone, async (slug) => {
  if (typeof slug !== 'string' || !SLUG.test(slug)) return null;
  return getJson(`courses/${slug}.json`);
});

/** Related programmes: same primary topic or a shared sector. */
export const getRelated = webMethod(Permissions.Anyone, async (slug, limit = 4) => {
  const idx = await getJson('index.json');
  const p = idx.programmes.find((x) => x.slug === slug);
  if (!p) return [];
  const sectors = (p.firmType || []).filter((t) => t !== 'All firm types');
  return idx.programmes
    .filter((x) => x.slug !== slug && (x.topics[0] === p.topics[0] || (x.firmType || []).some((t) => sectors.includes(t))))
    .slice(0, limit);
});

// ---- Legacy v1 methods (used by the existing catalogue / course pages).
export const getCatalogue = webMethod(Permissions.Anyone, async () => {
  const v1 = await getJson('catalogue.json');
  return { generatedAt: v1.generatedAt, courses: v1.courses.filter((c) => c.active === true) };
});
export const getCourseBySlug = webMethod(Permissions.Anyone, async (slug) => {
  if (typeof slug !== 'string' || !SLUG.test(slug)) return null;
  const v1 = await getJson('catalogue.json');
  return v1.courses.find((c) => c.active === true && c.slug === slug) || null;
});
