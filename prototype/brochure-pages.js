/* Lunis Training: brochure-style programme and module pages (prototype, 11 Nov 2026).
 *
 * Reference implementation for the Wix session. Keeps the current page shell exactly:
 * hero (crumbs, badges, title, summary, buttons, picture) + main column + sticky "At a glance".
 * Changes only:
 *   - hero: adds a "Download brochure (PDF)" button; drops the "Outline description" note
 *   - main column: brochure sections (see SECTIONS below)
 *   - At a glance: adds Level, modules/hours detail, Part of, and the download button
 *   - adds a "Go further" pathway band after the page (programmes) / "Part of" card (modules)
 *
 * Usage: LunisBrochure.renderProgramme(root, programme, ctx) / LunisBrochure.renderModule(root, module, programme, ctx)
 * ctx = { art: url, pageUrl: fn(id) -> url, pdfUrl: fn(path) -> url, enquire: fn(title) -> url, crumbs: [{label, href}] }
 */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function arr(v) { return Array.isArray(v) ? v : (v == null || v === "" ? [] : [v]); }
  function ul(items, cls) {
    items = arr(items);
    return items.length ? '<ul' + (cls ? ' class="' + cls + '"' : "") + ">" + items.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>" : "";
  }
  function para(text) { return text ? arr(text).map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("") : ""; }
  function pad(n) { return String(n).padStart(2, "0"); }
  function hours(n) { return (Math.round(n * 10) / 10) + (n === 1 ? " hour" : " hours"); }
  function dur(e) {
    if (!e.durationValue) return "";
    var u = e.durationUnit || "";
    if (e.durationValue === 1) u = u.replace(/s$/, "");
    return e.durationValue + " " + u;
  }
  function deliveryText(fmts) {
    fmts = arr(fmts);
    if (!fmts.length) return "";
    var map = { "In-person": "in person", "Online": "online", "Hybrid": "hybrid" };
    var words = fmts.map(function (f) { return map[f] || f.toLowerCase(); });
    var s = words.length > 1 ? words.slice(0, -1).join(", ") + " or " + words[words.length - 1] : words[0];
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function sec(id, kicker, title, body) {
    if (!body || !body.replace(/<[^>]+>/g, "").trim()) return "";
    return '<section class="dsec" id="' + id + '" data-toc="' + esc(title) + '">' +
      (kicker ? '<p class="kicker">' + esc(kicker) + "</p>" : "") + "<h2>" + esc(title) + "</h2>" + body + "</section>";
  }
  function toc(html) {
    var out = [], re = /<section class="dsec" id="([^"]+)" data-toc="([^"]+)"/g, m;
    while ((m = re.exec(html))) out.push('<a href="#' + m[1] + '">' + m[2] + "</a>");
    return out.length ? '<nav class="pd-toc" aria-label="On this page">' + out.join("") + "</nav>" : "";
  }
  function facts(rows) {
    return rows.filter(function (r) { return r[1] && String(r[1]).trim(); })
      .map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + (r[2] ? r[1] : esc(r[1])) + "</dd>"; }).join("");
  }
  function stats(items) {
    items = items.filter(function (i) { return i[0]; });
    return '<div class="pd-stats' + (items.length === 3 ? " n3" : "") + '">' + items.map(function (i) {
      return '<div class="pd-stat"><b>' + esc(i[0]) + "</b><span>" + esc(i[1]) + "</span></div>";
    }).join("") + "</div>";
  }

  /* Standard delivery cards. "Tailoring" is site-wide text; Formats is built from the data; Materials from the entry or a default. */
  var TAILORING = "Modules can be selected, reordered or adapted to your markets, rules and ways of working.";
  function delivCards(e, isProg) {
    var formats = deliveryText(e.deliveryFormat) + (isProg ? "; as a multi-day programme or a series of half-day sessions" : "") +
      ". Hours shown are teaching hours; breaks are additional.";
    var materials = (e.sections && e.sections["Materials"]) ||
      "Course notes and practical materials. Attendance certificate stating the teaching hours completed; CPD recognition depends on each participant's professional body.";
    return '<div class="deliv-cards">' +
      "<div><h3>Formats</h3><p>" + esc(formats) + "</p></div>" +
      "<div><h3>Tailoring</h3><p>" + esc(TAILORING) + "</p></div>" +
      "<div><h3>Materials</h3><p>" + esc(materials) + "</p></div></div>";
  }

  function hero(e, ctx, opts) {
    var crumbs = '<nav class="crumbs" aria-label="Breadcrumb">' + arr(ctx.crumbs).map(function (c) {
      return c.href ? '<a href="' + esc(c.href) + '">' + esc(c.label) + "</a><span>/</span>" : "<span>" + esc(c.label) + "</span>";
    }).join("") + "</nav>";
    var badges = '<div class="prog-badges"><span class="badge badge-kind">' + esc(opts.badge) + "</span>" +
      (e.level ? '<span class="badge">' + esc(e.level) + "</span>" : "") + "</div>";
    var dl = e.brochure ? '<a class="btn btn-ghost btn-dl" href="' + esc(ctx.pdfUrl(e.brochure)) + '" download>Download brochure (PDF)</a>' : "";
    return '<section class="pd-hero"><div class="wrap">' + crumbs +
      '<div class="pd-grid"><div>' + badges + "<h1>" + esc(e.title) + "</h1>" +
      '<p class="lead">' + esc(e.summary) + "</p>" + (opts.extra || "") +
      '<div class="btn-row"><a class="btn btn-gold" href="' + esc(ctx.enquire(e.title)) + '">' + esc(opts.request) + "</a>" + dl +
      '<a class="btn btn-ghost" href="training.html#finder">Back to catalogue</a></div>' +
      '</div><div class="pd-art"><img src="' + esc(ctx.art) + '" alt="' + esc(e.title) + '"></div></div></div></section>';
  }

  function side(e, ctx, rows, request) {
    var dl = e.brochure ? '<a class="btn btn-ghost btn-dl" href="' + esc(ctx.pdfUrl(e.brochure)) + '" download>Download brochure</a>' : "";
    return '<aside class="pd-side"><div class="facts"><h3>At a glance</h3><dl>' + facts(rows) + "</dl>" +
      '<a class="btn btn-gold" href="' + esc(ctx.enquire(e.title)) + '">' + esc(request) + "</a>" + dl +
      '<p class="facts-note">Every programme can be tailored to your jurisdiction, sector and case studies.</p></div></aside>';
  }

  function shell(heroHtml, mainHtml, sideHtml, afterHtml) {
    return heroHtml + '<section class="bg-white pd-main"><div class="wrap pd-layout"><div class="pd-content">' +
      toc(mainHtml) + mainHtml + "</div>" + sideHtml + "</div></section>" + (afterHtml || "");
  }

  /* ------------------------------------------------------------------ PROGRAMME PAGE */
  function renderProgramme(root, p, ctx) {
    var s = p.sections || {};
    var mods = arr(p.modules).slice().sort(function (a, b) { return a.number - b.number; });
    var n = mods.length;
    var total = p.durationValue && p.durationUnit === "hours" ? p.durationValue : null;
    var per = p.hoursPerModule || (total && n ? total / n : null);

    var main =
      sec("why", "Programme overview", "Why this programme",
        para(s["Aim and Purpose"]) +
        stats([[String(n), "modules"], [per ? "c. " + per + " hrs" : "", "per module"], [total ? total + " hrs" : dur(p), "in total"], [p.level, "programme level"]])) +
      sec("who", "", "Who should attend",
        '<div class="two-col"><div>' + ul(s["Intended Audience"]) + "</div>" +
        (s["What It Covers"] ? '<div><h3>What it covers</h3>' + para(s["What It Covers"]) + "</div>" : "") + "</div>") +
      sec("objectives", "", "Learning objectives",
        "<p>By the end of the programme, participants will be able to:</p>" + ul(s["Learning Objectives"])) +
      sec("glance", "Programme at a glance", "The " + n + " modules",
        '<div class="glance-grid">' + mods.map(function (m) {
          return '<a class="glance-tile" href="#module-' + m.number + '"><span class="n">' + pad(m.number) + '</span><span class="t">' + esc(m.title) + "</span></a>";
        }).join("") + "</div>") +
      sec("modules", "Module by module", "Programme content",
        '<div class="mod-tools"><p class="mods-intro">' + esc(s["Modules Intro"] || n + " modules. Open a module to see its objectives and syllabus.") + "</p>" +
        '<button type="button" data-expand>Expand all</button></div>' +
        '<div class="mods">' + mods.map(function (m) {
          return '<details class="mod" id="module-' + m.number + '"><summary>' +
            '<span class="mod-num">' + pad(m.number) + "</span>" +
            '<span class="mod-head"><span class="mod-title">' + esc(m.title) + '</span><span class="mod-over">' + esc(m.summary || "") + "</span></span>" +
            '<span class="aud-chev" aria-hidden="true"></span></summary><div class="mod-body"><div class="two-col">' +
            '<div><p class="col-label">Objectives</p>' + ul(m.objectives) + "</div>" +
            '<div><p class="col-label">Syllabus</p>' + ul(m.syllabus) + "</div></div>" +
            (m.id ? '<a class="mod-link" href="' + esc(ctx.pageUrl(m.id)) + '">View this module on its own &rarr;</a>' : "") +
            "</div></details>";
        }).join("") + "</div>") +
      sec("delivery", "Delivery", "How the programme runs",
        para(s["Structure and Format"]) + para(s["Useful Prior Knowledge and Experience"]) + delivCards(p, true)) +
      sec("reading", "", "Core reading", ul(s["Core Reading"], "reading"));

    var rows = [
      ["Format", "Programme · " + n + " modules"],
      ["Duration", (total ? hours(total) : dur(p)) + (per ? " (c. " + per + " hours per module)" : "")],
      ["Level", p.level],
      ["Delivery", arr(p.deliveryFormat).join(", ")],
      ["For", arr(p.clientTypeLabels).join(", ")],
      ["Topic", p.topic]
    ];

    var after = arr(p.related).length ?
      '<section class="bg-cream" id="pd-related"><div class="wrap"><div class="section-head"><div><p class="eyebrow">Go further</p><h2>Related <em>programmes</em></h2></div>' +
      '<a class="link-arrow" href="training.html#finder">Full catalogue &rarr;</a></div><div class="pathway">' +
      p.related.map(function (r) {
        return '<a class="path-card" href="' + (r.id ? esc(ctx.pageUrl(r.id)) : "#") + '"><h3>' + esc(r.title) + '</h3><span class="m">' +
          esc([r.moduleCount ? r.moduleCount + " modules" : "", r.hours ? r.hours + " hrs" : "", r.level || ""].filter(Boolean).join(" · ")) +
          "</span><p>" + esc(r.summary) + "</p></a>";
      }).join("") + "</div></div></section>" : "";

    root.innerHTML = shell(
      hero(p, ctx, { badge: "Programme · " + n + " modules", request: "Request this programme" }),
      main, side(p, ctx, rows, "Request this programme"), after);
    wire(root);
  }

  /* ------------------------------------------------------------------ MODULE PAGE */
  // Fields a module leaves blank are taken from its (first) programme: audience, delivery text, prior knowledge, core reading, level, formats.
  function renderModule(root, m, prog, ctx) {
    var ps = (prog && prog.sections) || {};
    var s = m.sections || {};
    var level = m.level || (prog && prog.level);
    var fmts = arr(m.deliveryFormat).length ? m.deliveryFormat : (prog && prog.deliveryFormat);
    var e = Object.assign({}, m, { level: level, deliveryFormat: fmts });
    var mods = prog ? arr(prog.modules).slice().sort(function (a, b) { return a.number - b.number; }) : [];
    var idx = -1;
    mods.forEach(function (x, i) { if (x.number === m.number) idx = i; });
    var prev = idx > 0 ? mods[idx - 1] : null, next = idx >= 0 && idx < mods.length - 1 ? mods[idx + 1] : null;
    var hrs = m.durationValue ? dur(m) : (prog && prog.hoursPerModule ? "c. " + prog.hoursPerModule + " hours" : "");

    var partLine = prog ? '<p class="partof-line">Module ' + m.number + " of " + mods.length + ' in <a href="' + esc(ctx.pageUrl(prog.id)) + '">' + esc(prog.title) + "</a></p>" : "";

    var main =
      sec("why", "Module overview", "Why this module",
        para(s["Aim and Purpose"] || m.summary) +
        stats([[hrs.replace(" hours", " hrs").replace(" hour", " hr"), "teaching time"], [level, "level"], [prog ? "Module " + m.number : "", prog ? "of " + mods.length + " in the programme" : ""]])) +
      sec("who", "", "Who should attend", ul(s["Intended Audience"] || ps["Intended Audience"])) +
      sec("content", "Module content", "Objectives and syllabus",
        '<div class="two-col"><div><p class="col-label">By the end of the module, participants will be able to</p>' + ul(s["Learning Objectives"] || m.objectives) + "</div>" +
        '<div><p class="col-label">Syllabus</p>' + ul(s["Syllabus"] || m.syllabus) + "</div></div>") +
      sec("delivery", "Delivery", "How the module runs",
        para(s["Structure and Format"] || (hrs ? "About " + hrs.replace("c. ", "") + " of teaching, combining short input with case studies, group exercises and practical tools. Available on its own or as part of the full programme." : "")) +
        para(s["Useful Prior Knowledge and Experience"] || ps["Useful Prior Knowledge and Experience"]) + delivCards(e, false)) +
      (prog ? sec("programme", "Part of a programme", prog.title,
        '<div class="partof"><a class="pt" href="' + esc(ctx.pageUrl(prog.id)) + '">' + esc(prog.title) + "</a>" +
        '<div class="mod-meta">' + esc([mods.length + " modules", prog.durationValue ? prog.durationValue + " hrs in total" : "", prog.level].filter(Boolean).join(" · ")) + "</div>" +
        "<ol>" + mods.map(function (x) {
          var inner = '<span class="num">' + pad(x.number) + "</span>" + esc(x.title);
          return x.number === m.number ? '<li class="here"><span>' + inner + "</span></li>" : '<li><a href="' + esc(ctx.pageUrl(x.id)) + '">' + inner + "</a></li>";
        }).join("") + "</ol>" +
        '<div class="pn">' + (prev ? '<a href="' + esc(ctx.pageUrl(prev.id)) + '">&larr; Module ' + prev.number + "</a>" : "<span></span>") +
        (next ? '<a href="' + esc(ctx.pageUrl(next.id)) + '">Module ' + next.number + " &rarr;</a>" : "<span></span>") + "</div></div>") : "") +
      sec("reading", "", "Core reading", ul(s["Core Reading"] || ps["Core Reading"], "reading"));

    var rows = [
      ["Format", "Module"],
      ["Duration", hrs],
      ["Level", level],
      ["Delivery", arr(fmts).join(", ")],
      ["For", arr(m.clientTypeLabels || (prog && prog.clientTypeLabels)).join(", ")],
      ["Topic", m.topic || (prog && prog.topic)],
      ["Part of", prog ? '<a href="' + esc(ctx.pageUrl(prog.id)) + '">' + esc(prog.title) + "</a> (module " + m.number + ")" : "", true]
    ];

    root.innerHTML = shell(
      hero(e, ctx, { badge: "Module", request: "Request this module", extra: partLine }),
      main, side(e, ctx, rows, "Request this module"), "");
    wire(root);
  }

  function wire(root) {
    var b = root.querySelector("[data-expand]");
    if (b) b.addEventListener("click", function () {
      var all = root.querySelectorAll("details.mod"), open = b.textContent === "Expand all";
      all.forEach(function (d) { d.open = open; });
      b.textContent = open ? "Collapse all" : "Expand all";
    });
    root.querySelectorAll(".glance-tile").forEach(function (a) {
      a.addEventListener("click", function () {
        var d = document.getElementById(a.getAttribute("href").slice(1));
        if (d) d.open = true;
      });
    });
  }

  window.LunisBrochure = { renderProgramme: renderProgramme, renderModule: renderModule };
})();
