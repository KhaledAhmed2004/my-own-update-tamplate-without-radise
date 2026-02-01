/*
  Ensures all request.description fields are plain strings (not Description objects).
  Some Postman clients render Docs only when request.description is a string.

  Usage:
    node scripts/postman/ensure-request-descriptions-string.js postman-collections/organized-api-collection.json
*/

const fs = require('fs');
const path = require('path');

function normalizeDescription(desc) {
  if (desc == null) return null;
  if (typeof desc === 'string') return desc.trim();
  if (typeof desc === 'object') {
    const content = typeof desc.content === 'string' ? desc.content : '';
    return content.trim();
  }
  return String(desc).trim();
}

function walkItems(items) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    // If this is a request item, normalize request.description
    if (item && item.request) {
      const current = item.request.description;
      const normalized = normalizeDescription(current);
      if (normalized) {
        item.request.description = normalized;
      } else {
        // If missing, try to use item-level description as fallback
        const fallback = normalizeDescription(item.description);
        if (fallback) item.request.description = fallback;
      }
    }
    // Recurse into folders
    if (item && Array.isArray(item.item)) walkItems(item.item);
  }
}

function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: node scripts/postman/ensure-request-descriptions-string.js <collection.json>');
    process.exit(1);
  }
  const filePath = path.resolve(fileArg);
  const raw = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(raw);

  walkItems(json.item);

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
  console.log('Normalized request.description to strings for Docs rendering:', filePath);
}

main();