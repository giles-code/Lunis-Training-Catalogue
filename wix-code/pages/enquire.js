// Enquiry page (URL /training/enquire?programme=<slug>&modules=1,3,5 or ?course=<slug>). Phase 1 booking: request delivery.
// Elements: #what (text), #name, #email, #organisation, #role, #format (radio: In-person / Online / Hybrid),
// #participants, #location, #timing, #message, #submitButton, #thanks (collapsed), #formBox, #errorText (collapsed).
import wixLocationFrontend from 'wix-location-frontend';
import { getProgramme, getCourse } from 'backend/catalogue.web';
import { submitEnquiry } from 'backend/enquiry.web';

$w.onReady(async () => {
  const q = wixLocationFrontend.query;
  const item = q.programme ? await getProgramme(q.programme) : q.course ? await getCourse(q.course) : null;
  const nums = (q.modules || '').split(',').map(Number).filter(Boolean);
  const modules = item && item.modules ? item.modules.filter((m) => nums.includes(m.number)).map((m) => `${m.number}. ${m.title}`) : [];
  $w('#what').text = item
    ? `${item.title}${modules.length ? ` (selected modules: ${modules.join('; ')})` : ' (full programme)'}`
    : 'Tell us what you would like to arrange.';

  $w('#submitButton').onClick(async () => {
    $w('#submitButton').disable();
    const res = await submitEnquiry({
      name: $w('#name').value, email: $w('#email').value, organisation: $w('#organisation').value, role: $w('#role').value,
      programmeSlug: item ? item.slug : '', programmeTitle: item ? item.title : '', modules,
      format: $w('#format').value, participants: $w('#participants').value, location: $w('#location').value,
      timing: $w('#timing').value, message: $w('#message').value, source: wixLocationFrontend.url,
    });
    if (res.ok) { $w('#formBox').collapse(); $w('#thanks').expand(); }
    else { $w('#errorText').text = res.error; $w('#errorText').expand(); $w('#submitButton').enable(); }
  });
});
