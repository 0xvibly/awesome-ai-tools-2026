#!/usr/bin/env node
// Regenerates README.md from the live whatstrending.ai catalog.
// Run by .github/workflows/sync.yml weekly so the list stays current.
import fs from 'node:fs';

const DATA_URL = process.env.AWESOME_DATA_URL || 'https://whatstrending.ai/api/awesome-data';
const SITE = 'https://whatstrending.ai';

const CATEGORY_META = [
  { key: 'chat', label: 'Chat & Assistants', anchor: 'chat--assistants' },
  { key: 'coding', label: 'Coding', anchor: 'coding' },
  { key: 'devtools', label: 'Developer Tools', anchor: 'developer-tools' },
  { key: 'image', label: 'Image Generation', anchor: 'image-generation' },
  { key: 'video', label: 'Video Generation', anchor: 'video-generation' },
  { key: 'writing', label: 'Writing', anchor: 'writing' },
  { key: 'productivity', label: 'Productivity', anchor: 'productivity' },
  { key: 'search', label: 'Search & Research', anchor: 'search--research' },
];

function sentence(s) {
  let t = (s || '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[.!?]$/.test(t)) t += '.';
  return t;
}

function toolLine(t) {
  // awesome-lint format: - [Name](link) - Description ending in punctuation.
  return `- [${t.name}](${t.url}) - ${sentence(t.tagline || t.description)}`;
}

async function main() {
  const res = await fetch(DATA_URL, { headers: { 'User-Agent': 'awesome-ai-tools-2026-generator' } });
  if (!res.ok) throw new Error(`fetch ${DATA_URL} -> ${res.status}`);
  const data = await res.json();
  const rawTools = data.tools || [];
  const models = data.models || [];
  const comparisons = data.comparisons || [];

  // Awesome-lint requires unique links. The source catalog has several entries
  // pointing at the same product URL (e.g. Claude / Claude Opus / Claude Sonnet
  // all -> claude.ai). De-duplicate by URL, keeping the entry with the shortest
  // (most canonical) name.
  const byUrl = new Map();
  for (const t of rawTools) {
    const existing = byUrl.get(t.url);
    if (!existing || t.name.length < existing.name.length) byUrl.set(t.url, t);
  }
  const tools = [...byUrl.values()];

  const byCat = {};
  for (const t of tools) (byCat[t.category] = byCat[t.category] || []).push(t);
  for (const k of Object.keys(byCat)) byCat[k].sort((a, b) => a.name.localeCompare(b.name));

  const activeCats = CATEGORY_META.filter(c => (byCat[c.key] || []).length > 0);

  const lines = [];
  lines.push('# Awesome AI Tools 2026 [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)');
  lines.push('');
  lines.push('> A curated list of the best AI tools, models, and resources in 2026.');
  lines.push('');
  lines.push(`Maintained by [whatstrending.ai](${SITE}) and auto-synced with its live catalog. Last updated ${new Date().toISOString().slice(0, 10)}.`);
  lines.push('');

  // Contents
  lines.push('## Contents');
  lines.push('');
  for (const c of activeCats) lines.push(`- [${c.label}](#${c.anchor})`);
  lines.push('- [AI Model Leaderboard](#ai-model-leaderboard)');
  lines.push('- [Head-to-Head Comparisons](#head-to-head-comparisons)');
  lines.push('- [Contributing](#contributing)');
  lines.push('');

  // Categories
  for (const c of activeCats) {
    lines.push(`## ${c.label}`);
    lines.push('');
    for (const t of byCat[c.key]) lines.push(toolLine(t));
    lines.push('');
  }

  // Model leaderboard
  lines.push('## AI Model Leaderboard');
  lines.push('');
  lines.push('Top models ranked by benchmark score. See the [live leaderboard](' + SITE + '/models) for current standings.');
  lines.push('');
  if (models.length) {
    lines.push('| Rank | Model | Provider | Score |');
    lines.push('| --- | --- | --- | --- |');
    for (const m of models.slice(0, 20)) {
      lines.push(`| ${m.rank ?? ''} | ${m.name ?? ''} | ${m.provider ?? ''} | ${m.score ?? ''} |`);
    }
    lines.push('');
  }

  // Comparisons
  lines.push('## Head-to-Head Comparisons');
  lines.push('');
  lines.push('In-depth side-by-side comparisons of popular AI tools.');
  lines.push('');
  for (const cmp of comparisons) {
    lines.push(`- [${cmp.a} vs ${cmp.b}](${SITE}/compare/${cmp.slug}) - Side-by-side comparison of ${cmp.a} and ${cmp.b}.`);
  }
  lines.push('');

  // Contributing
  lines.push('## Contributing');
  lines.push('');
  lines.push('Contributions welcome! Read the [contribution guidelines](CONTRIBUTING.md) first. This list is auto-generated from the [whatstrending.ai](' + SITE + ') catalog; to suggest a tool, open an issue or a pull request.');
  lines.push('');

  // License (awesome-lint wants a license note + a LICENSE file)
  lines.push('## License');
  lines.push('');
  lines.push('[![CC0](https://licensebuttons.net/p/zero/1.0/88x31.png)](https://creativecommons.org/publicdomain/zero/1.0/)');
  lines.push('');
  lines.push('To the extent possible under law, the maintainers have waived all copyright and related or neighboring rights to this work.');
  lines.push('');

  fs.writeFileSync('README.md', lines.join('\n'));
  console.error(`Generated README.md: ${tools.length} tools, ${activeCats.length} categories, ${models.length} models, ${comparisons.length} comparisons.`);
}

main().catch(e => { console.error('generate failed:', e.message); process.exit(1); });
