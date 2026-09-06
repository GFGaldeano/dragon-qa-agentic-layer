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

function makeResult(
  scenarioId: string,
  message: string
): TestExecutionResult {
  return {
    scenarioId,
    scenarioTitle:
      "Retry scenario",
    status: "failed",
    verdict: "REVIEW",
    durationMs: 10,
    message,
    evidence: []
  };
}

const retryAllowed:
  RetryDecision = {
    shouldRetry: true,
    reason: "retry-allowed"
  };

describe(
  "RetryAttemptHistory",
  () => {
    it(
      "starts empty with no retries used",
      () => {
        const history =
          new RetryAttemptHistory(
            "S001"
          );

        expect(
          history.attempts
        ).toEqual([]);

        expect(
          history.retriesUsed
        ).toBe(0);
      }
    );

    it(
      "assigns the first attempt number internally",
      () => {
        const history =
          new RetryAttemptHistory(
            "S001"
          );

        const record =
          history.recordAttempt(
            makeResult(
              "S001",
              "first failure"
            )
          );

        expect(
          record.attemptNumber
        ).toBe(1);
      }
    );

    it(
      "records attempts in execution order",
      () => {
        const history =
          new RetryAttemptHistory(
            "S001"
          );

        history.recordAttempt(
          makeResult(
            "S001",
            "first failure"
          ),
          retryAllowed
        );

        history.recordAttempt(
          makeResult(
            "S001",
            "second failure"
          )
        );

        expect(
          history.attempts.map(
            attempt => ({
              attemptNumber:
                attempt.attemptNumber,
              message:
                attempt.result.message
            })
          )
        ).toEqual([
          {
            attemptNumber: 1,
            message: "first failure"
          },
          {
            attemptNumber: 2,
            message: "second failure"
          }
        ]);
      }
    );

    it(
      "derives retries used from recorded attempts",
      () => {
        const history =
          new RetryAttemptHistory(
            "S001"
          );

        history.recordAttempt(
          makeResult(
            "S001",
            "initial attempt"
          ),
          retryAllowed
        );

        expect(
          history.retriesUsed
        ).toBe(0);

        history.recordAttempt(
          makeResult(
            "S001",
            "first retry"
          ),
          retryAllowed
        );

        expect(
          history.retriesUsed
        ).toBe(1);

        history.recordAttempt(
          makeResult(
            "S001",
            "second retry"
          )
        );

        expect(
          history.retriesUsed
        ).toBe(2);
      }
    );

    it(
      "preserves the retry decision with its originating attempt",
      () => {
        const history =
          new RetryAttemptHistory(
            "S001"
          );

        history.recordAttempt(
          makeResult(
            "S001",
            "retryable failure"
          ),
          retryAllowed
        );

        expect(
          history.attempts[0]
            ?.decisionAfterAttempt
        ).toEqual(
          retryAllowed
        );
      }
    );

    it(
      "rejects results from another scenario",
      () => {
        const history =
          new RetryAttemptHistory(
            "S001"
          );

        expect(() =>
          history.recordAttempt(
            makeResult(
              "S999",
              "foreign scenario"
            )
          )
        ).toThrow();
      }
    );

    it(
      "protects the internal attempt collection from external mutation",
      () => {
        const history =
          new RetryAttemptHistory(
            "S001"
          );

        history.recordAttempt(
          makeResult(
            "S001",
            "initial attempt"
          )
        );

        const externalAttempts =
          history.attempts as
            Array<
              typeof history.attempts[number]
            >;

        externalAttempts.pop();

        expect(
          history.attempts
        ).toHaveLength(1);

        expect(
          history.attempts[0]
            ?.attemptNumber
        ).toBe(1);
      }
    );

    it(
      "keeps history unchanged when a foreign scenario is rejected",
      () => {
        const history =
          new RetryAttemptHistory(
            "S001"
          );

        history.recordAttempt(
          makeResult(
            "S001",
            "valid attempt"
          )
        );

        expect(() =>
          history.recordAttempt(
            makeResult(
              "S999",
              "foreign attempt"
            )
          )
        ).toThrow();

        expect(
          history.attempts
        ).toHaveLength(1);

        expect(
          history.retriesUsed
        ).toBe(0);
      }
    );

    it(
      "continues assigning attempt numbers from internal history state",
      () => {
        const history =
          new RetryAttemptHistory(
            "S001"
          );

        history.recordAttempt(
          makeResult(
            "S001",
            "first attempt"
          )
        );

        const externalAttempts =
          history.attempts as
            Array<
              typeof history.attempts[number]
            >;

        externalAttempts.length = 0;

        const second =
          history.recordAttempt(
            makeResult(
              "S001",
              "second attempt"
            )
          );

        expect(
          second.attemptNumber
        ).toBe(2);

        expect(
          history.retriesUsed
        ).toBe(1);
      }
    );


    it(
      "preserves snapshots when original inputs are mutated",
      () => {
        const history =
          new RetryAttemptHistory(
            "S001"
          );

        const result =
          makeResult(
            "S001",
            "original"
          );

        result.evidence.push({
          type: "log",
          path: "original.log"
        });

        const decision:
          RetryDecision = {
            ...retryAllowed
          };

        history.recordAttempt(
          result,
          decision
        );

        result.message =
          "modified outside";

        result.evidence[0]!.path =
          "modified.log";

        decision.shouldRetry = false;
        decision.reason =
          "retry-disabled";

        expect(
          history.attempts[0]
            ?.result.message
        ).toBe("original");

        expect(
          history.attempts[0]
            ?.result.evidence[0]?.path
        ).toBe("original.log");

        expect(
          history.attempts[0]
            ?.decisionAfterAttempt
        ).toEqual(
          retryAllowed
        );
      }
    );

    it(
      "protects recorded data from returned reference mutations",
      () => {
        const history =
          new RetryAttemptHistory(
            "S001"
          );

        const result =
          makeResult(
            "S001",
            "original"
          );

        result.evidence.push({
          type: "log",
          path: "original.log"
        });

        const returned =
          history.recordAttempt(
            result,
            retryAllowed
          ) as {
            attemptNumber: number;
            result: TestExecutionResult;
            decisionAfterAttempt?:
              RetryDecision;
          };

        returned.attemptNumber = 99;
        returned.result.message =
          "modified return";

        returned.result.evidence[0]!.path =
          "modified-return.log";

        returned.decisionAfterAttempt!.reason =
          "retry-disabled";

        const view =
          history.attempts;

        const viewRecord =
          view[0] as
            typeof returned;

        viewRecord.attemptNumber = 77;
        viewRecord.result.message =
          "modified view";

        viewRecord.result.evidence[0]!.path =
          "modified-view.log";

        expect(
          history.attempts[0]
            ?.attemptNumber
        ).toBe(1);

        expect(
          history.attempts[0]
            ?.result.message
        ).toBe("original");

        expect(
          history.attempts[0]
            ?.result.evidence[0]?.path
        ).toBe("original.log");

        expect(
          history.attempts[0]
            ?.decisionAfterAttempt
        ).toEqual(
          retryAllowed
        );

        expect(
          history.retriesUsed
        ).toBe(0);

        expect(
          history.recordAttempt(
            makeResult(
              "S001",
              "second"
            )
          ).attemptNumber
        ).toBe(2);
      }
    );

  }
);
