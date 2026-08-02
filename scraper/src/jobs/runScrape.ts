import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { AutoScout24Scraper } from '../scrapers/autoscout24.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, '..', '..', env.outputDir);
mkdirSync(outputDir, { recursive: true });

async function main() {
  const scraper = new AutoScout24Scraper();
  const listings = await scraper.run();
  const outputPath = path.join(outputDir, 'autoscout24-listings.json');
  writeFileSync(outputPath, JSON.stringify(listings, null, 2));
  console.log(`Scraped ${listings.length} listings and saved them to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
