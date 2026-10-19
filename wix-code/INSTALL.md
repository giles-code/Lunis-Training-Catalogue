# Lunis catalogue on Wix Studio — installation

GitHub holds the content. Wix shows it. There are two ways to connect them, and they can run together.

| | Route A: CMS sync (recommended) | Route B: live feed |
|---|---|---|
| How | An hourly backend job copies `dist/site.json` into Wix CMS collections | Page code calls backend methods that read `dist/` from GitHub (5-minute cache) |
| Pages | Native CMS dynamic pages, datasets and repeaters, styled without code | Router pages and repeaters filled by code |
| SEO | Automatic dynamic-page URLs, meta tags and sitemap | Router SEO tags and sitemap (`routers.js`) |
| Wix Search, Forms, Stores, Bookings | Can use the CMS items directly | Need code |
| Update delay | Up to 1 hour (or run the sync by hand) | Up to 5 minutes |

Recommendation: use Route A for the programme, course, firm-type, audience and topic pages, and use the
Route B web module for the finder/search page and the module catalogue, where filtering 800+ modules in
code is simpler than in a dataset.

## 0. Repository

Merge branch `catalogue-v2` into `main`. Actions must have **Read and write** workflow permissions
(Settings → Actions → General). The URLs in `backend/*.js` point at `main`.

## 1. Backend code (Dev Mode on)

Add these files under **Backend**:

- `catalogue.web.js`: the live feed API: `getSiteIndex`, `searchCatalogue`, `getAudienceHub`, `getFirmTypePage`, `getProgramme`, `getCourse` and `getRelated`, plus the legacy `getCatalogue` and `getCourseBySlug`.
- `catalogueSync.js` and `jobs.config`: the hourly CMS sync (Route A).
- `enquiry.web.js`: saves enquiries and adds the person to Wix contacts.
- `routers.js`: only for Route B programme and course URLs.

## 2. CMS collections (Route A)

Create these collections with these exact IDs: `Programmes`, `Modules`, `Courses`, `FirmTypes`, `Audiences`,
`Roles`, `Topics` and `Enquiries`.

- **Permissions:** "Anyone can read" for the first six. `Enquiries` is admin-only.
- **First sync:** run `syncCatalogue` once from the backend test tool. Check that every field appears in each collection; if one doesn't, add it by hand.
- **Field types:** set the array fields (`audience`, `firmType`, `topics`, `deliveryFormat`, `objectives`, `syllabus`, `modules`) to **Tags** or **Array**. Set `Modules.programme` to **Reference → Programmes**.

## 3. Pages

All catalogue pages sit under the Training section of lunispartners.com, so every URL starts `/training`.

| Page | URL | How |
|---|---|---|
| Training home | `/training` | Four audience boxes from `Audiences`. Hovering (tap on mobile) reveals each audience's groups from `Roles`, each linking to its role page. Search box → `/training/find?q=` |
| Audience hub ×4 | `/training/supervisors`, `/training/firms`, `/training/government`, `/training/fius-law-enforcement` | Group tiles, then programmes grouped by `primaryTopic` (`pages/audience-hub.js`, or a `Roles` dataset filtered by audience). The Firms hub adds the firm-type map (`pages/firms-hub.js`) |
| Role page ×18 | `/training/{audience}/{role}`, e.g. `/training/firms/boards-directors`, `/training/supervisors/authorisation-licensing` | `pages/role-page.js`, or a dynamic page on `Roles` with a `Programmes` dataset filtered by `role` |
| Firm-type page ×6 | `/training/firm-types/{slug}` | Dynamic page on `FirmTypes`, three repeaters (sector, all firms, for supervisors) or `pages/firm-type.js` |
| Topic page ×16 | `/training/topics/{slug}` | Dynamic page on `Topics` with a `Programmes` dataset filtered by `topics` |
| Programme page ×123 | `/training/programme/{slug}` | Dynamic page on `Programmes` (Route A) or router page + `pages/programme-page.js` (Route B) |
| Course page | `/training/course/{slug}` | Dynamic page on `Courses` |
| Finder / module catalogue | `/training/find` | `pages/finder.js`; every filter is read from the URL so any route can deep-link into it |
| Enquire | `/training/enquire` | `pages/enquire.js` + `backend/enquiry.web.js` |

The element IDs each page needs are listed at the top of its file. `wix-code/legacy-v1/` holds the first-version pages; they are kept for reference only and are not needed for the new build.

## 4. Enquiries (phase 1) and the shop (phase 2)

**Phase 1.** Every programme and course page has a "Request this programme" button. It goes to
`/enquire?programme=<slug>&modules=1,4,7`, carrying any modules the visitor ticked. Each enquiry is saved
to `Enquiries` and the person is added to Wix contacts.

- **Notifications:** set up a Wix Automation (contact created / label added) to notify Lunis and acknowledge the enquirer. Test that this triggers as expected.

**Phase 2.** When online courses go on sale, set `bookingMode: online` and add `onlineProductUrl` in GitHub.

- **Self-paced courses:** sold through Wix Stores (digital products), or Online Programs with Pricing Plans.
- **Public dated courses:** run through Wix Bookings with `bookingMode: scheduled`.

The button switches automatically according to `bookingMode`.

## 5. Test

- Run the sync, and check the item counts: 123 programmes, 1,085 modules, 149 courses, 7 firm types, 4 audiences, 18 roles and 16 topics.
- Open `/training/find?audience=Firms&firmType=payments-e-money`.
- Open a programme page, tick two modules and send a test enquiry.
