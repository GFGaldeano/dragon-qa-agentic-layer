import {
  describe,
  expect,
  it
} from "vitest";

import {
  TestExecutionResult
} from "../src/core/contracts/types";

import {
  RetryDecision
} from "../src/core/retry/retry-decision-engine";

import {
  RetryAttemptHistory
} from "../src/core/retry/retry-attempt-history";

import {
  FlakyClassificationEngine
} from "../src/core/retry/flaky-classification-engine";

const retryAllowed: RetryDecision = {
  shouldRetry: true,
  reason: "retry-allowed"
};

function makeResult(
  overrides:
    Partial<TestExecutionResult> = {}
): TestExecutionResult {
  return {
    scenarioId: "S001",
    scenarioTitle: "Retry scenario",
    status: "failed",
    verdict: "REVIEW",
    durationMs: 10,
    message: "Execution failed.",
    evidence: [],
    ...overrides
  };
}

function makeHistory(
  ...entries: Array<{
    result: TestExecutionResult;
    decision?: RetryDecision;
  }>
): RetryAttemptHistory {
  const history =
    new RetryAttemptHistory("S001");

  for (const entry of entries) {
    history.recordAttempt(
      entry.result,
      entry.decision
    );
  }

  return history;
}

const engine =
  new FlakyClassificationEngine();

describe(
  "FlakyClassificationEngine",
  () => {
    it(
      "does not detect flaky behavior in an empty history",
      () => {
        expect(
          engine.classify(
            makeHistory()
          )
        ).toBe("not-detected");
      }
    );

    it(
      "does not classify an initial pass as flaky",
      () => {
        const history =
          makeHistory({
            result: makeResult({
              status: "passed",
              verdict: "PASS"
            })
          });

        expect(
          engine.classify(history)
        ).toBe("not-detected");
      }
    );

    it(
      "does not classify a single failure as flaky",
      () => {
        const history =
          makeHistory({
            result: makeResult()
          });

        expect(
          engine.classify(history)
        ).toBe("not-detected");
      }
    );

    it(
      "does not classify a persistent failure as flaky",
      () => {
        const history =
          makeHistory(
            {
              result: makeResult({
                message: "Initial timeout."
              }),
              decision: retryAllowed
            },
            {
              result: makeResult({
                message: "Retry also failed."
              })
            }
          );

        expect(
          engine.classify(history)
        ).toBe("not-detected");
      }
    );

    it(
      "detects an authorized recovery after a transient failure",
      () => {
        const history =
          makeHistory(
            {
              result: makeResult({
                verdict: "ENVIRONMENT",
                message: "Connection failed."
              }),
              decision: retryAllowed
            },
            {
              result: makeResult({
                status: "passed",
                verdict: "PASS",
                message: "Recovery succeeded."
              })
            }
          );

        expect(
          engine.classify(history)
        ).toBe("flaky");
      }
    );

    it(
      "requires review when recovery has no recorded retry authorization",
      () => {
        const history =
          makeHistory(
            {
              result: makeResult()
            },
            {
              result: makeResult({
                status: "passed",
                verdict: "PASS"
              })
            }
          );

        expect(
          engine.classify(history)
        ).toBe("review-required");
      }
    );

    it(
      "requires review for a contradictory retry decision",
      () => {
        const history =
          makeHistory(
            {
              result: makeResult(),
              decision: {
                shouldRetry: true,
                reason: "retry-disabled"
              }
            },
            {
              result: makeResult({
                status: "passed",
                verdict: "PASS"
              })
            }
          );

        expect(
          engine.classify(history)
        ).toBe("review-required");
      }
    );

    it(
      "does not hide a prior PRODUCT_BUG behind recovery",
      () => {
        const history =
          makeHistory(
            {
              result: makeResult({
                verdict: "PRODUCT_BUG"
              }),
              decision: retryAllowed
            },
            {
              result: makeResult({
                status: "passed",
                verdict: "PASS"
              })
            }
          );

        expect(
          engine.classify(history)
        ).toBe("review-required");
      }
    );

    it(
      "does not hide a prior TEST_ISSUE behind recovery",
      () => {
        const history =
          makeHistory(
            {
              result: makeResult({
                verdict: "TEST_ISSUE"
              }),
              decision: retryAllowed
            },
            {
              result: makeResult({
                status: "passed",
                verdict: "PASS"
              })
            }
          );

        expect(
          engine.classify(history)
        ).toBe("review-required");
      }
    );

    it(
      "requires review when final status and verdict contradict each other",
      () => {
        const history =
          makeHistory(
            {
              result: makeResult(),
              decision: retryAllowed
            },
            {
              result: makeResult({
                status: "passed",
                verdict: "REVIEW"
              })
            }
          );

        expect(
          engine.classify(history)
        ).toBe("review-required");
      }
    );

    it(
      "does not treat an earlier review as a confirmed failure",
      () => {
        const history =
          makeHistory(
            {
              result: makeResult({
                status: "review",
                verdict: "REVIEW"
              }),
              decision: retryAllowed
            },
            {
              result: makeResult({
                status: "passed",
                verdict: "PASS"
              })
            }
          );

        expect(
          engine.classify(history)
        ).toBe("review-required");
      }
    );

    it(
      "detects recovery after two authorized retries",
      () => {
        const history =
          makeHistory(
            {
              result: makeResult({
                message: "Initial failure."
              }),
              decision: retryAllowed
            },
            {
              result: makeResult({
                verdict: "ENVIRONMENT",
                message: "First retry failed."
              }),
              decision: retryAllowed
            },
            {
              result: makeResult({
                status: "passed",
                verdict: "PASS",
                message: "Second retry succeeded."
              })
            }
          );

        expect(
          engine.classify(history)
        ).toBe("flaky");
      }
    );

    it(
      "requires review when an intermediate retry authorization is missing",
      () => {
        const history =
          makeHistory(
            {
              result: makeResult(),
              decision: retryAllowed
            },
            {
              result: makeResult({
                message: "First retry failed."
              })
            },
            {
              result: makeResult({
                status: "passed",
                verdict: "PASS"
              })
            }
          );

        expect(
          engine.classify(history)
        ).toBe("review-required");
      }
    );

    it(
      "does not classify recovery after an earlier successful attempt as flaky",
      () => {
        const history =
          makeHistory(
            {
              result: makeResult({
                status: "passed",
                verdict: "PASS"
              }),
              decision: retryAllowed
            },
            {
              result: makeResult(),
              decision: retryAllowed
            },
            {
              result: makeResult({
                status: "passed",
                verdict: "PASS"
              })
            }
          );

        expect(
          engine.classify(history)
        ).toBe("review-required");
      }
    );

    it(
      "requires review when final success still authorizes another retry",
      () => {
        const history =
          makeHistory(
            {
              result: makeResult(),
              decision: retryAllowed
            },
            {
              result: makeResult({
                status: "passed",
                verdict: "PASS"
              }),
              decision: retryAllowed
            }
          );

        expect(
          engine.classify(history)
        ).toBe("review-required");
      }
    );

  }
);
