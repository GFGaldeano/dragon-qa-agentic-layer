import { describe, expect, it } from "vitest";

import {
  DragonConfig
} from "../src/core/config/schema";

import {
  resolvePlannerProvider
} from "../src/providers/planner/planner-provider-resolver";

const baseConfig: DragonConfig = {
  project: {
    name: "test-project",
    baseUrl: "https://example.com"
  },
  autonomy: {
    level: "assist"
  },
  testing: {
    ui: true,
    api: false,
    accessibility: false,
    visual: false
  },
  browser: {
    engine: "chromium",
    headless: true,
    timeoutMs: 30000
  },
  evidence: {
    screenshots: true,
    trace: true,
    video: false
  },
  reporting: {
    markdown: true,
    json: true
  },
  providers: {
    planner: "deterministic",
    failureAnalyzer: "deterministic"
  }
};

describe("resolvePlannerProvider", () => {
  it("resolves deterministic planner provider", () => {
    const provider =
      resolvePlannerProvider(baseConfig);

    expect(provider.name).toBe("deterministic");

    expect(typeof provider.createPlan).toBe(
      "function"
    );
  });

  it("rejects unsupported planner providers", () => {
    const config = {
      ...baseConfig,
      providers: {
        ...baseConfig.providers,
        planner: "unsupported-provider"
      }
    } as DragonConfig;

    expect(() =>
      resolvePlannerProvider(config)
    ).toThrow(
      "Unsupported planner provider: unsupported-provider"
    );
  });
});
