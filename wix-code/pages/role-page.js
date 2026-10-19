// Role page (dynamic URL /training/<audience>/<role>, e.g. /training/firms/boards-directors,
// /training/supervisors/new-joiners). One template for every group.
// Elements: #roleTitle, #roleDescription, #audienceLink, #siblingTags (selection tags: the other three roles),
// #topicRepeater (inside: #topicTitle, #topicProgrammes repeater with #cardTitle, #cardSummary, #cardMeta, #cardButton),
// #coursesRepeater (inside: #courseTitle, #courseButton), #coursesBox, #finderButton.
import wixLocationFrontend from 'wix-location-frontend';
import { getRolePage } from 'backend/catalogue.web';

$w.onReady(async () => {
  // URL /training/<audience>/<role>: take the last two path segments.
  const [audienceSlug, roleSlug] = wixLocationFrontend.path.slice(-2);
  const page = await getRolePage(audienceSlug, roleSlug);
  if (!page) return wixLocationFrontend.to(`/training/${audienceSlug || ''}`);
  $w('#roleTitle').text = page.role.name;
  $w('#roleDescription').text = page.role.description;
  $w('#audienceLink').label = page.audience.label;
  $w('#audienceLink').link = `/training/${page.audience.slug}`;
  $w('#siblingTags').options = page.siblings.map((r) => ({ label: r.name, value: r.slug }));
  $w('#siblingTags').value = [page.role.slug];
  $w('#siblingTags').onChange((e) => {
    const next = (e.target.value || []).find((v) => v !== page.role.slug);
    if (next) wixLocationFrontend.to(`/training/${page.audience.slug}/${next}`);
  });

  $w('#topicRepeater').onItemReady(($i, t) => {
    $i('#topicTitle').text = t.topic;
    $i('#topicProgrammes').onItemReady(($c, p) => {
      $c('#cardTitle').text = p.title;
      $c('#cardSummary').text = p.summary;
      $c('#cardMeta').text = `${p.moduleCount} modules · ${p.durationValue} hrs${p.edition !== 'International' ? ` · ${p.edition} edition` : ''}`;
      $c('#cardButton').link = p.url;
    });
    $i('#topicProgrammes').data = t.items.map((p) => ({ ...p, _id: p.id }));
  });
  $w('#topicRepeater').data = Object.keys(page.byTopic).sort().map((t) => ({ _id: t.replace(/[^a-z0-9]+/gi, '-'), topic: t, items: page.byTopic[t] }));

  if (page.courses.length) {
    $w('#coursesRepeater').onItemReady(($i, c) => { $i('#courseTitle').text = c.title; $i('#courseButton').link = c.url; });
    $w('#coursesRepeater').data = page.courses.map((c) => ({ ...c, _id: c.id }));
  } else {
    $w('#coursesBox').collapse();
  }
  $w('#finderButton').link = `/training/find?audience=${encodeURIComponent(page.audience.key)}&role=${page.role.slug}`;
});
