# Images

One picture per entry, named `<id>.webp`. The build adds `image: "images/<id>.webp"` to an entry's feed record
whenever the file exists, so there is no field to type by hand.

## Module illustrations 1–191 (added 22 November 2026)

- 191 flat editorial illustrations, 1536 × 1024 (3:2), WebP quality 88, made from the house-style picture brief.
- Source: `Lunis-Training-Website-WebP.zip`. The PNG originals are kept by Giles outside the repository.
- `source-manifest-module-illustrations.json` is the packager's manifest (source ID, briefed title, SHA-256 of each
  PNG and WebP). It is a record only. It is not read by the build and is not the catalogue.

### Mapping: source ID → catalogue ID

Every source ID equals the catalogue ID (1 → 1 … 191 → 191). The images were briefed against the 191 modules that
received permanent IDs 1–191 on 11 November, and those IDs are unchanged in catalogue v3. Checked against ID and
title together, all 191 IDs match.

These titles changed after the brief. They are the same records (confirmed by `legacySlug`, or the unchanged file
name for ID 12), so the image stays with the ID:

| ID | Title in the brief | Current title |
|---|---|---|
| 12 | AML Package and Its Implications for Supervisors | AML Reforms and Their Implications for Supervisors |
| 15 | Anti-Money Laundering Courses (e.g. Thomson Reuters) | Anti-Money Laundering Courses |
| 18 | Assessing Capital Adequacy: ICAAP in Practice | Assessing Capital Adequacy: Internal Capital Assessment in Practice |
| 20 | Assessing Liquidity Adequacy: ILAAP in Practice | Assessing Liquidity Adequacy: Internal Liquidity Assessment in Practice |
| 22 | Bank Governance and the SREP | Bank Governance and the Supervisory Review and Evaluation Process |
| 37 | Compliance Outcomes-Based Supervision (COBS) | Outcomes-Based Compliance Supervision |
| 112 | LEAP | Leadership Development Programme |
| 161 | Security Awareness Training (e.g. KnowBe4) | Security Awareness Training |
| 166 | Solvency II in Practice | Risk-Based Solvency Regimes in Practice |

Eleven other titles only gained the suffix "(EU Edition)": 13, 21, 59, 124, 130, 131, 133, 146, 168, 176, 179.
Unresolved: none. Retired: none.

42 of the 191 are `active: false` (for example, banking, insurance, pensions and internal-operations modules).
Their images are stored, but they are not in the feed until the module is switched back on.

Programmes and modules from ID 192 onwards have no picture yet. The website keeps its existing fallback for them.
