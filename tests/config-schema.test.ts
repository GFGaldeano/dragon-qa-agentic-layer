import {
  describe,
  expect,
  it
} from "vitest";

import {
  DragonConfigSchema
} from "../src/core/config/schema";

const baseConfig = {
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

describe("DragonConfigSchema", () => {
  it("keeps deterministic configuration backward compatible", () => {
    const parsed =
      DragonConfigSchema.parse(
        baseConfig
      );

    expect(
      parsed.providers.planner
    ).toBe("deterministic");

    expect(
      parsed.providers.plannerModel
    ).toBeUndefined();
  });

  it("accepts openai-compatible planner model configuration", () => {
    const parsed =
      DragonConfigSchema.parse({
        ...baseConfig,

        providers: {
          planner: "llm",
          failureAnalyzer:
            "deterministic",

          plannerModel: {
            type:
              "openai-compatible",

            baseUrl:
              "https://api.example.com/v1",

            model:
              "test-model",

            apiKeyEnv:
              "DRAGON_QA_LLM_API_KEY"
          }
        }
      });

    expect(
      parsed.providers.plannerModel
    ).toEqual({
      type:
        "openai-compatible",

      baseUrl:
        "https://api.example.com/v1",

      model:
        "test-model",

      apiKeyEnv:
        "DRAGON_QA_LLM_API_KEY"
    });
  });

  it("allows a planner model without api key environment for local endpoints", () => {
    const parsed =
      DragonConfigSchema.parse({
        ...baseConfig,

        providers: {
          planner: "llm",
          failureAnalyzer:
            "deterministic",

          plannerModel: {
            type:
              "openai-compatible",

            baseUrl:
              "http://localhost:11434/v1",

            model:
              "local-model"
          }
        }
      });

    expect(
      parsed.providers
        .plannerModel
        ?.apiKeyEnv
    ).toBeUndefined();
  });

  it("rejects invalid planner model URLs", () => {
    expect(() =>
      DragonConfigSchema.parse({
        ...baseConfig,

        providers: {
          planner: "llm",
          failureAnalyzer:
            "deterministic",

          plannerModel: {
            type:
              "openai-compatible",

            baseUrl:
              "not-a-url",

            model:
              "test-model"
          }
        }
      })
    ).toThrow();
  });

  it("rejects empty planner model names", () => {
    expect(() =>
      DragonConfigSchema.parse({
        ...baseConfig,

        providers: {
          planner: "llm",
          failureAnalyzer:
            "deterministic",

          plannerModel: {
            type:
              "openai-compatible",

            baseUrl:
              "https://api.example.com/v1",

            model:
              "   "
          }
        }
      })
    ).toThrow();
  });
});
