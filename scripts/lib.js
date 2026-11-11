// Shared loading code for validate.js and build-catalogue.js.
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const root = path.resolve(__dirname, '..');
const LIST_SECTIONS = ['Intended Audience', 'Learning Objectives', 'Syllabus', 'Core Reading'];
const SECTION_ORDER = ['Aim and Purpose', 'What It Covers', 'Intended Audience', 'Learning Objectives', 'Syllabus',
  'Structure and Format', 'Useful Prior Knowledge and Experience', 'Materials', 'Core Reading', 'Modules Intro'];

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

function splitSections(markdown) {
  const out = {};
  const parts = markdown.split(/^##\s+(.+)$/gm);
  for (let i = 1; i < parts.length; i += 2) out[parts[i].trim()] = (parts[i + 1] || '').trim();
  return out;
}

// List sections become arrays of bullet text; other sections stay as Markdown text.
function structure(sections) {
  const out = {};
  for (const [name, text] of Object.entries(sections)) {
    if (!text) continue;
    if (LIST_SECTIONS.includes(name)) {
      const bullets = text.split(/\r?\n/).filter((l) => /^\s*[-*]\s+/.test(l)).map((l) => l.replace(/^\s*[-*]\s+/, '').trim());
      out[name] = bullets.length ? bullets : text;
    } else {
      out[name] = text;
    }
  }
  return out;
}

function loadEntries() {
  const entries = [];
  for (const dir of ['programmes', 'modules']) {
    const full = path.join(root, dir);
    for (const file of fs.readdirSync(full).filter((n) => n.endsWith('.md')).sort()) {
      const parsed = matter(fs.readFileSync(path.join(full, file), 'utf8'));
      const rawSections = splitSections(parsed.content);
      entries.push({
        dir, file, name: file.replace(/\.md$/, ''),
        data: parsed.data, rawSections, sections: structure(rawSections)
      });
    }
  }
  return entries;
}

module.exports = { root, readJson, loadEntries, LIST_SECTIONS, SECTION_ORDER };
