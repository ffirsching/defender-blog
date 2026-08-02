import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'playwright';
import { env } from '../config/env.js';
import { dumpResponseDiagnostics } from '../utils/diagnostics.js';

chromium.use(StealthPlugin());

export abstract class BaseScraper {
  protected browser?: Browser;
  protected page?: Page;

  protected async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });

    const context = await this.browser.newContext({
      viewport: { width: 1440, height: 1400 },
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'de-DE',
      timezoneId: 'Europe/Zurich',
      permissions: [],
      ignoreHTTPSErrors: true,
    });

    this.page = await context.newPage();
    await this.page.addInitScript(() => {
      const nav = navigator as Navigator & { webdriver?: unknown; plugins?: unknown; languages?: unknown; platform?: unknown };
      Object.defineProperty(nav, 'webdriver', { get: () => undefined });
      Object.defineProperty(nav, 'plugins', { get: () => [1, 2, 3] });
      Object.defineProperty(nav, 'languages', { get: () => ['de-DE', 'de', 'en'] });
      Object.defineProperty(nav, 'platform', { get: () => 'Linux x86_64' });
      Object.defineProperty(globalThis, 'chrome', { value: {}, configurable: true });
    });

    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'Upgrade-Insecure-Requests': '1',
    });
  }

  protected async close(): Promise<void> {
    await this.page?.close();
    await this.browser?.close();
  }

  protected async waitForPageLoad(): Promise<void> {
    if (!this.page) return;
    try {
      await this.page.waitForLoadState('networkidle', { timeout: env.timeoutMs });
    } catch (error) {
      console.warn('[scraper] networkidle timed out; capturing diagnostics and continuing');
      await dumpResponseDiagnostics(this.page, this.constructor.name.toLowerCase());
    }
  }

  protected async delay(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, env.delayMs));
  }
}
