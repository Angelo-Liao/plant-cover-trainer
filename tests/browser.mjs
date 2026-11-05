// Portable browser acceptance suite. By default use the installed test dependency;
// constrained environments may point PLAYWRIGHT_MODULE to a preinstalled copy.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const { chromium, firefox, webkit } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const root = fileURLToPath(new URL('..', import.meta.url));
await mkdir(path.join(root, 'artifacts'), { recursive: true });
const html = await readFile(path.join(root, 'dist/index.html'));
const server = createServer((req, res) => {
  if (req.url === '/plant-cover-trainer/' || req.url === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); }
  else { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/plant-cover-trainer/`;
const browsers = (process.env.BROWSERS || 'chromium').split(',');
const summary = [];
try {
  for (const browserName of browsers) {
    const engine = { chromium, firefox, webkit }[browserName];
    const browser = await engine.launch({ headless: true, ...(browserName === 'chromium' && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    try {
      const context = await browser.newContext({ viewport: { width: 1365, height: 1100 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const errors = [], requests = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', request => requests.push(request.url()));
      const ready = async () => { await page.locator('#loading').waitFor({ state: 'hidden', timeout: 30000 }); assert.equal(await page.locator('#generation-error').isVisible(), false); };
      await page.goto(url); await ready();
      assert.equal(await page.locator('#feedback').isVisible(), false);
      assert.equal(await page.locator('#aids').isVisible(), false);
      assert.equal(await page.locator('#estimate').inputValue(), '');
      await page.screenshot({ path: path.join(root, `artifacts/${browserName}-desktop.png`), fullPage: true });
      // Known target configured for next question checks the complete scoring path.
      await page.locator('#range-min').fill('3'); await page.locator('#range-min').dispatchEvent('change');
      await page.locator('#range-max').fill('3'); await page.locator('#range-max').dispatchEvent('change');
      await page.locator('#estimate').fill('3.14'); await page.locator('#submit').click();
      assert.equal(await page.locator('#input-error').isVisible(), true);
      await page.locator('#estimate').fill('5'); await page.locator('#submit').click();
      assert.equal(await page.locator('#feedback').isVisible(), true);
      await page.locator('#next').click(); await ready();
      assert.equal(await page.locator('#estimate').evaluate(el => el === document.activeElement), true);
      await page.locator('#estimate').fill('5'); await page.locator('#submit').click();
      assert.match(await page.locator('#feedback').innerText(), /3\.0/);
      assert.match(await page.locator('#feedback').innerText(), /高估/);
      await page.locator('#equivalent-toggle').check(); assert.equal(await page.locator('#equivalent').isVisible(), true);
      await page.locator('#grid').check(); await page.locator('#silhouette').check();
      await page.locator('[data-mode="demo"]').click(); await ready();
      await page.locator('.advanced > summary').click();
      await page.locator('#grid').check();
      await page.locator('#demo-target').fill('5'); await page.waitForTimeout(200); await ready();
      const actualBefore = await page.locator('#demo-actual').innerText();
      assert.equal(await page.locator('#grid').isChecked(), true);
      await page.locator('#color').check(); await page.locator('#palette').selectOption('mixed');
      await page.locator('#texture').selectOption('3'); await page.locator('#shadow').selectOption('3');
      await page.waitForTimeout(200); await ready();
      assert.equal(await page.locator('#demo-actual').innerText(), actualBefore);
      await page.locator('#depth').selectOption('3'); await page.waitForTimeout(200); await ready();
      assert.match(await page.locator('#demo-actual').innerText(), /5\.0/);
      await page.screenshot({ path: path.join(root, `artifacts/${browserName}-advanced.png`), fullPage: true });
      await page.locator('#demo-target').fill('100.1'); assert.equal(await page.locator('#demo-error').isVisible(), true);
      await page.locator('#demo-target').fill('0'); await page.waitForTimeout(200); await ready();
      assert.match(await page.locator('#demo-actual').innerText(), /0\.0/);
      await page.locator('[data-mode="exam"]').click(); await ready();
      assert.equal(await page.locator('#plant').isDisabled(), true);
      assert.equal(await page.locator('#range-min').isDisabled(), true);
      await page.locator('[data-mode="practice"]').click();
      assert.equal(await page.locator('#leave-dialog').isVisible(), true);
      await page.locator('#leave-cancel').click();
      for (let i = 0; i < 20; i++) {
        assert.equal(await page.locator('#feedback').isVisible(), false);
        assert.equal(await page.locator('#aids').isVisible(), false);
        await page.locator('#estimate').fill('5');
        if (i === 0) {
          await page.locator('#answer-form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
          assert.match(await page.locator('#question-label').innerText(), /第 2 \/ 20 題/);
        } else await page.locator('#submit').click();
        if (i < 19) await ready();
      }
      assert.equal(await page.locator('#summary').isVisible(), true);
      assert.equal(await page.locator('#summary tbody tr').count(), 20);
      assert.match(await page.locator('#summary').innerText(), /2\.0/);
      assert.match(await page.locator('#history-count').innerText(), /1 次/);
      await page.locator('[data-review="0"]').click(); await ready();
      assert.match(await page.locator('#question-label').innerText(), /回顧第 1 題/);
      await page.reload(); await ready(); assert.match(await page.locator('#history-count').innerText(), /1 次/);
      assert.equal(await page.locator('#color').isChecked(), true);
      // Canvas content survives resize exactly; no extra generation on viewport changes.
      const beforeResize = await page.locator('#plot').evaluate(c => c.toDataURL());
      await page.setViewportSize({ width: 390, height: 844 });
      const afterResize = await page.locator('#plot').evaluate(c => c.toDataURL());
      assert.equal(beforeResize, afterResize);
      await page.reload(); await ready();
      assert.equal(await page.locator('#settings-panel').getAttribute('open'), null);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      await page.screenshot({ path: path.join(root, `artifacts/${browserName}-mobile.png`), fullPage: true });
      await page.locator('#help-open').click(); assert.equal(await page.locator('#help-dialog').isVisible(), true);
      await page.keyboard.press('Escape'); assert.equal(await page.locator('#help-dialog').isVisible(), false);
      // Genuine file:// offline launch, with network explicitly disabled.
      // A managed browser may deny file:// by policy. Never work around it;
      // an explicit opt-out reports this acceptance case as NOT VERIFIED.
      if (process.env.SKIP_FILE_TEST === '1') {
        summary.push(`${browserName}: file:// offline NOT VERIFIED (managed browser policy; explicit skip)`);
      } else {
      const offlineContext = await browser.newContext({ offline: true, viewport: { width: 1024, height: 900 } });
      const offline = await offlineContext.newPage(); const external = [];
      offline.on('request', r => { if (/^https?:/.test(r.url())) external.push(r.url()); });
      offline.on('pageerror', e => errors.push(e.message));
      await offline.goto(pathToFileURL(path.join(root, 'dist/index.html')).href);
      await offline.locator('#loading').waitFor({ state: 'hidden' });
      await offline.locator('#estimate').fill('5'); await offline.locator('#submit').click();
      assert.equal(await offline.locator('#feedback').isVisible(), true);
      await offline.locator('[data-mode="demo"]').click(); await offline.locator('#loading').waitFor({ state: 'hidden' });
      await offline.locator('.advanced > summary').click(); await offline.locator('#color').check();
      for (const id of ['texture', 'shadow', 'depth']) await offline.locator(`#${id}`).selectOption('3');
      await offline.waitForTimeout(200); await offline.locator('#loading').waitFor({ state: 'hidden' });
      await offline.locator('[data-mode="exam"]').click();
      for (let i = 0; i < 20; i++) {
        await offline.locator('#loading').waitFor({ state: 'hidden', timeout: 30000 });
        await offline.locator('#estimate').fill('5'); await offline.locator('#submit').click();
      }
      assert.equal(await offline.locator('#summary').isVisible(), true); assert.deepEqual(external, []);
      await offlineContext.close();
      }
      // Denied storage must not block a full exercise.
      const deniedContext = await browser.newContext();
      await deniedContext.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Denied', 'SecurityError'); } }));
      const denied = await deniedContext.newPage(); await denied.goto(url);
      await denied.locator('#loading').waitFor({ state: 'hidden' });
      assert.equal(await denied.locator('#storage-warning').isVisible(), true);
      await denied.locator('#estimate').fill('5'); await denied.locator('#submit').click();
      assert.equal(await denied.locator('#feedback').isVisible(), true);
      await deniedContext.close();
      assert.deepEqual(errors, []);
      assert.ok(requests.every(r => r.startsWith(url)), `Unexpected dependency requests: ${requests}`);
      summary.push(`${browserName}: flows, scoring, exam, review, settings, mobile, dialogs, storage denial, subpath PASS${process.env.SKIP_FILE_TEST === '1' ? '' : '; file offline PASS'}`);
      await context.close();
    } finally { await browser.close(); }
  }
} finally { server.close(); }
console.log(summary.join('\n'));
