import * as cheerio from 'cheerio';
import { env } from '../config/env.js';
import type { Listing } from '../models/Listing.js';
import { normalizeMileage, normalizePrice, normalizeText, normalizeYear } from '../services/normalize.js';
import { BaseScraper } from './base.js';

function normalizeTitle(value?: string | null): string | undefined {
  return normalizeText(value)?.replace(/\s+/g, ' ').replace(/\n/g, ' ').trim();
}

function parseHorsepower(value?: string | null): number | undefined {
  if (!value) return undefined;
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : undefined;
}

export function extractComparisMaxPage(html: string): number {
  const $ = cheerio.load(html);
  let maxPage = 1;

  $('[data-css-selector]').each((_, element) => {
    const selector = $(element).attr('data-css-selector') ?? '';
    const match = selector.match(/^pagination-item-(\d+)$/);
    if (match) {
      const page = Number(match[1]);
      if (!Number.isNaN(page) && page > maxPage) maxPage = page;
    }
  });

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href') ?? '';
    const text = $(element).text().trim();

    const match = href.match(/[?&](?:pagination%5Bpage%5D|page)=(\d+)/);
    if (match) {
      const page = Number(match[1]);
      if (!Number.isNaN(page) && page > maxPage) maxPage = page;
    }

    const textPage = Number(text);
    if (!Number.isNaN(textPage) && textPage > maxPage) {
      maxPage = textPage;
    }
  });

  return maxPage;
}

function buildComparisPageUrl(baseUrl: string, page: number): string {
  const url = new URL(baseUrl);
  url.searchParams.delete('page');
  url.searchParams.delete('pagination[page]');
  url.searchParams.set('pagination[page]', String(page));
  return url.toString();
}

function extractComparisInitialResultData(html: string) {
  const $ = cheerio.load(html);

  for (const element of $('script').toArray()) {
    const text = $(element).html();
    if (!text || !text.includes('resultItems')) continue;

    try {
      const payload = JSON.parse(text);
      if (payload?.props?.pageProps?.initialResultData) {
        return payload.props.pageProps.initialResultData as Record<string, unknown>;
      }
      if (Array.isArray(payload.resultItems)) {
        return payload as Record<string, unknown>;
      }
      if (payload?.initialResultData?.resultItems) {
        return payload.initialResultData as Record<string, unknown>;
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

function extractComparisItemUrlMap(html: string) {
  const $ = cheerio.load(html);
  const urlMap = new Map<number, string>();

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).html() ?? '';
    try {
      const payload = JSON.parse(raw);
      if (!Array.isArray(payload.itemListElement)) return;

      for (const item of payload.itemListElement) {
        if (!item || typeof item !== 'object') continue;
        const url = typeof item.url === 'string' ? item.url : undefined;
        if (!url) continue;

        const match = url.match(/(\d+)/);
        const adId = match ? Number(match[1]) : undefined;
        if (!adId || Number.isNaN(adId)) continue;

        const normalizedUrl = url.startsWith('http') ? url : `https://www.comparis.ch${url}`;
        urlMap.set(adId, normalizedUrl);
      }
    } catch {
      // ignore invalid JSON
    }
  });

  return urlMap;
}

export function extractComparisListings(html: string): Listing[] {
  const listings: Listing[] = [];
  const resultData = extractComparisInitialResultData(html);
  const itemUrlMap = extractComparisItemUrlMap(html);

  if (resultData) {
    const resultItems = resultData.resultItems;
    if (Array.isArray(resultItems)) {
      for (const item of resultItems) {
        if (!item || typeof item !== 'object') continue;

        const adId = typeof item.AdID === 'number' ? item.AdID : undefined;
        const url = itemUrlMap.get(adId ?? NaN) ?? (adId ? `https://www.comparis.ch/carfinder/marktplatz/details/show/${adId}` : undefined);
        const make = normalizeText(typeof item.Make === 'string' ? item.Make : undefined);
        const model = normalizeText(typeof item.Model === 'string' ? item.Model : undefined);
        const type = normalizeText(typeof item.Type === 'string' ? item.Type : undefined);
        const partnerName = normalizeText(typeof item.PartnerName === 'string' ? item.PartnerName : undefined);
        const specifications = item.Specifications && typeof item.Specifications === 'object' ? item.Specifications as Record<string, unknown> : {};

        let title = type;
        if (title && make && !title.toLowerCase().startsWith(make.toLowerCase())) {
          title = `${make} ${title}`;
        }
        if (!title && make && model) {
          title = `${make} ${model}`;
        }

        const priceChf = typeof item.Price === 'number' ? item.Price : normalizePrice(typeof item.Price === 'string' ? item.Price : undefined);
        const mileageKm = normalizeMileage(typeof specifications.Mileage === 'string' ? specifications.Mileage : undefined);
        const year = normalizeYear(typeof specifications.MatriculationDate === 'string' ? specifications.MatriculationDate : undefined);
        const transmission = normalizeText(typeof specifications.Transmission === 'string' ? specifications.Transmission : undefined);
        const horsepower = parseHorsepower(typeof specifications.Power === 'string' ? specifications.Power : undefined);
        const fuelType = normalizeText(typeof specifications.FuelType === 'string' ? specifications.FuelType : undefined);
        const location = normalizeText(typeof specifications.Location === 'string' ? specifications.Location : undefined);

        listings.push({
          title: title ?? 'Untitled listing',
          url: url ?? 'https://www.comparis.ch',
          source: 'comparis',
          scrapedAt: new Date().toISOString(),
          priceChf,
          mileageKm,
          year,
          transmission,
          horsepower,
          fuelType,
          location,
          partnerName,
          make,
          model,
          type,
          vehicleType: normalizeText(typeof item.VehicleType === 'string' ? item.VehicleType : undefined),
          bodyType: item.BodyType === null ? null : normalizeText(typeof item.BodyType === 'string' ? item.BodyType : undefined),
          marketPrice: typeof item.MarketPrice === 'number' ? item.MarketPrice : undefined,
          currency: typeof item.Currency === 'string' ? item.Currency : undefined,
          comparisRating: typeof item.ComparisRating === 'number' ? item.ComparisRating : undefined,
          imageUrl: normalizeText(typeof item.ImageUrl === 'string' ? item.ImageUrl : undefined),
          desktopImageUrl: normalizeText(typeof item.DesktopImageUrl === 'string' ? item.DesktopImageUrl : undefined),
          mobileImageUrl: normalizeText(typeof item.MobileImageUrl === 'string' ? item.MobileImageUrl : undefined),
          priceDevelopmentDirection: typeof item.PriceDevelopmentDirection === 'number' ? item.PriceDevelopmentDirection : undefined,
          advertiserName: normalizeText(typeof item.ContactInformation?.AdvertiserInformation?.Name === 'string' ? item.ContactInformation.AdvertiserInformation.Name : undefined),
          advertiserStreet: item.ContactInformation?.AdvertiserInformation?.Street ?? null,
          advertiserZipAndCity: normalizeText(typeof item.ContactInformation?.AdvertiserInformation?.ZipAndCity === 'string' ? item.ContactInformation.AdvertiserInformation.ZipAndCity : undefined),
          advertiserPhone: normalizeText(typeof item.ContactInformation?.AdvertiserInformation?.Phone === 'string' ? item.ContactInformation.AdvertiserInformation.Phone : undefined),
          createDate: typeof item.CreateDate === 'string' ? item.CreateDate : undefined,
        });
      }
    }
  }

  if (listings.length > 0) {
    return listings;
  }

  const $ = cheerio.load(html);
  const detailRows = $('div').toArray().filter((element) => {
    const text = normalizeText($(element).text());
    return !!text && /CHF\s*\d[\d'\.\s]*/.test(text);
  });

  const seenUrls = new Set<string>();
  const cards = $('script[type="application/ld+json"]')
    .map((_, element) => {
      const raw = $(element).html() ?? '';
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })
    .get()
    .filter((value): value is Record<string, unknown> => Boolean(value));

  for (const payload of cards) {
    const itemList = payload.itemListElement;
    if (!Array.isArray(itemList)) continue;

    for (const item of itemList) {
      if (!item || typeof item !== 'object') continue;
      const candidate = item as Record<string, unknown>;
      const url = typeof candidate.url === 'string' ? candidate.url : undefined;
      const name = typeof candidate.name === 'string' ? candidate.name : undefined;
      if (!url || !name) continue;

      const normalizedUrl = url.startsWith('http') ? url : `https://www.comparis.ch${url}`;
      if (seenUrls.has(normalizedUrl)) continue;
      seenUrls.add(normalizedUrl);

      listings.push({
        title: normalizeTitle(name) ?? 'Untitled listing',
        url: normalizedUrl,
        source: 'comparis',
        scrapedAt: new Date().toISOString(),
      });
    }
  }

  for (const row of detailRows) {
    const rowText = normalizeText($(row).text()) ?? '';
    const priceMatch = rowText.match(/CHF\s*([\d'\.]+)/i);
    const mileageMatch = rowText.match(/([\d\.]+)\s*km/i);
    const yearMatch = rowText.match(/(\d{2}\.\d{4})/);
    const transmissionMatch = rowText.match(/(Schaltgetriebe|Automatik|Tiptronic|DSG)/i);
    const horsepowerMatch = rowText.match(/(\d+)\s*PS/i);
    const fuelMatch = rowText.match(/(Diesel|Benzin|Hybrid|Elektro|Benzin\/Diesel|Gas)/i);
    const locationMatch = rowText.match(/\b(\d{4}\s*\(VS\)|\d{4}\s*\(ZH\)|\d{4}\s*\(BE\)|[A-Za-zÄÖÜäöüéèêàùûç\- ]+)\b/i);

    const price = priceMatch ? normalizePrice(priceMatch[1]) : undefined;
    const mileage = mileageMatch ? normalizeMileage(mileageMatch[1]) : undefined;
    const year = yearMatch ? normalizeYear(yearMatch[1]) : undefined;
    const transmission = transmissionMatch ? normalizeText(transmissionMatch[1]) : undefined;
    const horsepower = horsepowerMatch ? parseHorsepower(horsepowerMatch[1]) : undefined;
    const fuelType = fuelMatch ? normalizeText(fuelMatch[1]) : undefined;
    const location = locationMatch ? normalizeText(locationMatch[1]) : undefined;

    const anchor = $(row).find('a').first();
    const title = normalizeTitle(anchor.attr('title') ?? anchor.text() ?? undefined);
    const url = anchor.attr('href');
    if (!title && !url) continue;

    const normalizedUrl = url?.startsWith('http') ? url : url ? `https://www.comparis.ch${url}` : undefined;
    const index = listings.findIndex((listing) => normalizedUrl && listing.url === normalizedUrl);
    if (index >= 0) {
      listings[index] = {
        ...listings[index],
        title: title ?? listings[index].title,
        priceChf: price ?? listings[index].priceChf,
        mileageKm: mileage ?? listings[index].mileageKm,
        year: year ?? listings[index].year,
        transmission: transmission ?? listings[index].transmission,
        horsepower: horsepower ?? listings[index].horsepower,
        fuelType: fuelType ?? listings[index].fuelType,
        location: location ?? listings[index].location,
      };
    }
  }

  return listings;
}

export class ComparisScraper extends BaseScraper {
  async run(): Promise<Listing[]> {
    await this.init();
    try {
      const baseUrl = 'https://www.comparis.ch/carfinder/marktplatz?requestobject=%7B%22Make%22%3Anull%2C%22VehicleType%22%3A%222%2C3%2C4%2C6%22%2C%22Construction%22%3A%22%22%2C%22FirstMatriculationYearFrom%22%3A2007%2C%22FirstMatriculationYearTo%22%3A2015%2C%22PriceFrom%22%3Anull%2C%22PriceTo%22%3Anull%2C%22MileageFrom%22%3Anull%2C%22MileageTo%22%3Anull%2C%22MaxAdAge%22%3Anull%2C%22MinComparisPoints%22%3Anull%2C%22OutsideColor%22%3A%22%22%2C%22Transmission%22%3Anull%2C%22DriveTrain%22%3A%22%22%2C%22Co2Emission%22%3Anull%2C%22Eurocode%22%3Anull%2C%22FuelType%22%3A%22%22%2C%22PerformanceFrom%22%3Anull%2C%22PerformanceTo%22%3Anull%2C%22ConsumptionFrom%22%3Anull%2C%22ConsumptionTo%22%3Anull%2C%22SeatsFrom%22%3Anull%2C%22SeatsTo%22%3Anull%2C%22DoorsFrom%22%3Anull%2C%22DoorsTo%22%3Anull%2C%22Cantons%22%3A%22%22%2C%22ComfortOptions%22%3A%22%22%2C%22SecurityOptions%22%3A%22%22%2C%22Features%22%3A%22%22%2C%22FreeTextSearch%22%3A%22%22%2C%22CapacityFrom%22%3Anull%2C%22CapacityTo%22%3Anull%2C%22Garage%22%3Anull%2C%22Site%22%3Anull%2C%22EfficiencyCategory%22%3Anull%2C%22Sort%22%3A1%2C%22TypeTag%22%3Anull%2C%22MFK%22%3Anull%2C%22ImageRequired%22%3Anull%2C%22MakeAggregationLabelID%22%3A208431%2C%22ModelGroupAggregationLabelID%22%3A208432%2C%22ModelAggregationLabelID%22%3Anull%2C%22LeasingAvailable%22%3Anull%7D';
      if (!this.page) throw new Error('Playwright page was not initialized.');

      const firstPageResponse = await this.page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: env.timeoutMs });
      console.log(`[scraper] comparis status=${firstPageResponse?.status() ?? 'unknown'} url=${firstPageResponse?.url().substring(0,50) ?? this.page.url()}`);
      console.log(`[scraper] comparis content-type=${firstPageResponse?.headers()['content-type'] ?? 'unknown'}`);

      try {
        const consentButton = this.page.locator('button, [role="button"], a').filter({ hasText: "I Accept" }).first();
        if (await consentButton.count()) {
          await consentButton.click({ timeout: 5000 });
          await this.page.waitForTimeout(1500);
          console.log('[scraper] accepted comparis cookie banner');
        }
      } catch (error) {
        console.warn('[scraper] cookie banner interaction skipped', error);
      }

      await this.waitForPageLoad();
      await this.delay();

      const firstPageHtml = await this.page.content();
      const maxPage = extractComparisMaxPage(firstPageHtml);
      console.log(`[scraper] comparis detected maxPage=${maxPage}`);

      const allListings: Listing[] = [];
      for (let page = 1; page <= maxPage; page += 1) {
        const pageUrl = buildComparisPageUrl(baseUrl, page);
        console.log(`[scraper] comparis fetching page ${page}/${maxPage}: ${pageUrl}`);

        if (page > 1) {
          const response = await this.page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: env.timeoutMs });
          console.log(`[scraper] comparis status=${response?.status() ?? 'unknown'} url=${response?.url().substring(0,50) ?? this.page.url()}`);
          await this.waitForPageLoad();
          await this.delay();
        }

        const html = page === 1 ? firstPageHtml : await this.page.content();
        const pageListings = extractComparisListings(html).map((listing) => ({ ...listing, scrapedAt: new Date().toISOString() }));
        allListings.push(...pageListings);
      }

      return allListings;
    } finally {
      await this.close();
    }
  }
}
