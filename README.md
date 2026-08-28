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

### Frontmatter fields

| Field               | Type                       | Notes |
|---------------------|----------------------------|-------|
| `id`                | string                     | Unique, must match the filename |
| `slug`              | string                     | URL-friendly identifier for the course page |
| `title`             | string                     | |
| `summary`           | string                     | One or two sentence teaser for listing views |
| `audience`          | array: `Firms`, `Financial Supervisors` | Drives the site's top-level nav split. A course can be tagged for one or both. |
| `pillar`            | string                     | Single pillar from the Lunis training taxonomy. Drives the nav submenu under each audience. Taxonomy is still being finalised, so this isn't yet a fixed enum — keep values consistent across courses. |
| `clientType`        | array: `Regulated Firm`, `Regulatory Authority` | Independent filter tag (separate from `audience`) |
| `businessFunction`  | array of strings          | Independent filter tag, multi-select. Open-ended — see below for the current draft list |
| `deliveryFormat`    | array: `In-person`, `Online`, `Hybrid` | Multi-select |
| `durationValue`     | number                    | e.g. `2` |
| `durationUnit`      | string: `hours`, `days`, `weeks` | |
| `instructor`        | string (optional)         | |
| `image`             | string (optional)         | URL or repo-relative path |
| `active`            | boolean                   | Set `false` to retire a course without deleting it |
| `lastUpdated`       | string, `YYYY-MM-DD` (optional) | Quote the value (`lastUpdated: "2026-08-01"`) — otherwise YAML parses it as a date object rather than a string |

### Business function — current draft list

Not yet final. Add new values as needed; keep spelling/casing consistent
with existing courses when reusing one.

Core: `Policy`, `Compliance`, `Finance`, `Supervision`, `Enforcement`,
`Authorisations`, `Strategy`, `Risk Management`, `Legal`, `Internal Audit`,
`Financial Crime`, `Governance`, `Operational Resilience`,
`Conduct & Culture`

Firm-specific: `Treasury`, `Prudential Risk`, `Client Money & Assets`,
`Product Governance`, `Trading & Markets`, `Credit Risk`,
`Third-Party & Outsourcing Oversight`

Authority-specific: `Consumer Protection`, `Registration & Licensing`,
`Financial Stability`, `International Affairs`

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

## Roadmap

The live sync mechanism (how the Wix site fetches and caches this repo's
content, and how it builds the audience/pillar nav dynamically) is being
worked out with the site's developer and isn't implemented in this repo —
this repo's job is just to be a well-structured, validated source of truth.
