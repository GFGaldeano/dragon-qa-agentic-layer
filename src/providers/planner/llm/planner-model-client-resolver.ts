import {
  DragonConfig
} from "../../../core/config/schema";

import {
  OpenAICompatiblePlannerModelClient
} from "./openai-compatible-planner-model-client";

import {
  PlannerModelClient
} from "./planner-model-client";

export type PlannerModelEnvironment =
  Record<
    string,
    string | undefined
  >;

export function resolvePlannerModelClient(
  config: DragonConfig,
  environment:
    PlannerModelEnvironment = process.env
): PlannerModelClient | undefined {
  if (
    config.providers.planner !== "llm"
  ) {
    return undefined;
  }

  const modelConfig =
    config.providers.plannerModel;

  if (!modelConfig) {
    throw new Error(
      "Planner model configuration is required for llm planner provider"
    );
  }

  switch (modelConfig.type) {
    case "openai-compatible": {
      let apiKey: string | undefined;

      if (modelConfig.apiKeyEnv) {
        const configuredApiKey =
          environment[
            modelConfig.apiKeyEnv
          ]?.trim();

        if (!configuredApiKey) {
          throw new Error(
            `Planner model API key environment variable is required: ${modelConfig.apiKeyEnv}`
          );
        }

        apiKey =
          configuredApiKey;
      }

      return new OpenAICompatiblePlannerModelClient({
        baseUrl:
          modelConfig.baseUrl,

        model:
          modelConfig.model,

        apiKey
      });
    }

    default:
      throw new Error(
        `Unsupported planner model type: ${modelConfig.type}`
      );
  }
}
