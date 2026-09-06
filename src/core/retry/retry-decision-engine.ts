import {
  RetryPolicyConfig
} from "../config/retry-policy-schema";

export type RetryDecisionReason =
  | "retry-disabled"
  | "invalid-retry-state"
  | "failure-not-retryable"
  | "retry-budget-exhausted"
  | "retry-allowed";

export interface RetryDecisionInput {
  failureType: string;
  retriesUsed: number;
}

export interface RetryDecision {
  shouldRetry: boolean;
  reason: RetryDecisionReason;
}

export class RetryDecisionEngine {
  constructor(
    private readonly policy?:
      RetryPolicyConfig
  ) {}

  decide(
    input: RetryDecisionInput
  ): RetryDecision {
    if (
      !this.policy ||
      !this.policy.enabled
    ) {
      return {
        shouldRetry: false,
        reason: "retry-disabled"
      };
    }

    if (
      !Number.isInteger(
        input.retriesUsed
      ) ||
      input.retriesUsed < 0
    ) {
      return {
        shouldRetry: false,
        reason: "invalid-retry-state"
      };
    }

    const failureIsRetryable =
      this.policy
        .retryableFailureTypes
        .some(
          failureType =>
            failureType ===
            input.failureType
        );

    if (!failureIsRetryable) {
      return {
        shouldRetry: false,
        reason: "failure-not-retryable"
      };
    }

    if (
      input.retriesUsed >=
      this.policy.maxRetries
    ) {
      return {
        shouldRetry: false,
        reason: "retry-budget-exhausted"
      };
    }

    return {
      shouldRetry: true,
      reason: "retry-allowed"
    };
  }
}
