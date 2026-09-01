import {
  describe,
  expect,
  it
} from "vitest";

import {
  DragonConfig
} from "../src/core/config/schema";

import {
  OpenAICompatiblePlannerModelClient
} from "../src/providers/planner/llm/openai-compatible-planner-model-client";

import {
  resolvePlannerModelClient
} from "../src/providers/planner/llm/planner-model-client-resolver";

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

describe(
  "resolvePlannerModelClient",
  () => {
    it("does not create a model client for deterministic planning", () => {
      const client =
        resolvePlannerModelClient(
          baseConfig,
          {}
        );

      expect(client).toBeUndefined();
    });

    it("fails closed when llm planning has no model configuration", () => {
      const config: DragonConfig = {
        ...baseConfig,

        providers: {
          ...baseConfig.providers,
          planner: "llm"
        }
      };

      expect(() =>
        resolvePlannerModelClient(
          config,
          {}
        )
      ).toThrow(
        "Planner model configuration is required for llm planner provider"
      );
    });

    it("creates an openai-compatible client without api key when no environment variable is configured", () => {
      const config: DragonConfig = {
        ...baseConfig,

        providers: {
          ...baseConfig.providers,

          planner: "llm",

          plannerModel: {
            type:
              "openai-compatible",

            baseUrl:
              "http://localhost:11434/v1",

            model:
              "local-model"
          }
        }
      };

      const client =
        resolvePlannerModelClient(
          config,
          {}
        );

      expect(client).toBeInstanceOf(
        OpenAICompatiblePlannerModelClient
      );

      expect(client?.name).toBe(
        "openai-compatible"
      );
    });

    it("resolves the configured api key from the environment", () => {
      const config: DragonConfig = {
        ...baseConfig,

        providers: {
          ...baseConfig.providers,

          planner: "llm",

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
      };

      const client =
        resolvePlannerModelClient(
          config,
          {
            DRAGON_QA_LLM_API_KEY:
              "secret-key"
          }
        );

      expect(client).toBeInstanceOf(
        OpenAICompatiblePlannerModelClient
      );

      expect(client?.name).toBe(
        "openai-compatible"
      );
    });

    it("fails closed when the configured api key environment variable is missing", () => {
      const config: DragonConfig = {
        ...baseConfig,

        providers: {
          ...baseConfig.providers,

          planner: "llm",

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
      };

      expect(() =>
        resolvePlannerModelClient(
          config,
          {}
        )
      ).toThrow(
        "Planner model API key environment variable is required: DRAGON_QA_LLM_API_KEY"
      );
    });
  }
);
