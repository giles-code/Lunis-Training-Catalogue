// Phase 1 booking: "Request this programme" enquiries for in-person / in-house delivery.
// Saves to the CMS collection "Enquiries" (create it with permissions: site admin only) and adds the
// person to Wix contacts, so a Wix Automation can email Lunis and send an acknowledgement.
import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';
import { contacts } from 'wix-crm-backend';

const clean = (s, n = 2000) => String(s || '').trim().slice(0, n);

export const submitEnquiry = webMethod(Permissions.Anyone, async (form) => {
  const email = clean(form.email, 200);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Please enter a valid email address.' };
  const item = {
    name: clean(form.name, 200),
    email,
    organisation: clean(form.organisation, 200),
    role: clean(form.role, 200),
    programmeSlug: clean(form.programmeSlug, 120),
    programmeTitle: clean(form.programmeTitle, 200),
    modules: Array.isArray(form.modules) ? form.modules.map((m) => clean(m, 200)).slice(0, 30) : [],
    format: clean(form.format, 40), // In-person / Online / Hybrid
    participants: clean(form.participants, 40),
    location: clean(form.location, 200),
    timing: clean(form.timing, 200),
    message: clean(form.message),
    source: clean(form.source, 300), // page URL the enquiry came from
  };
  await wixData.insert('Enquiries', item, { suppressAuth: true });
  try {
    const [first, ...rest] = item.name.split(' ');
    await contacts.appendOrCreateContact({
      name: { first: first || '', last: rest.join(' ') },
      emails: [email],
      company: item.organisation,
    });
  } catch (e) {
    console.error('Contact not created', e); // the enquiry is still saved
  }
  return { ok: true };
});
