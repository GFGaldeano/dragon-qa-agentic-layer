import { DragonConfig } from "../../core/config/schema";

import {
  DeterministicPlannerProvider
} from "./deterministic-planner-provider";

import {
  PlannerProvider
} from "./planner-provider";

export function resolvePlannerProvider(
  config: DragonConfig
): PlannerProvider {
  const provider = config.providers.planner;

  switch (provider) {
    case "deterministic":
      return new DeterministicPlannerProvider();

    default:
      throw new Error(
        `Unsupported planner provider: ${provider}`
      );
  }
}
