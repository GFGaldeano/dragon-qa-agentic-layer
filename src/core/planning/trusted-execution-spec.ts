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
      const executionSpec =
        scenario.executionSpec;

      if (
        !executionSpec ||
        !("expectedStatus" in executionSpec)
      ) {
        return undefined;
      }

      const expectedStatus =
        executionSpec.expectedStatus;

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

    case "page-title": {
      const executionSpec =
        scenario.executionSpec;

      if (
        !executionSpec ||
        !("expectedTitle" in executionSpec)
      ) {
        return undefined;
      }

      const expectedTitle =
        executionSpec.expectedTitle.trim();

      if (expectedTitle.length === 0) {
        return undefined;
      }

      return {
        type: "page-title",
        expectedTitle
      };
    }

    default:
      return undefined;
  }
}
