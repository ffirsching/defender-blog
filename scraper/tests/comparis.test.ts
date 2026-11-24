import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildComparisOutputFilename } from '../src/config/comparisTargets.js';
import {
  extractComparisAdData,
  extractComparisListings,
  extractComparisListingUrls,
  extractComparisMaxPage,
  listingFromComparisAdData,
} from '../src/scrapers/comparis.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.resolve(__dirname, '..', 'data', 'comparisscraper-page.html'), 'utf8');

test('extracts structured listings from the Comparis snapshot', () => {
  const listings = extractComparisListings(html);

  assert.ok(listings.length > 0, 'expected at least one listing to be extracted');

  const listingWithDetails = listings.find((listing) => listing.priceChf === 59900);
  assert.ok(listingWithDetails, 'expected a listing with the known CHF price');

  assert.equal(listingWithDetails?.title, 'Ineos Grenadier 3.0 Fieldmaster Edition');
  assert.equal(listingWithDetails?.mileageKm, 3900);
  assert.equal(listingWithDetails?.year, 2025);
  assert.equal(listingWithDetails?.transmission, 'Automat');
  assert.equal(listingWithDetails?.horsepower, 286);
  assert.equal(listingWithDetails?.fuelType, 'Benzin');
  assert.equal(listingWithDetails?.location, '5702 (AG)');
  assert.equal(listingWithDetails?.source, 'comparis');
  assert.match(listingWithDetails?.url ?? '', /\/carfinder\/marktplatz\/details\/show\//);
});

test('detects max Comparis pagination page from the snapshot', () => {
  const maxPage = extractComparisMaxPage(html);

  assert.equal(maxPage, 7, 'expected the pagination to contain 7 pages');
});

test('derives a dataset-specific output filename from the configured key', () => {
  const outputFile = buildComparisOutputFilename({ key: 'defender-2007-2015', label: 'Defender 2007-2015', url: 'https://example.com' });

  assert.equal(outputFile, 'comparis-defender-2007-2015.json');
});

test('extracts and deduplicates Comparis listing URLs', () => {
  const urls = extractComparisListingUrls(`
    <a href="https://www.comparis.ch/carfinder/marktplatz/details/show/33801562">One</a>
    <a href="/carfinder/marktplatz/details/show/33801562">Duplicate</a>
    <a href="https://www.comparis.ch/carfinder/marktplatz/details/show/33828127">Two</a>
  `);

  assert.deepEqual(urls, [
    'https://www.comparis.ch/carfinder/marktplatz/details/show/33801562',
    'https://www.comparis.ch/carfinder/marktplatz/details/show/33828127',
  ]);
});

test('extracts adData from NEXT_DATA and maps it to a listing', () => {
  const html = `
    <script id="__NEXT_DATA__" type="application/json">
      ${JSON.stringify({
        props: {
          pageProps: {
            adData: {
              Id: 33801562,
              SharingUrl: 'https://www.comparis.ch/carfinder/marktplatz/details/show/33801562',
              OriginalTitle: 'LAND-ROVER 2.2 TD4 SW Adventure',
              ImageUrls: ['https://example.com/defender.jpg'],
              MainInformation: {
                CreateDate: '2026-11-12T13:09:20.447',
                MakeLabel: 'Land Rover',
                ModelGroupLabel: 'Defender',
                ModelLabel: 'Defender',
                TypeText: 'Defender 110 2.2 TD4 Station Wagon Adventure',
                Mileage: 158000,
                MileageText: "158'000 km",
                FirstRegistrationDateText: '11.2015',
              },
              Overview: {
                FuelType: 'Diesel',
                Transmission: 'Manuell',
                EngineInfo: '122 PS',
                BodyType: 'SUV',
              },
              PriceInformation: {
                Price: 48000,
                PriceText: "CHF 48'000",
                MarketPrice: 60200,
              },
              PartnerInformation: { Name: 'AutoScout24' },
              ContactInformation: {
                AdvertiserInformation: {
                  Name: 'Boris',
                  Street: null,
                  ZipAndCity: '6900 Lugano',
                  Phone: null,
                },
              },
            },
          },
        },
      })}
    </script>
  `;

  const adData = extractComparisAdData(html);
  assert.ok(adData);

  const listing = listingFromComparisAdData(adData, 'https://www.comparis.ch/carfinder/marktplatz/details/show/33801562');
  assert.ok(listing);
  assert.equal(listing?.title, 'LAND-ROVER 2.2 TD4 SW Adventure');
  assert.equal(listing?.priceChf, 48000);
  assert.equal(listing?.mileageKm, 158000);
  assert.equal(listing?.year, 2015);
  assert.equal(listing?.horsepower, 122);
  assert.equal(listing?.fuelType, 'Diesel');
  assert.equal(listing?.location, '6900 Lugano');
  assert.equal(listing?.partnerName, 'AutoScout24');
  assert.equal(listing?.imageUrl, 'https://example.com/defender.jpg');
  assert.deepEqual(listing?.priceHistory, []);
});
