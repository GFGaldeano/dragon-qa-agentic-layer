import {
  describe,
  expect,
  it
} from "vitest";

import {
  TestExecutionResult,
  QAVerdict
} from "../src/core/contracts/types";

import {
  calculateFinalVerdict
} from "../src/core/verdicts/verdict-engine";

function createResult(
  verdict: QAVerdict
): TestExecutionResult {
  return {
    scenarioId: `S-${verdict}`,
    scenarioTitle: verdict,
    status:
      verdict === "PASS"
        ? "passed"
        : verdict === "REVIEW"
          ? "review"
          : "failed",
    verdict,
    durationMs: 10,
    message: verdict,
    evidence: []
  };
}

describe(
  "calculateFinalVerdict",
  () => {
    it(
      "fails closed to REVIEW when there are no results",
      () => {
        expect(
          calculateFinalVerdict([])
        ).toBe("REVIEW");
      }
    );

    it(
      "returns PASS when all results pass",
      () => {
        expect(
          calculateFinalVerdict([
            createResult("PASS"),
            createResult("PASS")
          ])
        ).toBe("PASS");
      }
    );

    it.each([
      ["REVIEW", "REVIEW"],
      ["FLAKY", "FLAKY"],
      ["TEST_ISSUE", "TEST_ISSUE"],
      ["ENVIRONMENT", "ENVIRONMENT"],
      ["PRODUCT_BUG", "PRODUCT_BUG"]
    ] as const)(
      "prioritizes %s over PASS",
      (
        higherVerdict,
        expectedVerdict
      ) => {
        expect(
          calculateFinalVerdict([
            createResult("PASS"),
            createResult(
              higherVerdict
            )
          ])
        ).toBe(expectedVerdict);
      }
    );

    it.each([
      [
        [
          "REVIEW",
          "FLAKY"
        ],
        "FLAKY"
      ],
      [
        [
          "REVIEW",
          "TEST_ISSUE"
        ],
        "TEST_ISSUE"
      ],
      [
        [
          "FLAKY",
          "ENVIRONMENT"
        ],
        "ENVIRONMENT"
      ],
      [
        [
          "TEST_ISSUE",
          "PRODUCT_BUG"
        ],
        "PRODUCT_BUG"
      ],
      [
        [
          "ENVIRONMENT",
          "PRODUCT_BUG",
          "REVIEW"
        ],
        "PRODUCT_BUG"
      ]
    ] as const)(
      "returns the highest-priority verdict for %j",
      (
        verdicts,
        expectedVerdict
      ) => {
        const results =
          verdicts.map(
            (verdict) =>
              createResult(verdict)
          );

        expect(
          calculateFinalVerdict(results)
        ).toBe(expectedVerdict);
      }
    );

    it(
      "is independent of result order",
      () => {
        const first =
          calculateFinalVerdict([
            createResult("REVIEW"),
            createResult("PASS"),
            createResult("ENVIRONMENT"),
            createResult("FLAKY")
          ]);

        const second =
          calculateFinalVerdict([
            createResult("FLAKY"),
            createResult("ENVIRONMENT"),
            createResult("PASS"),
            createResult("REVIEW")
          ]);

        expect(first).toBe(
          "ENVIRONMENT"
        );

        expect(second).toBe(
          "ENVIRONMENT"
        );
      }
    );
  }
);
