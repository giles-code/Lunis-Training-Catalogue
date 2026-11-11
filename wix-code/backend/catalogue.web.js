import { webMethod, Permissions } from 'wix-web-module';
import { fetch } from 'wix-fetch';

const CATALOGUE_URL =
  'https://raw.githubusercontent.com/giles-code/Lunis-Training-Catalogue/claude/coding-help-lsmkts/dist/catalogue.json';

let cachedPayload;
let cacheExpiresAt = 0;
const CACHE_MS = 5 * 60 * 1000;

async function fetchCatalogue() {
  const now = Date.now();
  if (cachedPayload && now < cacheExpiresAt) {
    return cachedPayload;
  }

  const response = await fetch(CATALOGUE_URL, {
    method: 'get',
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`GitHub catalogue request failed (${response.status})`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.courses)) {
    throw new Error('GitHub catalogue returned an unexpected format');
  }

  cachedPayload = payload;
  cacheExpiresAt = now + CACHE_MS;
  return payload;
}

export const getCatalogue = webMethod(Permissions.Anyone, async () => {
  const payload = await fetchCatalogue();
  return {
    generatedAt: payload.generatedAt,
    courses: payload.courses.filter((course) => course.active === true)
  };
});

export const getCourseBySlug = webMethod(Permissions.Anyone, async (slug) => {
  if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return null;
  }

  const payload = await fetchCatalogue();
  return payload.courses.find(
    (course) => course.active === true && course.slug === slug
  ) || null;
});
