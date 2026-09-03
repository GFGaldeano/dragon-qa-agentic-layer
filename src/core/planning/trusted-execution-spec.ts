import {
  ExecutionIntent
} from "../contracts/types";

import {
  PlanningScenarioProposal
} from "../contracts/planning-proposal";

export function buildTrustedExecutionIntent(
  scenario: PlanningScenarioProposal
): ExecutionIntent | undefined {
  switch (scenario.executionCapability) {
    case "application-availability":
      return {
        type: "application-availability"
      };

    case "http-status": {
      const expectedStatus =
        scenario.executionSpec?.expectedStatus;

      if (
        typeof expectedStatus !== "number" ||
        !Number.isInteger(expectedStatus) ||
        expectedStatus < 100 ||
        expectedStatus > 599
      ) {
        return undefined;
      }

      return {
        type: "http-status",
        expectedStatus
      };
    }

    default:
      return undefined;
  }
}
