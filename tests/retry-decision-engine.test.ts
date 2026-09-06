import {
  describe,
  expect,
  it
} from "vitest";

import {
  RetryPolicyConfig
} from "../src/core/config/retry-policy-schema";

import {
  RetryDecisionEngine
} from "../src/core/retry/retry-decision-engine";

const enabledPolicy: RetryPolicyConfig = {
  enabled: true,
  maxRetries: 2,
  retryableFailureTypes: [
    "network",
    "timeout"
  ]
};

describe(
  "RetryDecisionEngine",
  () => {
    it(
      "fails closed when retry policy is absent",
      () => {
        const engine =
          new RetryDecisionEngine();

        expect(
          engine.decide({
            failureType: "network",
            retriesUsed: 0
          })
        ).toEqual({
          shouldRetry: false,
          reason: "retry-disabled"
        });
      }
    );

    it(
      "does not retry when retry policy is disabled",
      () => {
        const engine =
          new RetryDecisionEngine({
            ...enabledPolicy,
            enabled: false
          });

        expect(
          engine.decide({
            failureType: "network",
            retriesUsed: 0
          })
        ).toEqual({
          shouldRetry: false,
          reason: "retry-disabled"
        });
      }
    );

    it(
      "allows a network retry while budget remains",
      () => {
        const engine =
          new RetryDecisionEngine(
            enabledPolicy
          );

        expect(
          engine.decide({
            failureType: "network",
            retriesUsed: 0
          })
        ).toEqual({
          shouldRetry: true,
          reason: "retry-allowed"
        });
      }
    );

    it(
      "allows a timeout retry while budget remains",
      () => {
        const engine =
          new RetryDecisionEngine(
            enabledPolicy
          );

        expect(
          engine.decide({
            failureType: "timeout",
            retriesUsed: 1
          })
        ).toEqual({
          shouldRetry: true,
          reason: "retry-allowed"
        });
      }
    );

    it(
      "rejects failures outside the configured allowlist",
      () => {
        const engine =
          new RetryDecisionEngine(
            enabledPolicy
          );

        expect(
          engine.decide({
            failureType: "assertion",
            retriesUsed: 0
          })
        ).toEqual({
          shouldRetry: false,
          reason: "failure-not-retryable"
        });
      }
    );

    it(
      "respects a narrowed retry failure allowlist",
      () => {
        const engine =
          new RetryDecisionEngine({
            ...enabledPolicy,
            retryableFailureTypes: [
              "network"
            ]
          });

        expect(
          engine.decide({
            failureType: "timeout",
            retriesUsed: 0
          })
        ).toEqual({
          shouldRetry: false,
          reason: "failure-not-retryable"
        });
      }
    );

    it(
      "stops retrying when the retry budget is exhausted",
      () => {
        const engine =
          new RetryDecisionEngine(
            enabledPolicy
          );

        expect(
          engine.decide({
            failureType: "network",
            retriesUsed: 2
          })
        ).toEqual({
          shouldRetry: false,
          reason: "retry-budget-exhausted"
        });
      }
    );

    it(
      "fails closed for negative retry state",
      () => {
        const engine =
          new RetryDecisionEngine(
            enabledPolicy
          );

        expect(
          engine.decide({
            failureType: "network",
            retriesUsed: -1
          })
        ).toEqual({
          shouldRetry: false,
          reason: "invalid-retry-state"
        });
      }
    );

    it(
      "fails closed for fractional retry state",
      () => {
        const engine =
          new RetryDecisionEngine(
            enabledPolicy
          );

        expect(
          engine.decide({
            failureType: "network",
            retriesUsed: 0.5
          })
        ).toEqual({
          shouldRetry: false,
          reason: "invalid-retry-state"
        });
      }
    );

    it(
      "stops immediately when max retries is zero",
      () => {
        const engine =
          new RetryDecisionEngine({
            ...enabledPolicy,
            maxRetries: 0
          });

        expect(
          engine.decide({
            failureType: "network",
            retriesUsed: 0
          })
        ).toEqual({
          shouldRetry: false,
          reason: "retry-budget-exhausted"
        });
      }
    );

    it(
      "fails closed when the retry allowlist is empty",
      () => {
        const engine =
          new RetryDecisionEngine({
            ...enabledPolicy,
            retryableFailureTypes: []
          });

        expect(
          engine.decide({
            failureType: "network",
            retriesUsed: 0
          })
        ).toEqual({
          shouldRetry: false,
          reason: "failure-not-retryable"
        });
      }
    );

    it(
      "stops retrying when retries used exceed the retry budget",
      () => {
        const engine =
          new RetryDecisionEngine(
            enabledPolicy
          );

        expect(
          engine.decide({
            failureType: "timeout",
            retriesUsed: 3
          })
        ).toEqual({
          shouldRetry: false,
          reason: "retry-budget-exhausted"
        });
      }
    );
  }
);
