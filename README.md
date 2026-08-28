# Lunis Training Catalogue

Structured content store for the Lunis training course catalogue. Each course
is a single JSON file validated against a shared schema, designed so its
fields map directly onto filterable fields (category, level, format, tags,
etc.) when synced into a Wix Collection for the public course catalogue page.

## Structure

```
courses/    One JSON file per course, named <id>.json
schema/     JSON Schema the course files are validated against
scripts/    Validation tooling
```

## Adding or editing a course

1. Copy an existing file in `courses/` as a starting point, or create a new
   one named `<id>.json` (lowercase, hyphen-separated, matching the course's
   `id` field).
2. Fill in the fields described in `schema/course.schema.json`. Required
   fields: `id`, `slug`, `title`, `summary`, `category`, `level`, `format`,
   `durationValue`, `durationUnit`, `tags`, `active`.
3. Run validation locally before committing:

   ```
   npm install
   npm run validate
   ```

4. Open a pull request. CI runs the same validation on every push and PR.

## Field notes

- `id` must be unique and must match the filename (without `.json`).
- `slug` is the URL-friendly identifier used for the course's page.
- `level` must be one of: `Beginner`, `Intermediate`, `Advanced`, `All Levels`.
- `format` must be one of: `In-person`, `Online`, `Hybrid`.
- `tags` is a free-form array used for search and secondary filtering.
- `active` controls whether a course should appear in the published catalogue
  — set to `false` to retire a course without deleting its history.

## Roadmap

Syncing this data into the live Wix site (via CSV export or a Velo/Wix Data
API integration) is a follow-up step, not yet implemented here.
