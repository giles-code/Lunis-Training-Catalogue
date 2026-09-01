# Lunis Training Catalogue

Structured content store for the Lunis training course catalogue. Each course
is a single Markdown file with YAML frontmatter, validated against a shared
schema. This repo is the single source of truth for the catalogue — the
Lunis Partners website reads course content directly from here (via GitHub,
on a short cache rather than a manual rebuild), so editing or adding a `.md`
file is enough to update the live site.

## Structure

```
courses/    One Markdown file per course, named <id>.md
schema/     JSON Schema the course frontmatter is validated against
taxonomy/   Reference lists (e.g. business functions) used by validation
scripts/    Validation tooling
```

## Course file format

Each course file has YAML frontmatter (the structured, filterable/navigable
fields) followed by a Markdown body split into six required `##` section
headings, in this order:

1. `Aim and Purpose`
2. `Intended Audience`
3. `Learning Objectives`
4. `Syllabus`
5. `Structure and Format`
6. `Useful Prior Knowledge and Experience`

See any file in `courses/` for a worked example.

Note: the `Intended Audience` section describes the **seniority level of
staff** the course is aimed at (e.g. junior analyst, manager, senior
leadership) — this is separate from the `audience` frontmatter field below,
which is about site navigation (Firms vs. Financial Supervisors), not
seniority.

### Frontmatter fields

| Field               | Type                       | Notes |
|---------------------|----------------------------|-------|
| `id`                | string                     | Unique, must match the filename |
| `slug`              | string                     | URL-friendly identifier for the course page |
| `title`             | string                     | |
| `summary`           | string                     | One or two sentence teaser for listing views |
| `audience`          | array: `Firms`, `Financial Supervisors` | Drives the site's top-level nav split. A course can be tagged for one or both. |
| `pillar`            | string                     | Single pillar from the Lunis training taxonomy — see `taxonomy/pillars.json`. Drives the nav submenu under each audience. |
| `track`             | string                     | Finer-grained programme within the pillar — see `taxonomy/tracks.json`. Each track belongs to exactly one pillar; validation checks the two agree. |
| `clientType`        | array: `Regulated Firm`, `Regulatory Authority` | Independent filter tag (separate from `audience`) |
| `businessFunction`  | array of strings          | Independent filter tag, multi-select. Values and their `clientType` scope are defined in `taxonomy/business-functions.json` — see below |
| `deliveryFormat`    | array: `In-person`, `Online`, `Hybrid` | Multi-select |
| `durationValue`     | number                    | e.g. `2` |
| `durationUnit`      | string: `hours`, `days`, `weeks` | |
| `instructor`        | string (optional)         | |
| `image`             | string (optional)         | URL or repo-relative path |
| `active`            | boolean                   | Set `false` to retire a course without deleting it |
| `lastUpdated`       | string, `YYYY-MM-DD` (optional) | Quote the value (`lastUpdated: "2026-08-01"`) — otherwise YAML parses it as a date object rather than a string |
| `contentGaps`       | array of strings (optional) | Machine-readable flags for content that's inferred/placeholder rather than confirmed — see below |

### Business function taxonomy

`businessFunction` values are defined in
[`taxonomy/business-functions.json`](taxonomy/business-functions.json), not
as a free-standing enum in the schema. Each entry names which `clientType`(s)
it applies to:

```json
{ "name": "Enforcement", "appliesTo": ["Regulatory Authority"] }
```

`npm run validate` checks every course's `businessFunction` values against
this file, and rejects a course that uses a function outside its own
`clientType` — e.g. a course tagged `clientType: [Regulated Firm]` can't use
`Enforcement`, since that function's `appliesTo` is Regulatory Authority
only. Some functions (e.g. `Policy`, `Compliance`, `Risk Management`) apply
to both and can be used regardless of `clientType`.

To add a new business function, add an entry to
`taxonomy/business-functions.json` with its `appliesTo` scope, then use it
in a course.

### Pillar and track taxonomy

`pillar` (4 values) and `track` (the finer-grained programme within it, ~30
values) come from the Lunis Training *Supervisory Training Framework &
Master Catalogue*, and are defined in `taxonomy/pillars.json` and
`taxonomy/tracks.json` respectively. `npm run validate` checks every
course's `pillar` and `track` exist in these files and agree with each
other (a track's own `pillar` field must match the course's `pillar`).

This taxonomy currently only covers the Financial Supervisors / Regulatory
Authority side of the catalogue — the equivalent Firms-side pillar/track
taxonomy doesn't exist yet and will need adding when that content arrives.

### `contentGaps` and `active`

Courses imported in bulk from source documents that don't state every
field (e.g. a catalogue that never specifies staff seniority or delivery
channel) carry a `contentGaps` array naming exactly what was inferred or
defaulted rather than sourced — e.g. `"deliveryFormat: not stated in
source catalogue; defaulted to In-person pending confirmation"`. Search
for `contentGaps` across `courses/` to find everything still needing
review.

Courses built from only a one-line source summary (no session plan,
syllabus, or duration) are set `active: false` so they don't appear on the
live site until someone has written up real content — flip to `true` once
that's done. Courses with a full or delivered-workshop source are `active:
true` even though some fields (typically `Intended Audience` and `Useful
Prior Knowledge and Experience`, which no source document in this
catalogue states explicitly) are still inferred and flagged.

## Adding or editing a course

1. Copy an existing file in `courses/` as a starting point, or create a new
   one named `<id>.md` (lowercase, hyphen-separated, matching the course's
   `id` field).
2. Fill in the frontmatter fields above and the six body sections.
3. Run validation locally before committing:

   ```
   npm install
   npm run validate
   ```

4. Open a pull request. CI runs the same validation on every push and PR.

5. Optionally rebuild the single-file website feed locally when previewing a
   change:

   ```
   npm run build:catalogue
   ```

   On every push to `main` or `claude/coding-help-lsmkts`, GitHub Actions
   validates all course files, rebuilds `dist/catalogue.json`, and commits the
   updated feed automatically. The Wix site fetches this one generated file
   instead of making one GitHub API request per course. Its five-minute backend
   cache means catalogue changes normally appear on Wix within five minutes of
   the automated feed commit, without editing or republishing Wix.

## Roadmap

The live sync mechanism (how the Wix site fetches and caches this repo's
content, and how it builds the audience/pillar nav dynamically) is being
worked out with the site's developer and isn't implemented in this repo —
this repo's job is just to be a well-structured, validated source of truth.
