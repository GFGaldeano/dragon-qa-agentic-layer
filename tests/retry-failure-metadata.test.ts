import {
  describe,
  expect,
  it
} from "vitest";

import type {
  FailureSignal
} from "../src/core/contracts/failure-signal";

import type {
  TestExecutionResult
} from "../src/core/contracts/types";

import {
  RetryAttemptHistory
} from "../src/core/retry/retry-attempt-history";

describe(
  "Retry failure metadata",
  () => {
    it(
      "isolates failure metadata from input and returned mutations",
      () => {
        const failure: FailureSignal = {
          type: "network",
          message: "Initial network failure."
        };

        const result: TestExecutionResult = {
          scenarioId: "S001",
          scenarioTitle: "Availability",
          status: "failed",
          verdict: "ENVIRONMENT",
          durationMs: 10,
          message: failure.message,
          evidence: [],
          failure
        };

        const history =
          new RetryAttemptHistory("S001");

        const recorded =
          history.recordAttempt(result);

        failure.type = "timeout";
        failure.message = "Changed input.";

        expect(
          recorded.result.failure
        ).toEqual({
          type: "network",
          message: "Initial network failure."
        });

        const view = history.attempts;

        if (
          !recorded.result.failure ||
          !view[0]?.result.failure
        ) {
          throw new Error(
            "Expected failure metadata."
          );
        }

        recorded.result.failure.message =
          "Changed returned record.";

        view[0].result.failure.type =
          "unknown";

        expect(
          history.attempts[0]?.result.failure
        ).toEqual({
          type: "network",
          message: "Initial network failure."
        });
      }
    );
  }
);
