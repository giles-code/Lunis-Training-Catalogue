// Lunis catalogue — URL routers for Route B (live feed). Gives clean, indexable URLs with SEO tags and sitemaps:
//   /training/programme/<slug>   /training/course/<slug>
// With Route A (CMS sync) you do not need this file: use CMS dynamic pages instead.
import { ok, notFound, WixRouterSitemapEntry } from 'wix-router';
import { fetch } from 'wix-fetch';

const BASE = 'https://raw.githubusercontent.com/giles-code/Lunis-Training-Catalogue/main/dist';
const get = async (rel) => {
  const r = await fetch(`${BASE}/${rel}`, { method: 'get' });
  return r.ok ? r.json() : null;
};
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function programme_Router(request) {
  const slug = request.path[0];
  if (!slug || !SLUG.test(slug)) return notFound();
  const p = await get(`programmes/${slug}.json`);
  if (!p || !p.active) return notFound();
  return ok('Programme Page', p, {
    title: `${p.title} | Lunis Training`,
    description: p.summary,
    metaTags: { 'og:title': p.title, 'og:description': p.summary },
  });
}

export async function programme_SiteMap() {
  const idx = await get('index.json');
  return idx.programmes.map((p) => {
    const e = new WixRouterSitemapEntry(p.slug);
    e.pageName = 'Programme Page';
    e.url = `/training/programme/${p.slug}`;
    e.title = p.title;
    return e;
  });
}

export async function course_Router(request) {
  const slug = request.path[0];
  if (!slug || !SLUG.test(slug)) return notFound();
  const c = await get(`courses/${slug}.json`);
  if (!c) return notFound();
  return ok('Course Page', c, { title: `${c.title} | Lunis Training`, description: c.summary });
}

export async function course_SiteMap() {
  const idx = await get('index.json');
  return idx.courses.map((c) => {
    const e = new WixRouterSitemapEntry(c.slug);
    e.pageName = 'Course Page';
    e.url = `/training/course/${c.slug}`;
    e.title = c.title;
    return e;
  });
}
