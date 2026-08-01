import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.MINTLIFY_BASE_URL ?? 'http://127.0.0.1:3000';
const pages = [
  '/workflow/workshops/overview',
  '/workflow/workshops/using',
  '/workflow/workshops/catalog',
  '/workflow/procedures/overview',
  '/workflow/procedures/choosing',
  '/workflow/procedures/running',
  '/workflow/procedures/catalog',
];
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

function browserExecutable() {
  const candidates = [
    chromium.executablePath(),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  return candidates.find((candidate) => candidate && existsSync(candidate));
}

function isExpectedPreviewNoise(error) {
  return error.includes('net::ERR_NETWORK_ACCESS_DENIED @ https://d4tuoctqmanu0.cloudfront.net/') ||
    error.includes('net::ERR_NETWORK_ACCESS_DENIED @ https://d3gk2c5xim1je2.cloudfront.net/') ||
    (error.includes('404 (Not Found) @') && error.includes('/favicon.ico'));
}

const executablePath = browserExecutable();
if (!executablePath) {
  throw new Error('Playwright Chromium, Chrome or Edge is required for the visual check.');
}

mkdirSync('scripts/cache', { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath });
const failures = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  for (const path of pages) {
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(`${message.text()} @ ${message.location().url || 'unknown'}`);
      }
    });
    const response = await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 60_000 });
    const state = await page.evaluate(() => ({
      h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      mainText: document.querySelector('main')?.textContent?.trim() ?? '',
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    const expectedConsoleErrors = consoleErrors.filter(isExpectedPreviewNoise);
    const unexpectedConsoleErrors = consoleErrors.filter((error) => !isExpectedPreviewNoise(error));
    const problems = [];
    if (!response?.ok()) problems.push(`HTTP ${response?.status() ?? 'none'}`);
    if (!state.h1) problems.push('missing h1');
    if (state.mainText.length < 100) problems.push(`main too short: ${state.mainText.length}`);
    if (state.scrollWidth > state.clientWidth + 1) {
      problems.push(`horizontal overflow ${state.scrollWidth}/${state.clientWidth}`);
    }
    if (unexpectedConsoleErrors.length > 0) {
      problems.push(`console errors: ${unexpectedConsoleErrors.join(' | ')}`);
    }
    if (problems.length > 0) failures.push(`${viewport.name} ${path}: ${problems.join('; ')}`);
    console.log(`${viewport.name} ${path} :: ${state.h1} :: ${problems.length === 0 ? `OK (expected network noise: ${expectedConsoleErrors.length})` : problems.join('; ')}`);
    if (viewport.name === 'desktop' && path === '/workflow/workshops/overview') {
      await page.screenshot({ path: 'scripts/cache/mintlify-workshops-desktop.png', fullPage: true });
    }
    if (viewport.name === 'mobile' && path === '/workflow/procedures/choosing') {
      await page.screenshot({ path: 'scripts/cache/mintlify-procedures-mobile.png', fullPage: true });
    }
    await page.close();
  }
  await context.close();
}

await browser.close();
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
}
