import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

import {
  DragonConfig,
  DragonConfigSchema
} from "./schema";

export function loadDragonConfig(
  filePath = "dragon-qa.config.yaml"
): DragonConfig {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `DRAGON QA configuration not found: ${absolutePath}`
    );
  }

  const raw = fs.readFileSync(absolutePath, "utf8");
  const parsed = YAML.parse(raw);

  return DragonConfigSchema.parse(parsed);
}