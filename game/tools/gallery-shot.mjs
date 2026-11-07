// Screenshot the dev texture gallery: node tools/gallery-shot.mjs <out.png> "<query string>" [port]
// Starts its own Vite dev server on the given port (default 5190) and stops it afterwards.
import { chromium } from 'playwright';
import { createServer } from 'vite';

const [out = 'screens/gallery.png', query = '', portArg] = process.argv.slice(2);
const port = Number(portArg ?? 5190);
const server = await createServer({ server: { port, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const url = `http://127.0.0.1:${server.config.server.port ?? port}/gallery.html?${query}`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__galleryReady === true, null, { timeout: 60000 });
  await page.waitForTimeout(300);
  const canvas = await page.$('canvas');
  await canvas.screenshot({ path: out });
  console.log(`saved ${out}`);
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exitCode = 1; }
} finally {
  await browser.close();
  await server.close();
}
