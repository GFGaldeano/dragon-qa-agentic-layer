import {
  describe,
  expect,
  it
} from "vitest";

import type {
  TestExecutionResult
} from "../src/core/contracts/types";

import {
  RetryAttemptHistory
} from "../src/core/retry/retry-attempt-history";

import {
  resolveRetryOutcome
} from "../src/core/verdicts/retry-outcome-policy";

const retryAllowed = {
  shouldRetry: true,
  reason: "retry-allowed"
} as const;

function makeResult(
  overrides: Partial<TestExecutionResult> = {}
): TestExecutionResult {
  return {
    scenarioId: "S001",
    scenarioTitle: "Availability",
    status: "passed",
    verdict: "PASS",
    durationMs: 10,
    message: "Execution completed.",
    evidence: [],
    ...overrides
  };
}

function makeHistory(
  ...results: TestExecutionResult[]
): RetryAttemptHistory {
  const history =
    new RetryAttemptHistory("S001");

  results.forEach((result, index) => {
    history.recordAttempt(
      result,
      index < results.length - 1
        ? retryAllowed
        : undefined
    );
  });

  return history;
}

describe("Retry outcome governance", () => {
  it(
    "classifies an authorized recovery as FLAKY and requires approval",
    () => {
      const history =
        new RetryAttemptHistory("S001");

      const failure: TestExecutionResult = {
        scenarioId: "S001",
        scenarioTitle: "Availability",
        status: "failed",
        verdict: "ENVIRONMENT",
        durationMs: 10,
        message: "Connection refused.",
        evidence: [],
        failure: {
          type: "network",
          message: "Connection refused."
        }
      };

      const recovery: TestExecutionResult = {
        scenarioId: "S001",
        scenarioTitle: "Availability",
        status: "passed",
        verdict: "PASS",
        durationMs: 10,
        message: "Recovered.",
        evidence: []
      };

      history.recordAttempt(failure, {
        shouldRetry: true,
        reason: "retry-allowed"
      });

      history.recordAttempt(recovery);

      const outcome = resolveRetryOutcome(
        history,
        "autonomous"
      );

      expect(outcome).toMatchObject({
        classification: "flaky",
        result: {
          scenarioId: "S001",
          status: "passed",
          verdict: "FLAKY"
        },
        humanApprovalRequired: true
      });
    }
  );

  it(
    "fails closed without an execution attempt",
    () => {
      const outcome = resolveRetryOutcome(
        new RetryAttemptHistory("S001"),
        "autonomous"
      );

      expect(outcome).toEqual({
        classification: "not-detected",
        result: undefined,
        humanApprovalRequired: true
      });
    }
  );

  it.each([
    "observe",
    "assist",
    "execute",
    "autonomous"
  ] as const)(
    "preserves an ordinary PASS in %s mode",
    (level) => {
      const result = makeResult();
      const outcome = resolveRetryOutcome(
        makeHistory(result),
        level
      );

      expect(outcome.classification).toBe(
        "not-detected"
      );
      expect(outcome.result).toEqual(result);
      expect(outcome.humanApprovalRequired).toBe(
        level !== "autonomous"
      );
    }
  );

  it(
    "preserves a persistent technical failure and exhausted retry budget",
    () => {
      const failure = makeResult({
        status: "failed",
        verdict: "ENVIRONMENT",
        message: "Connection refused.",
        failure: {
          type: "network",
          message: "Connection refused."
        }
      });

      const history =
        new RetryAttemptHistory("S001");

      history.recordAttempt(
        failure,
        retryAllowed
      );

      history.recordAttempt(failure, {
        shouldRetry: false,
        reason: "retry-budget-exhausted"
      });

      const outcome = resolveRetryOutcome(
        history,
        "autonomous"
      );

      expect(outcome.classification).toBe(
        "not-detected"
      );
      expect(outcome.result).toEqual(failure);
      expect(outcome.humanApprovalRequired).toBe(false);
    }
  );

  it(
    "requires review when an earlier attempt is not an authorized failure",
    () => {
      const history = makeHistory(
        makeResult({
          status: "review",
          verdict: "REVIEW"
        }),
        makeResult()
      );

      const outcome = resolveRetryOutcome(
        history,
        "autonomous"
      );

      expect(outcome).toMatchObject({
        classification: "review-required",
        result: {
          status: "review",
          verdict: "REVIEW"
        },
        humanApprovalRequired: true
      });
    }
  );

  it.each([
    {
      status: "passed" as const,
      verdict: "REVIEW" as const
    },
    {
      status: "failed" as const,
      verdict: "PASS" as const
    }
  ])(
    "does not accept a contradictory single-attempt result: $status/$verdict",
    (overrides) => {
      const outcome = resolveRetryOutcome(
        makeHistory(makeResult(overrides)),
        "autonomous"
      );

      expect(outcome).toMatchObject({
        classification: "review-required",
        result: {
          status: "review",
          verdict: "REVIEW"
        },
        humanApprovalRequired: true
      });
    }
  );

  it(
    "does not downgrade a prior PRODUCT_BUG after an invalid recovery",
    () => {
      const history = makeHistory(
        makeResult({
          status: "failed",
          verdict: "PRODUCT_BUG",
          message: "Product assertion failed.",
          failure: {
            type: "assertion",
            message: "Product assertion failed."
          }
        }),
        makeResult()
      );

      const outcome = resolveRetryOutcome(
        history,
        "autonomous"
      );

      expect(outcome).toMatchObject({
        classification: "review-required",
        result: {
          status: "review",
          verdict: "PRODUCT_BUG"
        },
        humanApprovalRequired: true
      });
    }
  );


  it.each([
    "passed",
    "failed"
  ] as const)(
    "rejects an executor-supplied FLAKY verdict with status %s",
    (status) => {
      const outcome = resolveRetryOutcome(
        makeHistory(makeResult({
          status,
          verdict: "FLAKY"
        })),
        "autonomous"
      );

      expect(outcome).toMatchObject({
        classification: "review-required",
        result: {
          status: "review",
          verdict: "REVIEW"
        },
        humanApprovalRequired: true
      });
    }
  );

  it(
    "rejects a recovery without an authorized retry decision",
    () => {
      const history =
        new RetryAttemptHistory("S001");

      history.recordAttempt(makeResult({
        status: "failed",
        verdict: "ENVIRONMENT",
        failure: {
          type: "network",
          message: "Connection refused."
        }
      }));

      history.recordAttempt(makeResult());

      const outcome = resolveRetryOutcome(
        history,
        "autonomous"
      );

      expect(outcome).toMatchObject({
        classification: "review-required",
        result: {
          status: "review",
          verdict: "ENVIRONMENT"
        },
        humanApprovalRequired: true
      });
    }
  );

  it(
    "rejects a recovery with a retry still pending",
    () => {
      const history =
        new RetryAttemptHistory("S001");

      history.recordAttempt(makeResult({
        status: "failed",
        verdict: "ENVIRONMENT",
        failure: {
          type: "network",
          message: "Connection refused."
        }
      }), retryAllowed);

      history.recordAttempt(makeResult(), retryAllowed);

      const outcome = resolveRetryOutcome(
        history,
        "autonomous"
      );

      expect(outcome).toMatchObject({
        classification: "review-required",
        result: {
          status: "review",
          verdict: "ENVIRONMENT"
        },
        humanApprovalRequired: true
      });
    }
  );

  it(
    "preserves evidence from every attempt without exposing history mutations",
    () => {
      const firstEvidence = {
        type: "screenshot" as const,
        path: "attempt-1/S001/page.png"
      };

      const finalEvidence = {
        type: "trace" as const,
        path: "attempt-2/S001/trace.zip"
      };

      const history = makeHistory(
        makeResult({
          status: "failed",
          verdict: "ENVIRONMENT",
          evidence: [firstEvidence],
          failure: {
            type: "network",
            message: "Connection refused."
          }
        }),
        makeResult({
          evidence: [finalEvidence]
        })
      );

      const outcome = resolveRetryOutcome(
        history,
        "autonomous"
      );

      expect(outcome.classification).toBe("flaky");
      expect(outcome.result?.verdict).toBe("FLAKY");
      expect(outcome.result?.evidence).toEqual([
        finalEvidence
      ]);

      expect(history.attempts.map(
        attempt => attempt.result.evidence
      )).toEqual([
        [firstEvidence],
        [finalEvidence]
      ]);

      const returnedEvidence =
        outcome.result?.evidence[0];

      if (!returnedEvidence) {
        throw new Error("Expected final evidence.");
      }

      returnedEvidence.path = "mutated";

      expect(history.attempts[0]?.result.evidence).toEqual([
        firstEvidence
      ]);

      expect(history.attempts[1]?.result.evidence).toEqual([
        finalEvidence
      ]);
    }
  );

});
