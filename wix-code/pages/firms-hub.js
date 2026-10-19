// Financial Services Firms hub (URL /training/firms). Shows the firm-type map and the "who in the firm" routes.
// Elements: #firmTypeRepeater (inside: #ftTitle, #ftDescription, #ftCount, #ftButton),
//           #roleRepeater (inside: #roleTitle, #roleButton), #allFirmsButton.
import { getSiteIndex } from 'backend/catalogue.web';

$w.onReady(async () => {
  const { taxonomy, counts } = await getSiteIndex();
  $w('#firmTypeRepeater').onItemReady(($i, f) => {
    $i('#ftTitle').text = f.name;
    $i('#ftDescription').text = f.description;
    const c = counts.byFirmType[f.name].firmProgrammes;
    $i('#ftCount').text = `${c} sector programme${c === 1 ? '' : 's'} + ${counts.byFirmType['All firm types'].firmProgrammes} for all firms`;
    $i('#ftButton').link = `/training/firm-types/${f.slug}`;
  });
  $w('#firmTypeRepeater').data = taxonomy.firmTypes.filter((f) => f.slug !== 'all-firms').map((f) => ({ ...f, _id: f.slug }));
  $w('#roleRepeater').onItemReady(($i, r) => {
    $i('#roleTitle').text = r.name;
    $i('#roleButton').link = `/training/firms/${r.slug}`;
  });
  $w('#roleRepeater').data = taxonomy.roles.find((g) => g.audience === 'Firms').roles.map((r) => ({ ...r, _id: r.slug }));
  $w('#allFirmsButton').link = '/training/find?audience=Firms';
});
