import {
  describe,
  expect,
  it
} from "vitest";

import {
  FailureAnalyzer
} from "../src/agents/failure-analyzer/failure-analyzer";

import {
  FailureSignal
} from "../src/agents/failure-analyzer/failure-signal";

describe(
  "FailureAnalyzer",
  () => {
    const analyzer =
      new FailureAnalyzer();

    it(
      "classifies network failures as ENVIRONMENT",
      () => {
        const signal: FailureSignal = {
          type: "network",
          message:
            "Connection refused while reaching the application."
        };

        expect(
          analyzer.classify(signal)
        ).toBe("ENVIRONMENT");
      }
    );

    it(
      "classifies selector failures as TEST_ISSUE",
      () => {
        const signal: FailureSignal = {
          type: "selector",
          message:
            "Locator did not resolve to a usable element."
        };

        expect(
          analyzer.classify(signal)
        ).toBe("TEST_ISSUE");
      }
    );

    it(
      "classifies assertion failures as PRODUCT_BUG",
      () => {
        const signal: FailureSignal = {
          type: "assertion",
          message:
            "Expected checkout total to equal the displayed total."
        };

        expect(
          analyzer.classify(signal)
        ).toBe("PRODUCT_BUG");
      }
    );

    it(
      "classifies successful retry as FLAKY",
      () => {
        const signal: FailureSignal = {
          type: "timeout",
          message:
            "Initial attempt timed out.",
          retryAttempt: 1,
          retrySucceeded: true
        };

        expect(
          analyzer.classify(signal)
        ).toBe("FLAKY");
      }
    );

    it(
      "keeps ambiguous timeout failures in REVIEW",
      () => {
        const signal: FailureSignal = {
          type: "timeout",
          message:
            "Operation timed out."
        };

        expect(
          analyzer.classify(signal)
        ).toBe("REVIEW");
      }
    );

    it(
      "keeps unknown failures in REVIEW",
      () => {
        const signal: FailureSignal = {
          type: "unknown",
          message:
            "Unexpected failure."
        };

        expect(
          analyzer.classify(signal)
        ).toBe("REVIEW");
      }
    );
  }
);
