import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { extractComparisListings } from '../src/scrapers/comparis.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.resolve(__dirname, '..', 'data', 'comparisscraper-page.html'), 'utf8');

test('extracts structured listings from the Comparis snapshot', () => {
  const listings = extractComparisListings(html);

  assert.ok(listings.length > 0, 'expected at least one listing to be extracted');

  const listingWithDetails = listings.find((listing) => listing.priceChf === 14900);
  assert.ok(listingWithDetails, 'expected a listing with the known CHF price');

  assert.equal(listingWithDetails?.title, 'Land Rover Defender 130 2.2 TD4 Chassis Cab');
  assert.equal(listingWithDetails?.mileageKm, 134000);
  assert.equal(listingWithDetails?.year, 2012);
  assert.equal(listingWithDetails?.transmission, 'Schaltgetriebe');
  assert.equal(listingWithDetails?.horsepower, 122);
  assert.equal(listingWithDetails?.fuelType, 'Diesel');
  assert.equal(listingWithDetails?.location, '1870 (VS)');
  assert.equal(listingWithDetails?.source, 'comparis');
  assert.match(listingWithDetails?.url ?? '', /\/carfinder\/marktplatz\/details\/show\//);
});

test('detects max Comparis pagination page from the snapshot', () => {
  const maxPage = extractComparisMaxPage(html);

  assert.equal(maxPage, 14, 'expected the pagination to contain 14 pages');
});
