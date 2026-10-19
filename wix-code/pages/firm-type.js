// Firm-type page (dynamic: /training/firm-types/<slug>, e.g. /training/firm-types/payments-e-money). With Route A make this a CMS dynamic page on
// FirmTypes and replace getFirmTypePage with dataset filters. Elements: #ftTitle, #ftDescription, #roleTags,
// #sectorRepeater, #crossRepeater, #supervisorRepeater (each with #cardTitle, #cardSummary, #cardMeta, #cardButton), #sectorEmpty.
import wixLocationFrontend from 'wix-location-frontend';
import { getFirmTypePage, getSiteIndex } from 'backend/catalogue.web';

let slug;
$w.onReady(async () => {
  slug = wixLocationFrontend.path[wixLocationFrontend.path.length - 1];
  const { taxonomy } = await getSiteIndex();
  $w('#roleTags').options = [{ label: 'Everyone', value: '' }, ...taxonomy.roles.find((g) => g.audience === 'Firms').roles.map((r) => ({ label: r.name, value: r.name }))];
  $w('#roleTags').onChange(render);
  ['#sectorRepeater', '#crossRepeater', '#supervisorRepeater'].forEach((id) => $w(id).onItemReady(($i, p) => {
    $i('#cardTitle').text = p.title;
    $i('#cardSummary').text = p.summary;
    $i('#cardMeta').text = `${p.moduleCount} modules · ${p.durationValue} hrs${p.edition !== 'International' ? ` · ${p.edition} edition` : ''}`;
    $i('#cardButton').link = p.url;
  }));
  render();
});

async function render() {
  const role = ($w('#roleTags').value || [])[0] || '';
  const page = await getFirmTypePage(slug, role);
  if (!page) return wixLocationFrontend.to('/training/firms');
  $w('#ftTitle').text = page.firmType.name;
  $w('#ftDescription').text = page.firmType.description;
  const data = (list) => list.map((p) => ({ ...p, _id: p.id }));
  $w('#sectorRepeater').data = data(page.sector);
  page.sector.length ? $w('#sectorEmpty').collapse() : $w('#sectorEmpty').expand();
  $w('#crossRepeater').data = data(page.crossSector);
  $w('#supervisorRepeater').data = data(page.forSupervisors);
}
