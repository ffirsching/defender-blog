import * as cheerio from 'cheerio';
import { env } from '../config/env.js';
import type { Listing } from '../models/Listing.js';
import { normalizeMileage, normalizePrice, normalizeText, normalizeYear } from '../services/normalize.js';
import { BaseScraper } from './base.js';

export class AutoScout24Scraper extends BaseScraper {
  async run(): Promise<Listing[]> {
    await this.init();
    try {
      const targetUrl = 
      'https://www.autoscout24.ch/de/s/mo-defender/mk-land-rover?firstRegistrationYearTo=2015';
      if (!this.page) throw new Error('Playwright page was not initialized.');
      const response = await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: env.timeoutMs });
      console.log(`[scraper] response status=${response?.status() ?? 'unknown'} url=${response?.url() ?? this.page.url()}`);
      console.log(`[scraper] response content-type=${response?.headers()['content-type'] ?? 'unknown'}`);
      await this.waitForPageLoad();
      await this.delay();

      const html = await this.page.content();
      const bodyText = await this.page.locator('body').innerText().catch(() => '');
      console.log(`[scraper] body preview=${bodyText.slice(0, 600)}`);
      const $ = cheerio.load(html);
      const listings: Listing[] = [];

      $('a[href*="/de/"].cl-listing').each((_, element) => {
        const url = $(element).attr('href');
        const title = normalizeText($(element).find('[data-testid="listing-title"]').first().text()) ?? normalizeText($(element).text());
        const priceText = normalizeText($(element).find('[data-testid="price"]').first().text());
        const metadataText = normalizeText($(element).find('[data-testid="vehicle-info"]').first().text());
        const mileageText = metadataText?.match(/([0-9.]+)\s*km/i)?.[1];
        const yearText = metadataText?.match(/(19|20)\d{2}/)?.[0];

        if (!url) return;

        listings.push({
          title: title ?? 'Untitled vehicle',
          url: url.startsWith('http') ? url : `https://www.autoscout24.ch${url}`,
          priceChf: normalizePrice(priceText),
          mileageKm: normalizeMileage(mileageText),
          year: normalizeYear(yearText),
          location: undefined,
          source: 'autoscout24',
          scrapedAt: new Date().toISOString(),
        });
      });

      return listings;
    } finally {
      await this.close();
    }
  }
}
