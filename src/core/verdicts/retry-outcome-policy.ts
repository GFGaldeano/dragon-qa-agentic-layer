import type {
  AutonomyLevel,
  TestExecutionResult
} from "../contracts/types";

import {
  FlakyClassificationEngine
} from "../retry/flaky-classification-engine";

import type {
  FlakyClassification
} from "../retry/flaky-classification-engine";

import type {
  RetryAttemptHistory
} from "../retry/retry-attempt-history";

import {
  requiresHumanApproval
} from "./human-approval-policy";

import {
  calculateFinalVerdict
} from "./verdict-engine";

export interface RetryOutcome {
  classification: FlakyClassification;
  result: TestExecutionResult | undefined;
  humanApprovalRequired: boolean;
}

export function resolveRetryOutcome(
  history: RetryAttemptHistory,
  autonomyLevel: AutonomyLevel
): RetryOutcome {
  const attempts = history.attempts;

  // A raw PASS must correspond to a passed execution,
  // and a passed execution must have a raw PASS verdict.
  const hasContradictoryResult =
    attempts.some(
      ({ result }) =>
        (result.status === "passed") !==
        (result.verdict === "PASS")
    );

  // FLAKY is derived from history, never accepted
  // as a raw executor verdict.
  const hasUntrustedFlaky =
    attempts.some(
      ({ result }) =>
        result.verdict === "FLAKY"
    );

  const detectedClassification =
    new FlakyClassificationEngine().classify(
      history
    );

  const classification: FlakyClassification =
    hasContradictoryResult ||
    hasUntrustedFlaky
      ? "review-required"
      : detectedClassification;
  const finalAttempt =
    attempts[attempts.length - 1];

  // An empty history cannot establish an execution result.
  if (!finalAttempt) {
    return {
      classification,
      result: undefined,
      humanApprovalRequired: true
    };
  }

  let result: TestExecutionResult =
    finalAttempt.result;

  if (classification === "flaky") {
    // The recovery passed, but it is not an ordinary PASS.
    result = {
      ...result,
      status: "passed",
      verdict: "FLAKY"
    };
  } else if (
    classification === "review-required"
  ) {
    // Ambiguous history must not silently become PASS.
    // A raw FLAKY is not evidence of recovery.
    // Normalize it for aggregation without changing
    // the original attempt history.
    const dominantVerdict =
      calculateFinalVerdict(
        attempts.map(
          attempt =>
            attempt.result.verdict === "FLAKY"
              ? {
                  ...attempt.result,
                  verdict: "REVIEW" as const
                }
              : attempt.result
        )
      );

    result = {
      ...result,
      status: "review",
      verdict:
        dominantVerdict === "PASS"
          ? "REVIEW"
          : dominantVerdict
    };
  }

  return {
    classification,
    result,
    humanApprovalRequired:
      classification !== "not-detected" ||
      requiresHumanApproval(
        autonomyLevel,
        [result]
      )
  };
}
