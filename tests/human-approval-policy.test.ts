import {
  describe,
  expect,
  it
} from "vitest";

import {
  TestExecutionResult
} from "../src/core/contracts/types";

import {
  requiresHumanApproval
} from "../src/core/verdicts/human-approval-policy";

function createResult(
  overrides: Partial<TestExecutionResult> = {}
): TestExecutionResult {
  return {
    scenarioId: "S001",
    scenarioTitle: "Scenario",
    status: "passed",
    verdict: "PASS",
    durationMs: 10,
    message: "ok",
    evidence: [],
    ...overrides
  };
}

describe(
  "requiresHumanApproval",
  () => {
    it.each([
      "observe",
      "assist",
      "execute"
    ] as const)(
      "requires approval in %s mode",
      (autonomyLevel) => {
        expect(
          requiresHumanApproval(
            autonomyLevel,
            [
              createResult()
            ]
          )
        ).toBe(true);
      }
    );

    it(
      "fails closed when autonomous execution has no results",
      () => {
        expect(
          requiresHumanApproval(
            "autonomous",
            []
          )
        ).toBe(true);
      }
    );

    it(
      "requires approval when an autonomous run contains REVIEW verdict",
      () => {
        expect(
          requiresHumanApproval(
            "autonomous",
            [
              createResult({
                status: "review",
                verdict: "REVIEW"
              })
            ]
          )
        ).toBe(true);
      }
    );

    it(
      "requires approval when an autonomous run contains review status",
      () => {
        expect(
          requiresHumanApproval(
            "autonomous",
            [
              createResult({
                status: "review",
                verdict: "ENVIRONMENT"
              })
            ]
          )
        ).toBe(true);
      }
    );

    it(
      "does not require approval for autonomous runs with completed non-review results",
      () => {
        expect(
          requiresHumanApproval(
            "autonomous",
            [
              createResult({
                verdict: "PASS"
              }),
              createResult({
                status: "failed",
                verdict: "PRODUCT_BUG"
              })
            ]
          )
        ).toBe(false);
      }
    );
  }
);
