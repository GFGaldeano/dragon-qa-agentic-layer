import {
  AutonomyLevel,
  ExecutionMode
} from "../contracts/types";

import {
  PlanningScenarioProposal
} from "../contracts/planning-proposal";

import {
  ExecutionPolicy
} from "./execution-policy";

import {
  buildTrustedExecutionIntent
} from "./trusted-execution-spec";

const AUTOMATABLE_CAPABILITIES = new Set([
  "application-availability",
  "http-status"
]);

export class AutonomyExecutionPolicy
  implements ExecutionPolicy {

  constructor(
    private readonly autonomyLevel: AutonomyLevel
  ) {}

  resolveExecutionMode(
    scenario: PlanningScenarioProposal
  ): ExecutionMode {

    if (
      this.autonomyLevel === "observe"
    ) {
      return "manual-review";
    }

    const capability =
      scenario.executionCapability;

    if (
      !capability ||
      !AUTOMATABLE_CAPABILITIES.has(capability) ||
      !buildTrustedExecutionIntent(scenario)
    ) {
      return "manual-review";
    }

    return "automated";
  }
}
