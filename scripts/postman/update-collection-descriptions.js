const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const token = a.replace(/^--/, '');
    if (token.includes('=')) {
      const [key, ...rest] = token.split('=');
      const val = rest.join('=');
      args[key] = val;
    } else {
      const key = token;
      const next = argv[i + 1];
      if (next && !String(next).startsWith('--')) {
        args[key] = next;
        i += 1; // consume value token
      } else {
        args[key] = 'true';
      }
    }
  }
  return args;
}

function ensureInfo(obj) {
  if (!obj.info || typeof obj.info !== 'object') {
    obj.info = { name: 'API Collection', description: '', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' };
  }
}

function getUrlRaw(url) {
  if (!url) return '';
  if (typeof url === 'string') return url;
  if (typeof url === 'object') {
    if (url.raw) return url.raw;
    const host = Array.isArray(url.host) ? url.host.join('.') : (url.host || '');
    const pathPart = Array.isArray(url.path) ? '/' + url.path.join('/') : (url.path ? '/' + url.path : '');
    const protocol = url.protocol ? url.protocol + '://' : '';
    return protocol + host + pathPart;
  }
  return '';
}

function updateItems(items, options, counters) {
  if (!Array.isArray(items)) return;
  items.forEach((item) => {
    // Folder
    if (item && Array.isArray(item.item)) {
      updateItems(item.item, options, counters);
    }
    // Request
    if (item && item.request) {
      const method = (item.request.method || '').toUpperCase();
      const urlRaw = getUrlRaw(item.request.url);
      const suggested = `Purpose: ${item.name || 'Unnamed'}\nMethod: ${method || 'UNKNOWN'}\nURL: ${urlRaw || 'UNKNOWN'}\nNotes: Update with request body, params, and response details.`;

      const hasDesc = !!item.request.description;
      if (options.force || !hasDesc) {
        item.request.description = suggested;
        if (hasDesc) counters.overwritten += 1; else counters.added += 1;
      } else {
        counters.kept += 1;
      }
    }
  });
}

function main() {
  const args = parseArgs(process.argv);
  const fileArg = args.file || path.join('postman-collections', 'complete-api-collection.json');
  const filePath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
  const nameArg = args.name;
  const descArg = args.description;
  const force = args.force === 'true';

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse JSON:', e.message);
    process.exit(1);
  }

  ensureInfo(json);
  if (typeof nameArg === 'string') {
    json.info.name = nameArg;
  }
  if (typeof descArg === 'string') {
    json.info.description = descArg;
  }

  const counters = { added: 0, overwritten: 0, kept: 0 };
  updateItems(json.item, { force }, counters);

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');

  console.log('Update complete');
  console.log(`Info updated: name=${json.info.name ? 'yes' : 'no'}, description=${json.info.description ? 'yes' : 'no'}`);
  console.log(`Request descriptions -> added: ${counters.added}, overwritten: ${counters.overwritten}, kept: ${counters.kept}`);
}

main();