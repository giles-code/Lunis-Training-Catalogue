// Audience hub (URLs /training/supervisors, /training/firms, /training/government, /training/fius-law-enforcement). One template for all four.
// Top: the audience's four role tiles. Below: programmes grouped by primary topic.
// The Firms hub adds the firm-type map (see firms-hub.js; both can run on the same page).
// Elements: #hubTitle, #hubIntro, #roleRepeater (inside: #roleTitle, #roleDescription, #roleCount, #roleButton),
// #topicRepeater (inside: #topicTitle, #topicProgrammes repeater with #cardTitle, #cardSummary, #cardButton), #finderButton.
import wixLocationFrontend from 'wix-location-frontend';
import { getAudienceHub } from 'backend/catalogue.web';

$w.onReady(async () => {
  // URL /training/<audience>: the audience slug is the last path segment.
  const slug = wixLocationFrontend.path[wixLocationFrontend.path.length - 1];
  const hub = await getAudienceHub(slug);
  if (!hub) return wixLocationFrontend.to('/training');
  $w('#hubTitle').text = hub.audience.label;
  $w('#hubIntro').text = hub.audience.description;

  $w('#roleRepeater').onItemReady(($i, r) => {
    $i('#roleTitle').text = r.name;
    $i('#roleDescription').text = r.description;
    $i('#roleCount').text = `${r.programmes} programme${r.programmes === 1 ? '' : 's'}${r.courses ? ` · ${r.courses} courses` : ''}`;
    $i('#roleButton').link = r.url;
  });
  $w('#roleRepeater').data = hub.roles.map((r) => ({ ...r, _id: r.slug }));

  $w('#topicRepeater').onItemReady(($i, t) => {
    $i('#topicTitle').text = t.topic;
    $i('#topicProgrammes').onItemReady(($c, p) => {
      $c('#cardTitle').text = p.title;
      $c('#cardSummary').text = p.summary;
      $c('#cardButton').link = p.url;
    });
    $i('#topicProgrammes').data = t.items.map((p) => ({ ...p, _id: p.id }));
  });
  $w('#topicRepeater').data = Object.keys(hub.byTopic).sort().map((t) => ({ _id: t.replace(/[^a-z0-9]+/gi, '-'), topic: t, items: hub.byTopic[t] }));
  $w('#finderButton').link = `/training/find?audience=${encodeURIComponent(hub.audience.key)}`;
});
