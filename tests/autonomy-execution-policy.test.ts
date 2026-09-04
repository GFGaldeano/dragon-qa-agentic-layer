import {
  describe,
  expect,
  it
} from "vitest";

import {
  AutonomyExecutionPolicy
} from "../src/core/planning/autonomy-execution-policy";

const availabilityScenario = {
  title: "Application availability",
  description:
    "Verify that the target application is reachable.",
  kind: "smoke" as const,
  priority: "critical" as const,
  expectedResult:
    "Application is reachable.",
  executionCapability:
    "application-availability" as const
};

const httpStatusScenario = {
  title: "HTTP status",
  description:
    "Verify that the target application returns HTTP 200.",
  kind: "smoke" as const,
  priority: "critical" as const,
  expectedResult:
    "Application returns HTTP 200.",
  executionCapability:
    "http-status" as const,
  executionSpec: {
    expectedStatus: 200
  }
};

const pageTitleScenario = {
  title: "Page title",
  description:
    "Verify that the application page title matches the expected value.",
  kind: "smoke" as const,
  priority: "high" as const,
  expectedResult:
    "Application page title matches the expected value.",
  executionCapability:
    "page-title" as const,
  executionSpec: {
    expectedTitle: "Dragon QA"
  }
};

const pageTextScenario = {
  title: "Page text",
  description:
    "Verify that the application page contains the expected text.",
  kind: "smoke" as const,
  priority: "high" as const,
  expectedResult:
    "Application page contains the expected text.",
  executionCapability:
    "page-text" as const,
  executionSpec: {
    expectedText: "Dragon QA"
  }
};

const untrustedScenario = {
  title: "Generated smoke scenario",
  description:
    "A scenario without trusted execution capability.",
  kind: "smoke" as const,
  priority: "critical" as const,
  expectedResult:
    "Expected behavior."
};

describe(
  "AutonomyExecutionPolicy",
  () => {

    it(
      "never automates trusted capabilities in observe mode",
      () => {
        const policy =
          new AutonomyExecutionPolicy(
            "observe"
          );

        expect(
          policy.resolveExecutionMode(
            availabilityScenario
          )
        ).toBe("manual-review");
      }
    );

    it.each([
      "assist",
      "execute",
      "autonomous"
    ] as const)(
      "automates trusted capabilities in %s mode",
      (level) => {
        const policy =
          new AutonomyExecutionPolicy(
            level
          );

        expect(
          policy.resolveExecutionMode(
            availabilityScenario
          )
        ).toBe("automated");
      }
    );

    it.each([
      "assist",
      "execute",
      "autonomous"
    ] as const)(
      "automates trusted http status capability in %s mode",
      (level) => {
        const policy =
          new AutonomyExecutionPolicy(
            level
          );

        expect(
          policy.resolveExecutionMode(
            httpStatusScenario
          )
        ).toBe("automated");
      }
    );

    it.each([
      "assist",
      "execute",
      "autonomous"
    ] as const)(
      "keeps http status capability manual when execution spec is missing in %s mode",
      (level) => {
        const policy =
          new AutonomyExecutionPolicy(
            level
          );

        expect(
          policy.resolveExecutionMode({
            ...httpStatusScenario,
            executionSpec: undefined
          })
        ).toBe("manual-review");
      }
    );

    it.each([
      99,
      600,
      200.5
    ])(
      "keeps http status capability manual for invalid expected status %s",
      (expectedStatus) => {
        const policy =
          new AutonomyExecutionPolicy(
            "assist"
          );

        expect(
          policy.resolveExecutionMode({
            ...httpStatusScenario,
            executionSpec: {
              expectedStatus
            }
          })
        ).toBe("manual-review");
      }
    );

    it.each([
      "assist",
      "execute",
      "autonomous"
    ] as const)(
      "automates trusted page title capability in %s mode",
      (level) => {
        const policy =
          new AutonomyExecutionPolicy(
            level
          );

        expect(
          policy.resolveExecutionMode(
            pageTitleScenario
          )
        ).toBe("automated");
      }
    );

    it.each([
      "assist",
      "execute",
      "autonomous"
    ] as const)(
      "keeps page title capability manual when execution spec is missing in %s mode",
      (level) => {
        const policy =
          new AutonomyExecutionPolicy(
            level
          );

        expect(
          policy.resolveExecutionMode({
            ...pageTitleScenario,
            executionSpec: undefined
          })
        ).toBe("manual-review");
      }
    );

    it.each([
      "",
      "   "
    ])(
      "keeps page title capability manual for invalid expected title %j",
      (expectedTitle) => {
        const policy =
          new AutonomyExecutionPolicy(
            "assist"
          );

        expect(
          policy.resolveExecutionMode({
            ...pageTitleScenario,
            executionSpec: {
              expectedTitle
            }
          })
        ).toBe("manual-review");
      }
    );

    it.each([
      "assist",
      "execute",
      "autonomous"
    ] as const)(
      "automates trusted page text capability in %s mode",
      (level) => {
        const policy =
          new AutonomyExecutionPolicy(
            level
          );

        expect(
          policy.resolveExecutionMode(
            pageTextScenario
          )
        ).toBe("automated");
      }
    );

    it.each([
      "assist",
      "execute",
      "autonomous"
    ] as const)(
      "keeps page text capability manual when execution spec is missing in %s mode",
      (level) => {
        const policy =
          new AutonomyExecutionPolicy(
            level
          );

        expect(
          policy.resolveExecutionMode({
            ...pageTextScenario,
            executionSpec: undefined
          })
        ).toBe("manual-review");
      }
    );

    it.each([
      "",
      "   "
    ])(
      "keeps page text capability manual for invalid expected text %j",
      (expectedText) => {
        const policy =
          new AutonomyExecutionPolicy(
            "assist"
          );

        expect(
          policy.resolveExecutionMode({
            ...pageTextScenario,
            executionSpec: {
              expectedText
            }
          })
        ).toBe("manual-review");
      }
    );

    it.each([
      "observe",
      "assist",
      "execute",
      "autonomous"
    ] as const)(
      "keeps scenarios without trusted capability manual in %s mode",
      (level) => {
        const policy =
          new AutonomyExecutionPolicy(
            level
          );

        expect(
          policy.resolveExecutionMode(
            untrustedScenario
          )
        ).toBe("manual-review");
      }
    );
  }
);
