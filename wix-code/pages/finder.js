// Finder page (URL /training/find). One page serves many entry routes because every filter can be set from the URL:
//   /training/find?audience=Firms&firmType=payments-e-money&role=boards-directors  (role = a slug from taxonomy/roles.json)&topic=financial-crime&edition=EU&q=safeguarding&view=modules
// Elements: #searchInput, #audienceDropdown, #firmTypeDropdown, #roleDropdown, #topicDropdown, #editionDropdown,
// #levelDropdown, #viewTabs (selection tags: Programmes / Modules / Courses), #resultCount, #resultsRepeater
// (inside: #itemType, #itemTitle, #itemSummary, #itemMeta, #itemButton), #loadMoreButton, #clearButton, #noResults.
import wixLocationFrontend from 'wix-location-frontend';
import { getSiteIndex, searchCatalogue } from 'backend/catalogue.web';

const PAGE = 30;
let T; let shown = PAGE;

$w.onReady(async () => {
  const { taxonomy } = await getSiteIndex();
  T = taxonomy;
  const opts = (all, list, value = (x) => x.name, label = (x) => x.name) => [{ label: all, value: '' }, ...list.map((x) => ({ label: label(x), value: value(x) }))];
  $w('#audienceDropdown').options = opts('All audiences', T.audiences, (a) => a.key, (a) => a.label);
  $w('#firmTypeDropdown').options = opts('All firm types', T.firmTypes.filter((f) => f.slug !== 'all-firms'), (f) => f.slug);
  const ALLROLES = T.roles.flatMap((g) => g.roles.map((r) => ({ ...r, audience: g.audience })));
  const roleOptions = () => {
    const a = $w('#audienceDropdown').value;
    $w('#roleDropdown').options = opts('Any role', ALLROLES.filter((r) => !a || r.audience === a), (r) => r.slug);
  };
  T.allRoles = ALLROLES;
  roleOptions();
  $w('#audienceDropdown').onChange(() => { roleOptions(); $w('#roleDropdown').value = ''; });
  $w('#topicDropdown').options = opts('All topics', T.topics, (t) => t.slug);
  $w('#editionDropdown').options = opts('All editions', T.editions);
  $w('#levelDropdown').options = opts('All levels', T.levels);
  $w('#viewTabs').options = [{ label: 'Programmes', value: 'Programme' }, { label: 'Modules', value: 'Module' }, { label: 'Courses', value: 'Course' }];

  const q = wixLocationFrontend.query;
  $w('#searchInput').value = q.q || '';
  $w('#audienceDropdown').value = q.audience || '';
  roleOptions();
  $w('#firmTypeDropdown').value = q.firmType || '';
  $w('#roleDropdown').value = q.role || '';
  $w('#topicDropdown').value = q.topic || '';
  $w('#editionDropdown').value = q.edition || '';
  $w('#levelDropdown').value = q.level || '';
  $w('#viewTabs').value = [{ modules: 'Module', courses: 'Course' }[q.view] || 'Programme'];

  ['#audienceDropdown', '#firmTypeDropdown', '#roleDropdown', '#topicDropdown', '#editionDropdown', '#levelDropdown', '#viewTabs']
    .forEach((id) => $w(id).onChange(() => { shown = PAGE; run(); }));
  let t; $w('#searchInput').onInput(() => { clearTimeout(t); t = setTimeout(() => { shown = PAGE; run(); }, 250); });
  $w('#loadMoreButton').onClick(() => { shown += PAGE; run(); });
  $w('#clearButton').onClick(() => wixLocationFrontend.to('/training/find'));

  $w('#resultsRepeater').onItemReady(($item, x) => {
    $item('#itemType').text = x.format === 'Module' ? `Module ${x.number} of ${x.programmeTitle}` : x.format;
    $item('#itemTitle').text = x.title;
    $item('#itemSummary').text = x.summary || '';
    $item('#itemMeta').text = [x.moduleCount && `${x.moduleCount} modules`, x.edition !== 'International' && `${x.edition} edition`, x.level].filter(Boolean).join(' · ');
    $item('#itemButton').link = x.url;
  });
  run();
});

async function run() {
  const fs = $w('#firmTypeDropdown').value;
  const role = $w('#roleDropdown').value;
  const topic = $w('#topicDropdown').value;
  const filters = {
    q: $w('#searchInput').value.trim(),
    audience: $w('#audienceDropdown').value || (role ? T.allRoles.find((r) => r.slug === role).audience : fs ? 'Firms' : ''),
    firmType: fs ? T.firmTypes.find((f) => f.slug === fs).name : '',
    role: role ? T.allRoles.find((r) => r.slug === role).name : '',
    topic: topic ? T.topics.find((x) => x.slug === topic).name : '',
    edition: $w('#editionDropdown').value,
    level: $w('#levelDropdown').value,
    kinds: $w('#viewTabs').value,
  };
  const { total, items } = await searchCatalogue(filters, shown, 0);
  $w('#resultCount').text = `${total} result${total === 1 ? '' : 's'}`;
  $w('#resultsRepeater').data = items.map((x) => ({ ...x, _id: x.id }));
  total ? $w('#noResults').collapse() : $w('#noResults').expand();
  total > shown ? $w('#loadMoreButton').expand() : $w('#loadMoreButton').collapse();
}
