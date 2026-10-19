# Lunis Training Catalogue

The single source of truth for the Lunis Training catalogue. Every programme and course is one Markdown
file with YAML frontmatter. GitHub Actions validates the files and builds a JSON feed in `dist/`, and the
Lunis website (Wix Studio) reads that feed, so editing a file here is all it takes to update the site.

## What is in the repository

```
programmes/   123 multi-module programmes, one file each (<slug>.md). Modules live inside the file.
courses/      Standalone courses (<slug>.md). active: false keeps a course off the website.
taxonomy/     Controlled lists: audiences, roles (4 per audience), firm types, topics, editions, levels,
              pillars, tracks and business functions.
schema/       JSON Schemas for programme and course frontmatter.
scripts/      validate.js (checks everything) and build-catalogue.js (builds dist/).
dist/         Generated website feed. Never edit by hand.
wix-code/     Velo code for the Wix site. See wix-code/INSTALL.md.
```

## How content is organised

Every item carries the same set of tags, so the website can offer many ways in to the same content.

| Field | Values | Used for |
|---|---|---|
| `audience` | Internal keys: Financial Supervisors, Firms, Government & Policymakers, FIUs & Law Enforcement. Shown on the site as Financial Regulators & Supervisors, Financial Services Firms, Government & Policymakers, Financial Intelligence Units & Law Enforcement (labels in `taxonomy/audiences.json`) | The four audience hubs and the main menu |
| `firmType` | Investment Funds & Asset Management; Investment Firms & Wealth Management; Market Infrastructure & Trading Venues; Payments & E-Money; Crypto-Assets & Digital Money; FinTech & Big Tech; All firm types | The firm-type map on the Firms page. On supervisor content it means the sector supervised |
| `role` | Groups inside each audience (18 in all: six for regulators, four for each other audience, listed in `taxonomy/roles.json`), e.g. Boards & directors, Control function holders, Supervisors & inspectors, FIU analysts. A list: one item can serve several | The group tiles on each audience hub and the 18 role pages |
| `topics` | 16 topics, first one is primary | Topic chips and topic pages |
| `edition` | International (default), EU, Regional | Jurisdiction filter. EU and Regional editions name their International counterpart |
| `level` | Foundation, Intermediate, Advanced, Board level | Filter |
| `bookingMode` | enquiry (now), scheduled, online (later), none | What the call-to-action button does |
| `pillar`, `track` | Lunis training framework | Internal structure and advanced filters |

Programmes also carry `intro`, `moduleCount`, `hoursPerModule`, `durationValue`, `deliveryFormat`,
`delivered` (Lunis has delivered this content; never names clients), `internationalCounterpart` and `brochure`.

## Programme file format

Frontmatter, then these `##` sections in order: Aim and Purpose, Intended Audience, Learning Objectives,
Syllabus, Structure and Format, Useful Prior Knowledge and Experience, and optionally Core Reading.

Inside **Syllabus**, each module is a block:

```
### Module 3: Safeguarding Client Funds

One-sentence overview.

**Objectives**

- Three objectives

**Syllabus**

- Four syllabus lines
```

The build turns these blocks into structured modules with stable IDs (`<programme-slug>--m03`). Every module
appears on its programme page and in the searchable module catalogue.

Course files use the same six sections without the module blocks.

## Editing

1. Edit or add a file in `programmes/` or `courses/` (file name = `id`).
2. Run `npm install` once, then `npm run validate` and `npm run build:catalogue` to preview.
3. Commit (or open a pull request). On every push to `main`, GitHub Actions validates the files, rebuilds
   `dist/` and commits it. The website picks the change up within the hour (CMS sync) or within five
   minutes (live feed).

To retire an item without deleting it, set `active: false`. Changing a slug changes its web address, so
avoid doing it after launch.

## The feed (`dist/`)

| File | Contents | Used by |
|---|---|---|
| `index.json` | Taxonomy, counts, and light cards for all programmes, modules and courses | Hubs, finder, search |
| `programmes/<slug>.json` | One full programme with section HTML and structured modules | Programme pages |
| `courses/<slug>.json` | One full course | Course pages |
| `site.json` | Everything, as Markdown text | The hourly Wix CMS sync |
| `catalogue.json` | Legacy v1 feed (courses only) | The first-version Wix pages, until they are replaced |
