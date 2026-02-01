#!/usr/bin/env node
/*
 * Ensure Postman request.description uses Description object with type=text/markdown
 * Some Postman builds render Docs more reliably with Description objects.
 */
const fs = require('fs');
const path = require('path');

function convert(item) {
  if (item && item.request) {
    const d = item.request.description;
    if (typeof d === 'string' && d.trim().length > 0) {
      item.request.description = { content: d, type: 'text/markdown' };
    }
  }
  if (item && Array.isArray(item.item)) {
    item.item.forEach(convert);
  }
}

function main() {
  const collectionPath = process.argv[2] || path.join('postman-collections', 'organized-api-collection.json');
  const abs = path.resolve(collectionPath);
  if (!fs.existsSync(abs)) {
    console.error('File not found:', abs);
    process.exit(1);
  }
  const raw = fs.readFileSync(abs, 'utf8');
  const json = JSON.parse(raw);
  if (Array.isArray(json.item)) json.item.forEach(convert);
  fs.writeFileSync(abs, JSON.stringify(json, null, 2));
  console.log('Converted descriptions to markdown objects:', abs);
}

main();