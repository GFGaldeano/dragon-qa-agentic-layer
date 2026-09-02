import { describe, expect, it } from "vitest";

import {
  DragonConfig
} from "../src/core/config/schema";

import {
  PlannerModelClient
} from "../src/providers/planner/llm/planner-model-client";

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

  it("keeps deterministic availability automated in assist mode", async () => {
    const provider =
      resolvePlannerProvider(baseConfig);

    const plan =
      await provider.createPlan({
        text:
          "The website must be reachable"
      });

    expect(
      plan.scenarios[0].executionMode
    ).toBe("automated");

    expect(
      plan.scenarios.slice(1).every(
        (scenario) =>
          scenario.executionMode ===
          "manual-review"
      )
    ).toBe(true);
  });

  it("prevents deterministic execution in observe mode", async () => {
    const config: DragonConfig = {
      ...baseConfig,
      autonomy: {
        level: "observe"
      }
    };

    const provider =
      resolvePlannerProvider(config);

    const plan =
      await provider.createPlan({
        text:
          "The website must be reachable"
      });

    expect(
      plan.scenarios.every(
        (scenario) =>
          scenario.executionMode ===
          "manual-review"
      )
    ).toBe(true);
  });

  it("resolves llm planner provider when a model client is supplied", () => {
    const client: PlannerModelClient = {
      name: "fake",

      async generate() {
        return JSON.stringify({
          scenarios: [
            {
              title: "Generated scenario",
              description:
                "Validate generated behavior",
              kind: "happy-path",
              priority: "high",
              expectedResult:
                "Expected behavior is observed"
            }
          ]
        });
      }
    };

    const config: DragonConfig = {
      ...baseConfig,
      providers: {
        ...baseConfig.providers,
        planner: "llm"
      }
    };

    const provider =
      resolvePlannerProvider(
        config,
        {
          plannerModelClient: client
        }
      );

    expect(provider.name).toBe("llm");

    expect(typeof provider.createPlan).toBe(
      "function"
    );
  });

  it("fails closed when llm planner has no model client", () => {
    const config: DragonConfig = {
      ...baseConfig,
      providers: {
        ...baseConfig.providers,
        planner: "llm"
      }
    };

    expect(() =>
      resolvePlannerProvider(config)
    ).toThrow(
      "Planner model client is required for llm planner provider"
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
