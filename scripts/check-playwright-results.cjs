const fs = require('fs');

function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch(e) { return []; }
}

// Check console errors
const consoleErrors = readJSON('browser-console-errors.txt');
if (consoleErrors && consoleErrors.length > 0) {
  console.error('FAIL: browser console errors detected:', consoleErrors.length);
  process.exit(2);
}

// Check failed network requests
const failedRequests = readJSON('failed-network-requests.txt');
if (failedRequests && failedRequests.length > 0) {
  console.error('FAIL: failed network requests detected:', failedRequests.length);
  process.exit(3);
}

// Check route-validation-summary.md for non-2xx statuses or ERROR markers
let routeMd = '';
if (fs.existsSync('route-validation-summary.md')) routeMd = fs.readFileSync('route-validation-summary.md','utf8');
else {
  console.error('FAIL: route-validation-summary.md missing');
  process.exit(4);
}

const lines = routeMd.split('\n').filter(Boolean);
// find table rows (skip header lines until the table header separator)
const tableStart = lines.findIndex(l => l.startsWith('| route'));
if (tableStart === -1) {
  console.error('FAIL: route-validation-summary.md table not found');
  process.exit(5);
}
const rows = lines.slice(tableStart + 2); // skip header and separator
let bad = 0;
for (const r of rows) {
  const cols = r.split('|').map(s => s.trim());
  // cols expected: ['', '`/route`', 'status', 'console', 'failed', 'screenshot', ''] or similar
  if (cols.length < 4) continue;
  const statusCol = cols[2] || '';
  const status = statusCol.replace(/[^0-9]/g,'');
  if (!status) {
    // could be ERROR
    if (statusCol.toUpperCase().includes('ERROR')) {
      console.error('FAIL: route had ERROR status:', r);
      bad++;
    }
  } else {
    const code = parseInt(status,10);
    if (isNaN(code) || code < 200 || code >= 300) {
      console.error('FAIL: route returned non-2xx status:', r);
      bad++;
    }
  }
}
if (bad > 0) {
  console.error('FAIL: route checks failed:', bad);
  process.exit(6);
}

console.log('PASS: Playwright validation checks passed (no console errors, no failed requests, all routes 2xx)');
process.exit(0);
