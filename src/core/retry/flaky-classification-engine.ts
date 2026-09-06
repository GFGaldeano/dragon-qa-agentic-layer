import {
  RetryAttemptHistory
} from "./retry-attempt-history";

export type FlakyClassification =
  | "flaky"
  | "not-detected"
  | "review-required";

export class FlakyClassificationEngine {
  classify(
    history: RetryAttemptHistory
  ): FlakyClassification {
    const attempts =
      history.attempts;

    if (attempts.length <= 1) {
      return "not-detected";
    }

    const finalAttempt =
      attempts[attempts.length - 1];

    if (!finalAttempt) {
      return "not-detected";
    }

    const finalResult =
      finalAttempt.result;

    if (
      finalResult.status !== "passed" &&
      finalResult.verdict !== "PASS"
    ) {
      return "not-detected";
    }

    if (
      finalResult.status !== "passed" ||
      finalResult.verdict !== "PASS"
    ) {
      return "review-required";
    }

    const finalDecision =
      finalAttempt.decisionAfterAttempt;

    if (
      finalDecision &&
      (
        finalDecision.shouldRetry === true ||
        finalDecision.reason ===
          "retry-allowed"
      )
    ) {
      return "review-required";
    }

    const priorAttempts =
      attempts.slice(0, -1);

    for (const attempt of priorAttempts) {
      if (
        attempt.result.status !== "failed"
      ) {
        return "review-required";
      }

      if (
        attempt.result.verdict !==
          "REVIEW" &&
        attempt.result.verdict !==
          "ENVIRONMENT"
      ) {
        return "review-required";
      }

      const decision =
        attempt.decisionAfterAttempt;

      if (
        !decision ||
        decision.shouldRetry !== true ||
        decision.reason !==
          "retry-allowed"
      ) {
        return "review-required";
      }
    }

    return "flaky";
  }
}
