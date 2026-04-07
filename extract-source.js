#!/usr/bin/env node
// Extracts original source files from source maps
const fs = require('fs');
const path = require('path');

const mapFiles = [
  'dist/assets/index-BfPlgyMd.js.map',
  'dist/assets/index-Mri9BiOf.js.map',
  'dist/assets/bookImport-Cp-CET8f.js.map',
];

let extracted = 0;

for (const mapFile of mapFiles) {
  if (!fs.existsSync(mapFile)) continue;
  
  const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
  const sources = map.sources || [];
  const contents = map.sourcesContent || [];

  for (let i = 0; i < sources.length; i++) {
    const sourcePath = sources[i];
    const content = contents[i];

    if (!content) continue;
    if (!sourcePath.includes('/src/')) continue;

    // Clean up the path
    const cleanPath = sourcePath
      .replace(/^.*\/src\//, 'src/')
      .replace(/\?.*$/, '');

    const outPath = path.join('.', cleanPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, content);
    console.log('Extracted:', outPath);
    extracted++;
  }
}

console.log(`\nDone. Extracted ${extracted} files.`);
