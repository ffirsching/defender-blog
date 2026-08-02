# Vehicle Market Intelligence Implementation Blueprint

## Goal

Build a reliable data pipeline that collects current and historical vehicle listings from Swiss marketplaces, stores them in a structured database, and supports analysis for price benchmarking, market trend tracking, and informed buying decisions.

## Business outcome

The system should allow you to:

- track current market prices for specific vehicle models
- compare listings across Swiss regions and marketplaces
- analyze how prices change over time
- identify good buying opportunities based on historical market context

---

## Recommended architecture

Use a small ingestion platform with four layers:

1. Ingestion layer
   - Node.js + TypeScript
   - Playwright for dynamic JavaScript-heavy pages
   - Cheerio for lightweight HTML parsing

2. Storage layer
   - PostgreSQL for structured records
   - optional JSON or raw HTML snapshots stored on disk or object storage

3. Processing layer
   - normalize fields into a common schema
   - deduplicate duplicate listings
   - compute derived metrics such as price per kilometer and price trend indicators

4. Analysis layer
   - query the database directly from an Astro page or API endpoint
   - expose charts and dashboards for market comparison

---

## Database schema

A simple and scalable schema should cover sources, listings, vehicle metadata, snapshots, and execution logs.

### Core tables

```sql
CREATE TABLE sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  scraper_type VARCHAR(50) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  version VARCHAR(200),
  year INTEGER,
  fuel_type VARCHAR(50),
  transmission VARCHAR(50),
  motorization VARCHAR (100),
  mileage_km INTEGER,
  power_hp INTEGER,
  color VARCHAR(100),
  condition VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE listings (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES sources(id),
  vehicle_id INTEGER REFERENCES vehicles(id),
  listing_url TEXT NOT NULL UNIQUE,
  title TEXT,
  price_chf NUMERIC(12,2),
  currency VARCHAR(10) DEFAULT 'CHF',
  location TEXT,
  canton VARCHAR(100),
  zip_code VARCHAR(20),
  published_at TIMESTAMP,
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active',
  image_url TEXT,
  raw_payload JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE market_snapshots (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id),
  snapshot_date DATE NOT NULL,
  median_price_chf NUMERIC(12,2),
  average_price_chf NUMERIC(12,2),
  listing_count INTEGER DEFAULT 0,
  source_id INTEGER REFERENCES sources(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(vehicle_id, snapshot_date, source_id)
);

CREATE TABLE scraper_runs (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES sources(id),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(50) NOT NULL,
  items_found INTEGER DEFAULT 0,
  items_inserted INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  error_message TEXT
);

CREATE TABLE scraper_errors (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES sources(id),
  run_id INTEGER REFERENCES scraper_runs(id),
  error_message TEXT NOT NULL,
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Notes

- Keep the schema flexible enough to support multiple marketplaces.
- Store raw payloads for debugging when parsing changes.
- Use `listing_url` as the main deduplication key.
- Keep a historical snapshot table so price trends can be analyzed over time.

---

## Scraper folder structure

```text
scraper/
  package.json
  tsconfig.json
  .env.example
  src/
    config/
      sources.ts
      env.ts
    db/
      client.ts
      schema.ts
    models/
      Vehicle.ts
      Listing.ts
    services/
      normalize.ts
      deduplicate.ts
      enrich.ts
    scrapers/
      base.ts
      marketplaceA.ts
      marketplaceB.ts
    jobs/
      runScrape.ts
      backfill.ts
    utils/
      logger.ts
      retry.ts
      selectors.ts
  tests/
    scrapers/
    normalization/
  scripts/
    seed-sources.ts
```

### Responsibility of each folder

- `config/`: site-specific configuration, selectors, and environment variables
- `db/`: database client and schema helpers
- `models/`: shared interfaces and types for vehicles and listings
- `services/`: normalization, duplication handling, enrichment
- `scrapers/`: marketplace-specific scraping logic
- `jobs/`: entry points for scraping and backfill tasks
- `utils/`: shared helpers for logging, retries, and parsing

---

## Starter Node/TypeScript implementation plan

### Phase 1 — Project setup

1. Create the scraper workspace.
2. Add TypeScript support and a dev runner such as `tsx`.
3. Add core dependencies:
   - `typescript`
   - `tsx`
   - `playwright`
   - `cheerio`
   - `pg`
   - `dotenv`
   - `zod`

4. Create an environment file with:
   - database connection details
   - site URLs
   - request delays and retry settings

### Phase 2 — Database foundation

1. Create the PostgreSQL schema shown above.
2. Implement a shared database client.
3. Add simple insert/update helpers for listings and vehicles.
4. Add a script to seed the initial marketplace source configuration.

### Phase 3 — Scraper base implementation

1. Build a reusable base scraper class with:
   - browser launch and teardown
   - navigation helpers
   - retry logic
   - page timeout handling
   - structured logging

2. Define a common interface for all marketplace scrapers:
   - `run()`
   - `parseListings()`
   - `parseDetailPage()`

### Phase 4 — First marketplace MVP

1. Start with one Swiss marketplace and one vehicle category.
2. Build a scraper that:
   - loads the search results page
   - extracts listing cards
   - follows each detail page
   - parses price, mileage, year, location, and URL
3. Store each parsed result in the database.
4. Add a daily job that re-runs the scraper and updates existing listings.

### Phase 5 — Normalization and quality control

1. Normalize brand and model names into a consistent format.
2. Convert mileage and price fields into numeric values.
3. Standardize Swiss locations and canton names.
4. Prevent duplicates by matching on listing URL or a hash of key fields.
5. Flag suspicious or incomplete records for review.

### Phase 6 — Historical analysis

1. Store a daily snapshot of market prices by model and region.
2. Generate simple aggregates such as:
   - average price
   - median price
   - listing count
   - price trend by week
3. Expose these aggregates via an API or Astro page.

### Phase 7 — Production hardening

1. Add retry and backoff for transient failures.
2. Log every run and capture scraper errors.
3. Detect when a marketplace changes layout.
4. Add monitoring for empty runs, repeated failures, or sudden pricing anomalies.

---

## Suggested starter scripts

Add scripts such as:

```json
{
  "scripts": {
    "dev:scrape": "tsx src/jobs/runScrape.ts",
    "dev:backfill": "tsx src/jobs/backfill.ts",
    "test": "tsx --test"
  }
}
```

---

## Example execution flow

1. The scraper starts for a configured marketplace.
2. It loads the listing index page.
3. It extracts listing URLs.
4. It visits each listing and parses the important fields.
5. It normalizes the values.
6. It inserts or updates the record in PostgreSQL.
7. It writes a run summary and logs any failures.

---

## Implementation sequence

1. Set up the TypeScript project and database.
2. Create the core schema and database client.
3. Implement a basic scraper for one marketplace.
4. Store the first set of listings.
5. Add normalization and deduplication.
6. Build simple analytics from the stored data.
7. Expand to additional marketplaces once the first pipeline is stable.

---

## Practical recommendations

- Start with a single marketplace and a narrow vehicle segment.
- Keep the first version simple and reliable rather than broad.
- Ensure legal and policy compliance before scraping production sites.
- Prefer official APIs or partner data where available.
- Treat scraper maintenance as an ongoing part of the system.
