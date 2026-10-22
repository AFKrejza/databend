// Browser smoke test: drives the running dev server with the system's Edge/Chrome via playwright-core.
// Usage: npm run dev (in another terminal), then npm run smoke [-- http://localhost:5173]
// Screenshots go to out/smoke-*.png. Exits non-zero on page errors or a failed check.
import { mkdir } from 'node:fs/promises';
import { chromium, type Page } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:5173';
const channel = process.platform === 'win32' ? 'msedge' : 'chrome';

async function idle(page: Page): Promise<void> {
  await page.waitForFunction(() => !document.querySelector('.status')?.textContent?.includes('rendering'));
  await page.waitForTimeout(150);
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `out/smoke-${name}.png` });
  console.log(`  saved out/smoke-${name}.png`);
}

const browser = await chromium.launch({ channel });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

try {
  await mkdir('out', { recursive: true });
  await page.goto(url);
  console.log('import gradient.png');
  await page.setInputFiles('input[type=file][accept="image/*"]', 'public/test/gradient.png');
  await page.waitForSelector('.waveform-canvas canvas');
  await idle(page);
  await shot(page, '1-imported');

  console.log('add echo (30 px)');
  await page.selectOption('.chain select', 'echo');
  await idle(page);
  await page.locator('.effect-card').first().locator('input[type=number]').first().fill('30');
  await idle(page);
  await shot(page, '2-echo');

  console.log('drag a rect selection and add wah');
  const box = (await page.locator('.overlay').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.8, { steps: 5 });
  await page.mouse.up();
  await page.selectOption('.chain select', 'wah');
  await idle(page);
  await shot(page, '3-rect-wah');

  console.log('range-select on the waveform');
  await page.keyboard.press('Escape');
  const wave = (await page.locator('.waveform-canvas canvas').boundingBox({ timeout: 5000 }))!;
  await page.mouse.move(wave.x + wave.width * 0.3, wave.y + wave.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(wave.x + wave.width * 0.45, wave.y + wave.height * 0.6, { steps: 5 });
  await page.mouse.up();
  await idle(page);
  await shot(page, '4-wave-range');

  const canvasData = () => page.evaluate(() => (document.querySelector('.canvas-stack canvas') as HTMLCanvasElement).toDataURL());
  const cards = () => page.locator('.effect-card').count();
  const check = (ok: boolean, msg: string) => { if (!ok) errors.push(msg); };

  console.log('bypass changes the image and back');
  await page.keyboard.press('Escape');
  await idle(page);
  const withFx = await canvasData();
  await page.locator('.effect-card button[title=Bypass]').first().click();
  await idle(page);
  check((await canvasData()) !== withFx, 'bypassing echo should change the image');
  await page.locator('.effect-card button[title=Bypass]').first().click();
  await idle(page);
  check((await canvasData()) === withFx, 'un-bypassing should restore the image');

  console.log('recipe save → load round-trips the chain');
  await page.locator('summary', { hasText: 'Recipe' }).click();
  const [recipeDl] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('button', { hasText: 'Save recipe' }).click(),
  ]);
  const recipePath = 'out/smoke-recipe.json';
  await recipeDl.saveAs(recipePath);

  console.log('bake clears the chain; undo brings it back; redo re-bakes');
  await page.locator('button', { hasText: 'Bake' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.effect-card').length === 0);
  await idle(page);
  check((await canvasData()) === withFx, 'baked image should look like the previewed one');
  await page.keyboard.press('Control+z');
  await idle(page);
  check((await cards()) === 2, `undo after bake should restore 2 effects, got ${await cards()}`);
  await page.keyboard.press('Control+Shift+z');
  await idle(page);
  check((await cards()) === 0, 'redo should re-apply the bake');

  await page.setInputFiles('input[type=file][accept=".json,application/json"]', recipePath);
  await page.waitForFunction(() => document.querySelectorAll('.effect-card').length === 2);
  await idle(page);
  await shot(page, '5-recipe-loaded');

  console.log('big image: preview uses the proxy, export is full resolution');
  await page.setInputFiles('input[type=file][accept="image/*"]', 'public/test/big.png');
  await page.waitForFunction(() => document.querySelector('.status')?.textContent?.includes('4000×3000'));
  await idle(page);
  const status = await page.locator('.status').textContent();
  if (!status?.includes('preview 1024×768')) errors.push(`expected a 1024×768 preview, status: ${status}`);
  await shot(page, '6-big-preview');
  console.log('  …then refines to full res when idle');
  await page.waitForFunction(() => document.querySelector('.status')?.textContent?.includes('full res'), null, { timeout: 30_000 });
  await shot(page, '7-big-refined');
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    page.locator('button', { hasText: 'Export PNG' }).click(),
  ]);
  const exported = 'out/smoke-export.png';
  await download.saveAs(exported);
  const { default: sharp } = await import('sharp');
  const meta = await sharp(exported).metadata();
  console.log(`  exported ${download.suggestedFilename()} at ${meta.width}×${meta.height}`);
  if (meta.width !== 4000 || meta.height !== 3000) errors.push(`export should be 4000×3000, got ${meta.width}×${meta.height}`);

  if (errors.length) throw new Error('page errors');
  console.log('ok');
} catch (err) {
  await shot(page, 'failed').catch(() => {});
  for (const e of errors) console.error(`page error: ${e}`);
  throw err;
} finally {
  await browser.close();
}
