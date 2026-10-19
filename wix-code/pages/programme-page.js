// Programme page (router page "Programme Page" for /training/programme/<slug>, Route B).
// With Route A use a CMS dynamic page on Programmes and bind fields to a dataset instead.
// Elements: #title, #intro, #facts, #aim, #who, #objectives, #modulesRepeater (inside: #modNumber, #modTitle, #modOverview,
// #modSyllabus, #modPick checkbox), #structure, #prior, #reading, #relatedRepeater (#relTitle, #relButton),
// #enquireButton, #brochureButton, #euNote.
import wixWindowFrontend from 'wix-window-frontend';
import wixLocationFrontend from 'wix-location-frontend';
import { getRelated } from 'backend/catalogue.web';

const picked = new Set();
$w.onReady(async () => {
  const p = wixWindowFrontend.getRouterData();
  const html = (h) => p.sectionHtml[h] || '';
  $w('#title').text = p.title;
  $w('#intro').text = p.intro;
  $w('#facts').text = `${p.moduleCount} modules · c. ${p.hoursPerModule} hrs each · ${p.durationValue} hrs in total · ${p.level} · ${p.deliveryFormat.join(' / ')}`;
  $w('#aim').html = html('Aim and Purpose');
  $w('#who').html = html('Intended Audience');
  $w('#objectives').html = html('Learning Objectives');
  $w('#structure').html = html('Structure and Format');
  $w('#prior').html = html('Useful Prior Knowledge and Experience');
  html('Core Reading') ? ($w('#reading').html = html('Core Reading')) : $w('#reading').collapse();
  p.internationalCounterpart ? ($w('#euNote').text = `This is the ${p.edition} edition. An international edition is also available.`) : $w('#euNote').collapse();

  $w('#modulesRepeater').onItemReady(($i, m) => {
    $i('#modNumber').text = String(m.number).padStart(2, '0');
    $i('#modTitle').text = m.title;
    $i('#modOverview').text = m.overview;
    $i('#modSyllabus').html = `<ul>${m.syllabus.map((s) => `<li>${s}</li>`).join('')}</ul>`;
    $i('#modPick').onChange((e) => (e.target.checked ? picked.add(m.number) : picked.delete(m.number)));
  });
  $w('#modulesRepeater').data = p.modules.map((m) => ({ ...m, _id: m.id }));

  // Phase 1: enquire for in-person / in-house delivery, carrying the programme and any modules ticked.
  $w('#enquireButton').onClick(() => {
    const mods = [...picked].sort((a, b) => a - b).join(',');
    wixLocationFrontend.to(`/training/enquire?programme=${p.slug}${mods ? `&modules=${mods}` : ''}`);
  });
  // Upload brochures to the Wix Media Manager and map file names there, or hide this button.
  $w('#brochureButton').collapse();

  const rel = await getRelated(p.slug, 4);
  $w('#relatedRepeater').onItemReady(($i, r) => { $i('#relTitle').text = r.title; $i('#relButton').link = r.url; });
  $w('#relatedRepeater').data = rel.map((r) => ({ ...r, _id: r.id }));
});
