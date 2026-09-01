import { describe, expect, it } from "vitest";

import {
  ExecutionPolicy
} from "../src/core/planning/execution-policy";

import {
  SafeDefaultExecutionPolicy
} from "../src/core/planning/safe-default-execution-policy";

import {
  assembleTestPlan
} from "../src/core/planning/test-plan-assembler";

describe("execution policy", () => {
  it("defaults all proposed scenarios to manual review", () => {
    const policy =
      new SafeDefaultExecutionPolicy();

    const executionMode =
      policy.resolveExecutionMode({
        title: "Application availability",
        description:
          "Validate application availability",
        kind: "smoke",
        priority: "critical",
        expectedResult:
          "Application is reachable"
      });

    expect(executionMode).toBe("manual-review");
  });

  it("allows the assembler to delegate execution mode", () => {
    const automatedPolicy: ExecutionPolicy = {
      resolveExecutionMode: () => "automated"
    };

    const plan = assembleTestPlan(
      {
        text: "Application exposes a health endpoint"
      },
      {
        scenarios: [
          {
            title: "Health endpoint availability",
            description:
              "Validate that the health endpoint responds",
            kind: "api",
            priority: "critical",
            expectedResult:
              "Health endpoint returns a valid response"
          }
        ]
      },
      automatedPolicy
    );

    expect(
      plan.scenarios[0].executionMode
    ).toBe("automated");
  });

  it("keeps safe behavior when no policy is supplied", () => {
    const plan = assembleTestPlan(
      {
        text: "User can sign in"
      },
      {
        scenarios: [
          {
            title: "Successful sign in",
            description:
              "Validate the successful sign-in flow",
            kind: "happy-path",
            priority: "high",
            expectedResult:
              "User reaches the application"
          }
        ]
      }
    );

    expect(
      plan.scenarios[0].executionMode
    ).toBe("manual-review");
  });
});
