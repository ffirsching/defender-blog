import test from 'node:test';
import assert from 'node:assert/strict';
import { AutoScout24Scraper } from '../src/scrapers/autoscout24.js';

test('AutoScout24 scraper can initialize and produce a result list shape', async () => {
  const scraper = new AutoScout24Scraper();
  const listings = await scraper.run();
  assert.ok(Array.isArray(listings));
  if (listings.length > 0) {
    const first = listings[0];
    assert.ok(first.title);
    assert.ok(first.url);
    assert.ok(first.source);
  }
});
