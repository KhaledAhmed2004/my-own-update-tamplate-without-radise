#!/usr/bin/env node
/*
 * Move item-level descriptions into request.description for Postman collections,
 * so that the Docs tab renders the text.
 */

const fs = require('fs');
const path = require('path');

function migrateItem(item) {
  // If this is a request item
  if (item && item.request) {
    // Only migrate when request.description is missing and item.description exists
    if (!item.request.description && item.description) {
      item.request.description = item.description;
      // Keep item.description for folder display in some clients; do not delete
    }
  }

  // If this is a folder with children
  if (item && Array.isArray(item.item)) {
    item.item.forEach(migrateItem);
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

  if (Array.isArray(json.item)) {
    json.item.forEach(migrateItem);
  }

  fs.writeFileSync(abs, JSON.stringify(json, null, 2));
  console.log('Migration complete. Updated:', abs);
}

main();