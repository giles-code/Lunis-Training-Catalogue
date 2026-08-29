const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const root = path.resolve(__dirname, '..');
const coursesDir = path.join(root, 'courses');
const outputDir = path.join(root, 'dist');
const outputFile = path.join(outputDir, 'catalogue.json');

function splitSections(markdown) {
  const sections = {};
  const parts = markdown.split(/^##\s+(.+)$/gm);

  for (let index = 1; index < parts.length; index += 2) {
    sections[parts[index].trim()] = (parts[index + 1] || '').trim();
  }

  return sections;
}

function inlineMarkup(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function markdownToHtml(markdown = '') {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let listOpen = false;

  function closeList() {
    if (listOpen) {
      html.push('</ul>');
      listOpen = false;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!listOpen) {
        html.push('<ul>');
        listOpen = true;
      }
      html.push(`<li>${inlineMarkup(line.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }

    closeList();

    if (line.startsWith('> ')) {
      html.push(`<blockquote>${inlineMarkup(line.slice(2))}</blockquote>`);
    } else {
      html.push(`<p>${inlineMarkup(line)}</p>`);
    }
  }

  closeList();
  return html.join('');
}

const courses = fs.readdirSync(coursesDir)
  .filter((name) => name.endsWith('.md'))
  .sort()
  .map((name) => {
    const source = fs.readFileSync(path.join(coursesDir, name), 'utf8');
    const parsed = matter(source);
    const sections = splitSections(parsed.content);

    return {
      ...parsed.data,
      _id: parsed.data.id,
      sections,
      sectionHtml: Object.fromEntries(
        Object.entries(sections).map(([heading, body]) => [heading, markdownToHtml(body)])
      )
    };
  });

const payload = {
  generatedAt: new Date().toISOString(),
  count: courses.length,
  courses
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Built ${courses.length} courses in ${path.relative(root, outputFile)}`);
