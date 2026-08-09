// services/config.ts

import fs from "fs";
import path from "path";
import YAML from "yaml";

export interface ScraperModel {
    name: string;
    url: string;
}

export interface ScraperConfig {
    models: ScraperModel[];
}

export function loadConfig(): ScraperConfig {
    const file = fs.readFileSync(
        path.join(process.cwd(), "src/config/comparis-config.yaml"),
        "utf8",
    );

    return YAML.parse(file);
}