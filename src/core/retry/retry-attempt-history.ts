import {
  TestExecutionResult
} from "../contracts/types";

import {
  RetryDecision
} from "./retry-decision-engine";

export interface RetryAttemptRecord {
  readonly attemptNumber: number;
  readonly result: TestExecutionResult;
  readonly decisionAfterAttempt?:
    RetryDecision;
}

function snapshotAttempt(
  record: RetryAttemptRecord
): RetryAttemptRecord {
  return {
    attemptNumber:
      record.attemptNumber,
    result: {
      ...record.result,
      evidence:
        record.result.evidence.map(
          evidence => ({
            ...evidence
          })
        )
    },
    decisionAfterAttempt:
      record.decisionAfterAttempt ===
      undefined
        ? undefined
        : {
            ...record.decisionAfterAttempt
          }
  };
}

export class RetryAttemptHistory {
  private readonly records:
    RetryAttemptRecord[] = [];

  constructor(
    private readonly scenarioId: string
  ) {}

  get attempts():
    readonly RetryAttemptRecord[] {
    return this.records.map(
      snapshotAttempt
    );
  }

  get retriesUsed(): number {
    return Math.max(
      this.records.length - 1,
      0
    );
  }

  recordAttempt(
    result: TestExecutionResult,
    decisionAfterAttempt?:
      RetryDecision
  ): RetryAttemptRecord {
    if (
      result.scenarioId !==
      this.scenarioId
    ) {
      throw new Error(
        "Retry attempt scenario does not match history scenario."
      );
    }

    const record =
      snapshotAttempt({
        attemptNumber:
          this.records.length + 1,
        result,
        decisionAfterAttempt
      });

    this.records.push(
      record
    );

    return snapshotAttempt(
      record
    );
  }
}
