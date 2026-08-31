# Lunis catalogue — Wix/Velo installation

This package reads the current GitHub branch:

`claude/coding-help-lsmkts`

## 1. Add the generated feed to GitHub

Copy these repository-side changes into the branch and commit them:

- `scripts/build-catalogue.js`
- the `package.json`, workflow and README changes
- generated `dist/catalogue.json`

Run `npm install` and `npm run validate` before committing. On every push to
`main` or `claude/coding-help-lsmkts`, the workflow rebuilds and commits the
feed automatically. Wix refreshes its backend cache every five minutes, so no
Wix edit or republish is required after a catalogue change.

The repository's **Settings → Actions → General → Workflow permissions** must
allow **Read and write permissions**. If the target branch is protected, its
rules must also permit GitHub Actions to push the generated feed commit.

## 2. Add the backend web module

In Wix Studio or the Wix Editor, enable Dev Mode. Under **Backend**, create a
web module named `catalogue.web.js` and paste in:

`wix-code/backend/catalogue.web.js`

The backend caches the single GitHub JSON response for five minutes. No GitHub
token is needed because the repository is public.

## 3. Create the Catalogue page

Create a page with URL slug `catalogue` and paste
`wix-code/pages/catalogue.js` into its page code.

Add these page elements with exactly these IDs:

| Element | ID | Notes |
| --- | --- | --- |
| Input | `searchInput` | Search box |
| Dropdown | `audienceDropdown` | Options supplied by code |
| Dropdown | `pillarDropdown` | Options supplied by code |
| Dropdown | `trackDropdown` | Options supplied by code |
| Dropdown | `clientTypeDropdown` | Options supplied by code |
| Dropdown | `businessFunctionDropdown` | Options supplied by code |
| Dropdown | `deliveryFormatDropdown` | Options supplied by code |
| Dropdown | `durationDropdown` | Options supplied by code |
| Button | `clearFiltersButton` | Clear all filters |
| Button | `cardsButton` | Card view |
| Button | `tableButton` | Table view |
| Text | `resultCount` | Matching-course count |
| Text | `loadingText` | Initially visible |
| Text | `errorText` | Initially collapsed |
| Text | `noResultsText` | Initially collapsed |
| Box | `resultsBox` | Contains the repeater and table |
| Repeater | `courseRepeater` | Card results |
| Table | `courseTable` | Table results; initially collapsed |

Inside each repeater card add:

- `cardTitle` — text
- `cardSummary` — text
- `cardPillar` — text
- `cardTrack` — text
- `cardDuration` — text
- `cardFormat` — text
- `cardButton` — button

Configure the table columns with these field keys:

| Heading | Field key |
| --- | --- |
| Course | `title` |
| Pillar | `pillar` |
| Track | `track` |
| Format | `deliveryFormat` |
| Duration | `duration` |

The hidden `slug` value remains on each row and is used to open the detail
page. Start with card view: set `courseTable` to **Collapsed on load**.

## 4. Create the Course page

Create a normal page with URL slug `course` and paste
`wix-code/pages/course-detail.js` into its page code. Course links use the form:

`/course?slug=business-model-analysis`

Add these elements with exactly these IDs:

| Element | ID |
| --- | --- |
| Text | `loadingText` |
| Text | `errorText` |
| Box | `courseContent` |
| Text | `courseTitle` |
| Text | `courseSummary` |
| Text | `coursePillar` |
| Text | `courseTrack` |
| Text | `courseAudience` |
| Text | `courseClientType` |
| Text | `courseFunction` |
| Text | `courseFormat` |
| Text | `courseDuration` |
| Text | `courseInstructor` |
| Rich Text | `aimContent` |
| Rich Text | `audienceContent` |
| Rich Text | `objectivesContent` |
| Rich Text | `syllabusContent` |
| Rich Text | `structureContent` |
| Rich Text | `priorKnowledgeContent` |

Set `courseContent` and `errorText` to **Collapsed on load**. Keep
`loadingText` visible on load.

## 5. Publish and test

Test both page layouts on desktop and mobile. Suggested test URL:

`/course?slug=business-model-analysis`

When the catalogue branch is later merged to `main`, change the branch segment
in `CATALOGUE_URL` in `catalogue.web.js` from
`claude/coding-help-lsmkts` to `main`.
