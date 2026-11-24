import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildComparisOutputFilename } from '../src/config/comparisTargets.js';
import { extractComparisListings, extractComparisMaxPage } from '../src/scrapers/comparis.js';

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
