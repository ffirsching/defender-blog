import { ComparisScraper } from "../scrapers/comparis.js";
import { loadConfig } from "../services/config.js";
import type { Listing } from '../models/Listing.js';
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
    const outputPath = path.join(process.cwd(), "../public/data", filename);

    await fs.mkdir(
        path.dirname(outputPath),
        { recursive: true }
    );

    // Check if file exists and load existing listings
    let existingListings: Listing[] = [];
    try {
        const existingData = await fs.readFile(outputPath, 'utf-8');
        existingListings = JSON.parse(existingData);
    } catch (err) {
        // File doesn't exist, start fresh
        if (!(err instanceof Error) || !('code' in err) || err.code !== 'ENOENT') throw err;
    }

    // Build URL -> listing index maps for both existing and new listings
    const existingByUrl = new Map<string, Listing>();
    for (const listing of existingListings) {
        existingByUrl.set(listing.url, listing);
    }

    const newByUrl = new Map<string, Listing>();
    for (const listing of listings) {
        newByUrl.set(listing.url, listing);
    }

    // Merge listings and build price history
    const mergedListings: Listing[] = [];
    const allUrls = new Set([...existingByUrl.keys(), ...newByUrl.keys()]);

    for (const url of allUrls) {
        const existing = existingByUrl.get(url);
        const newListing = newByUrl.get(url);

        if (!existing && newListing) {
            // Brand new listing - initialize price history with current scrape
            mergedListings.push({
                ...newListing,
                scrapedAt: new Date().toISOString(),
                priceHistory: [
                    {
                        priceChf: newListing.priceChf ?? 0,
                        timestamp: new Date().toISOString(),
                    },
                ],
            });
        } else if (existing && newListing) {
            // Existing listing with new data - update and append to price history
            const updatedListing: Listing = { ...newListing };

            // Initialize priceHistory if it doesn't exist (backward compatibility)
            const existingPriceHistory = existing.priceHistory || [];

            // Append new price to history
            const newPriceEntry = {
                priceChf: newListing.priceChf ?? 0,
                timestamp: new Date().toISOString(),
            };

            // Check if price changed (avoid duplicate entries for same price)
            const lastPriceEntry = existingPriceHistory[existingPriceHistory.length - 1];
            if (!lastPriceEntry || lastPriceEntry.priceChf !== newPriceEntry.priceChf) {
                updatedListing.priceHistory = [
                    ...existingPriceHistory,
                    newPriceEntry,
                ];
            } else {
                // Price unchanged - just keep existing history with updated timestamp on last entry
                updatedListing.priceHistory = [
                    ...existingPriceHistory.slice(0, -1),
                    {
                        priceChf: lastPriceEntry.priceChf,
                        timestamp: new Date().toISOString(),
                    },
                ];
            }

            mergedListings.push(updatedListing);
        } else if (existing && !newListing) {
            // Listing no longer available - keep as-is but update scrapedAt and ensure priceHistory exists
            const listingWithHistory: Listing = { ...existing, scrapedAt: new Date().toISOString() };
            if (!listingWithHistory.priceHistory) {
                listingWithHistory.priceHistory = [];
            }
            mergedListings.push(listingWithHistory);
        }
    }

    await fs.writeFile(outputPath, JSON.stringify(mergedListings, null, 2), "utf-8");

    const newCount = listings.length;
    console.log(`Saved ${newCount} new listings (total: ${mergedListings.length}) -> ${filename}`);
}

function slugify(name: string) {
  return 'comparis-'.concat(
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""));
}