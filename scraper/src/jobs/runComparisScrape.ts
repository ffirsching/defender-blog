import { ComparisScraper } from "../scrapers/comparis.ts";
import { loadConfig } from "../services/config.ts";
import type { Listing } from '../models/Listing.ts';
import fs from "fs/promises";
import path from "path";

const config = loadConfig();

for (const model of config.models) {

    console.log(`Scraping ${model.name}`);

    const scraper = new ComparisScraper(
        model.url,
        model.name,
    );

    const listings = await scraper.run();

    await saveListings(model.name, listings);
}

async function saveListings(name: string, listings: Listing[]) {

    const filename = `${slugify(name)}.json`;

    await fs.mkdir(
        path.join(process.cwd(), "scraper/data"),
        { recursive: true }
    );

    await fs.writeFile(
        path.join(process.cwd(), "../public/data", filename),
        JSON.stringify(listings, null, 2),
        "utf8"
    );

    console.log(`Saved ${listings.length} listings -> ${filename}`);
}

function slugify(name: string) {
  return 'comparis-'.concat(
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""));
}