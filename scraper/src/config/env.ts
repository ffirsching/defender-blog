import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: path.resolve(fileURLToPath(new URL('..', import.meta.url)), '../.env') });

export const env = {
  source: process.env.SCRAPER_SOURCE ?? 'autoscout24',
  baseUrl: process.env.SCRAPER_BASE_URL ?? 'https://www.autoscout24.ch',
  fixturePath: process.env.SCRAPER_FIXTURE_PATH || '',
  outputDir: process.env.SCRAPER_OUTPUT_DIR ?? './data',
  delayMs: Number(process.env.SCRAPER_DELAY_MS ?? 1500),
  timeoutMs: Number(process.env.SCRAPER_TIMEOUT_MS ?? 30000),
};
