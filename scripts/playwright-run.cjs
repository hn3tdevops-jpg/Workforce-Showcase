const fs = require('fs');
const path = require('path');
const playwright = require('playwright');
(async () => {
  const BASE_DIR = path.resolve('dist-staging');
  const host = 'http://127.0.0.1:5000';
  function walk(dir) {
    const results = [];
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) results.push(...walk(full));
      else results.push(full);
    }
    return results;
  }
  if (!fs.existsSync(BASE_DIR)) {
    console.error('dist-staging not found at', BASE_DIR);
    process.exit(2);
  }
  const files = walk(BASE_DIR);
  const htmlFiles = files.filter(f => f.endsWith('.html'));
  const routes = new Set(['/']);
  for (const f of htmlFiles) {
    let rel = path.relative(BASE_DIR, f).replace(/\\\\/g, '/');
    if (rel === 'index.html') rel = '';
    else if (rel.endsWith('/index.html')) rel = '/' + rel.replace(/index.html$/, '');
    else rel = '/' + rel;
    rel = rel.replace(/\/+/g, '/');
    if (!rel.startsWith('/')) rel = '/' + rel;
    if (rel !== '/' && rel.endsWith('/')) rel = rel.slice(0, -1);
    routes.add(rel);
  }
  const outScreens = path.resolve('screenshots');
  fs.mkdirSync(outScreens, { recursive: true });
  const launchOptions = { args: ['--no-sandbox', '--disable-dev-shm-usage', '--single-process'], headless: true };
  const browser = await playwright.chromium.launch(launchOptions);
  const context = await browser.newContext();
  const page = await context.newPage();

  const globalConsole = [];
  const globalFailed = [];

  page.on('console', msg => {
    const text = `${msg.type().toUpperCase()}: ${msg.text()}`;
    globalConsole.push({type: msg.type(), text, location: msg.location()});
  });
  page.on('requestfailed', req => {
    globalFailed.push({url: req.url(), method: req.method(), failureText: req.failure() && req.failure().errorText});
  });

  const summary = [];
  for (const route of Array.from(routes)) {
    console.log('Navigating', route);
    const beforeConsole = globalConsole.length;
    const beforeFailed = globalFailed.length;
    let res = null;
    try {
      res = await page.goto(host + route, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (e) {
      console.error('Error loading', route, e && e.message);
    }
    const status = res ? res.status() : null;
    const afterConsole = globalConsole.length;
    const afterFailed = globalFailed.length;
    const routeConsole = globalConsole.slice(beforeConsole, afterConsole);
    const routeFailed = globalFailed.slice(beforeFailed, afterFailed);
    const safeName = route === '/' ? 'root' : route.replace(/[^a-z0-9-_]/gi, '_');
    const shotPath = path.join(outScreens, safeName + '.png');
    try {
      await page.screenshot({ path: shotPath, fullPage: true });
    } catch (e) {
      console.error('Screenshot failed for', route, e && e.message);
    }
    summary.push({ route, status, consoleCount: routeConsole.length, failedCount: routeFailed.length, screenshot: shotPath, console: routeConsole, failed: routeFailed });
  }

  fs.writeFileSync('browser-console-errors.txt', JSON.stringify(globalConsole, null, 2));
  fs.writeFileSync('failed-network-requests.txt', JSON.stringify(globalFailed, null, 2));

  const lines = ['# Route validation summary', '', '| route | status | console errors | failed requests | screenshot |', '|---|---:|---:|---:|---|'];
  for (const s of summary) {
    const scr = fs.existsSync(s.screenshot) ? s.screenshot : '';
    lines.push(`| \`${s.route}\` | ${s.status || 'ERROR'} | ${s.consoleCount} | ${s.failedCount} | ${scr} |`);
  }
  fs.writeFileSync('route-validation-summary.md', lines.join('\n'));

  console.log('Summary written to route-validation-summary.md');
  await browser.close();
  process.exit(0);
})();
