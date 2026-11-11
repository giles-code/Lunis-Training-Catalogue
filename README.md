# Lunis Training Catalogue

The single source of truth for the Lunis Training catalogue. Every programme and every module is one Markdown
file: short fields at the top, written sections below. GitHub checks the files and builds the website feed in
`dist/`; the Lunis website reads that feed, so editing a file here is all it takes to update the site.

## What is in the repository

```
programmes/   Programmes (141). Each is made up of modules, linked from the module files.
modules/      Modules (1,416). Every module is bookable on its own and may also belong to one or more
              programmes. active: false keeps a module or programme off the website.
taxonomy/     Reference lists: client types, pillars (per client type), levels, topics, roles, firm types,
              business functions.
schema/       entry.schema.json: the fields allowed at the top of every file.
scripts/      validate.js (checks everything), build-catalogue.js (builds dist/), lib.js (shared).
images/       Picture for each entry, named <id>.webp. Picked up automatically.
brochures/    PDF brochure for each entry, named <id>.pdf. Picked up automatically.
dist/         Generated website feed. Never edit by hand.
wix-code/     Old Wix Velo code from the first design. Not used by the current headless site.
```

## The fields

Required on every entry:

| Field | What it holds |
|---|---|
| `id` | Permanent number, shared by programmes and modules. Never reused or changed. Opens the page: `training-catalogue.html?id=<id>`. New entries take the next unused number. |
| `entryType` | `programme` or `module` (must match the folder) |
| `title` | Full name (max 120 characters) |
| `summary` | One or two sentences for the catalogue card (max 300 characters) |
| `clientType` | One or more of `firms`, `payments`, `crypto`, `regulators`, `government` (the five "Training for" boxes) |
| `pillar` | One pillar for each client type, from that client type's list in `taxonomy/pillars.json`, e.g. `{"regulators": "Sector Programmes", "firms": "Emerging Risks & Technology"}` |
| `deliveryFormat` | One or more of `In-person`, `Online`, `Hybrid` |
| `durationValue`, `durationUnit` | Length: a number and `hours`, `days` or `weeks`. For a programme, the total |
| `active` | `true` shows it on the site; `false` hides it everywhere |
| `level` | Required on programmes: `Foundation`, `Intermediate`, `Advanced` or `Board level`. Modules without one take their programme's |

Optional:

| Field | What it holds |
|---|---|
| `partOf` | Modules only: the programme(s) the module belongs to and its number in each, e.g. `[{"programme": 315, "module": 5}]`. Programme module lists and module counts are built from these links |
| `intro` | Programmes: the longer lead paragraph under the title (falls back to `summary`) |
| `topic` | Free text subject label |
| `tags` | Short subject labels for search, the tag filter and related training |
| `hoursPerModule` | Programmes: typical hours per module (otherwise total ÷ modules) |
| `related` | IDs to show under "Go further" (otherwise worked out from tags, pillar and topic) |
| `lastUpdated` | Date |
| `contentGaps` | Internal notes on content still to be confirmed. Not shown on the site |
| `businessFunction`, `role`, `firmType` | Carried over from the October catalogue; under review |
| `legacySlug` | Internal: the old web address name for files renamed after publishing, so old links still redirect |

`image` and `brochure` are added by the build when `images/<id>.webp` or `brochures/<id>.pdf` exists.

## Written sections

`##` headings, in this order. Bullet lists are kept as lists on the website.

| Section | Programmes | Modules |
|---|---|---|
| Aim and Purpose | required | required |
| What It Covers | optional | |
| Intended Audience (bullets) | required | optional: taken from the programme if blank |
| Learning Objectives (bullets) | required | required |
| Syllabus (bullets) | | recommended |
| Structure and Format | required | optional |
| Useful Prior Knowledge and Experience | required | optional: taken from the programme if blank |
| Materials | optional | optional |
| Core Reading (bullets) | optional | optional: taken from the programme if blank |
| Modules Intro | optional | |

## Adding or changing an entry

1. Copy an existing file in `programmes/` or `modules/`. Give it the next unused `id`. Name the file after
   the title (lowercase, hyphens). Never rename a published file: the name is used to redirect old links.
2. To put a module in a programme, add `{"programme": <programme id>, "module": <number>}` to its `partOf`.
   Module numbers in a programme must run 1, 2, 3 … with no gaps.
3. Check locally, or let GitHub do it on push:

   ```
   npm ci
   npm run validate
   npm run build:catalogue
   ```

4. GitHub validates every push and pull request, then rebuilds `dist/` and commits it.

## Website feed

- `dist/index.json`: the reference lists and one card per active entry (no long text). Read by the
  catalogue, filters and counts.
- `dist/items/<id>.json`: everything about one entry, with the written sections, the programme's ordered
  module list, the module's resolved programme(s) (`partOf`), related entries, and values inherited from the
  programme. Read by the programme and module pages.
