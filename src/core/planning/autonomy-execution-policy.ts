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

const AUTOMATABLE_CAPABILITIES = new Set([
  "application-availability"
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
      !AUTOMATABLE_CAPABILITIES.has(capability)
    ) {
      return "manual-review";
    }

    return "automated";
  }
}
