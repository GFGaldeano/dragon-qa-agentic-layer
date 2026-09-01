import { DragonConfig } from "../../core/config/schema";

import {
  DeterministicPlannerProvider
} from "./deterministic-planner-provider";

import {
  LlmPlannerProvider
} from "./llm/llm-planner-provider";

import {
  PlannerModelClient
} from "./llm/planner-model-client";

import {
  PlannerProvider
} from "./planner-provider";

export interface PlannerProviderResolverDependencies {
  plannerModelClient?: PlannerModelClient;
}

export function resolvePlannerProvider(
  config: DragonConfig,
  dependencies: PlannerProviderResolverDependencies = {}
): PlannerProvider {
  const provider = config.providers.planner;

  switch (provider) {
    case "deterministic":
      return new DeterministicPlannerProvider();

    case "llm": {
      const client =
        dependencies.plannerModelClient;

      if (!client) {
        throw new Error(
          "Planner model client is required for llm planner provider"
        );
      }

      return new LlmPlannerProvider(client);
    }

    default:
      throw new Error(
        `Unsupported planner provider: ${provider}`
      );
  }
}
