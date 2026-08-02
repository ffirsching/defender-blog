import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function dumpResponseDiagnostics(page: any, label: string) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outputDir = path.resolve(__dirname, '..', '..', 'data');
  mkdirSync(outputDir, { recursive: true });

  const title = await page.title().catch(() => '');
  const content = await page.content().catch(() => '');
  const url = page.url();

  const response = await page.evaluate(() => 'body-preview').catch(() => '');
  const htmlPath = path.join(outputDir, `${label}-page.html`);
  const textPath = path.join(outputDir, `${label}-body.txt`);

  writeFileSync(htmlPath, content, 'utf8');
  writeFileSync(textPath, `${title}\n\nURL: ${url}\n\nBODY:\n${response}`, 'utf8');

  console.log(`[diagnostics] saved ${htmlPath}`);
  console.log(`[diagnostics] title: ${title}`);
  console.log(`[diagnostics] url: ${url}`);
  console.log(`[diagnostics] body preview: ${response.slice(0, 500)}`);
}
