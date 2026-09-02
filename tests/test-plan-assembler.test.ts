import { describe, expect, it } from "vitest";

import {
  TestPlanSchema
} from "../src/core/contracts/test-plan-schema";

import {
  assembleTestPlan
} from "../src/core/planning/test-plan-assembler";

describe("assembleTestPlan", () => {
  it("preserves trusted execution intent", () => {
    const plan = assembleTestPlan(
      {
        text:
          "The application must be reachable"
      },
      {
        scenarios: [
          {
            title:
              "Application availability",
            description:
              "Validate application availability",
            kind: "smoke",
            priority: "critical",
            expectedResult:
              "Application is reachable",
            executionCapability:
              "application-availability"
          }
        ]
      },
      {
        resolveExecutionMode:
          () => "automated"
      }
    );

    expect(
      plan.scenarios[0].executionIntent
    ).toEqual({
      type:
        "application-availability"
    });
  });

  it("does not create execution intent for untrusted scenarios", () => {
    const plan = assembleTestPlan(
      {
        text:
          "User can sign in"
      },
      {
        scenarios: [
          {
            title:
              "Successful sign in",
            description:
              "Validate successful sign in",
            kind: "happy-path",
            priority: "high",
            expectedResult:
              "User reaches the application"
          }
        ]
      },
      {
        resolveExecutionMode:
          () => "manual-review"
      }
    );

    expect(
      plan.scenarios[0].executionIntent
    ).toBeUndefined();
  });

  it("assembles a valid core-owned test plan", () => {
    const requirement = {
      text: "User can reset a forgotten password",
      source: "cli" as const
    };

    const plan = assembleTestPlan(
      requirement,
      {
        scenarios: [
          {
            title: "Successful password reset",
            description:
              "Validate the successful password reset flow",
            kind: "happy-path",
            priority: "critical",
            expectedResult:
              "User can set a new password"
          },
          {
            title: "Expired reset token",
            description:
              "Validate behavior for an expired token",
            kind: "negative",
            priority: "high",
            expectedResult:
              "Expired token is rejected safely"
          }
        ]
      }
    );

    expect(plan.requirement).toEqual(requirement);

    expect(plan.scenarios).toHaveLength(2);

    expect(plan.scenarios[0].id).toBe("S001");
    expect(plan.scenarios[1].id).toBe("S002");

    expect(plan.scenarios[0].executionMode).toBe(
      "manual-review"
    );

    expect(plan.scenarios[1].executionMode).toBe(
      "manual-review"
    );

    expect(plan.id).toBeTruthy();

    expect(
      Number.isNaN(Date.parse(plan.createdAt))
    ).toBe(false);

    expect(() =>
      TestPlanSchema.parse(plan)
    ).not.toThrow();
  });

  it("preserves model-proposed QA content", () => {
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
      }
    );

    expect(plan.scenarios[0]).toMatchObject({
      id: "S001",
      title: "Health endpoint availability",
      description:
        "Validate that the health endpoint responds",
      kind: "api",
      executionMode: "manual-review",
      priority: "critical",
      expectedResult:
        "Health endpoint returns a valid response"
    });
  });
});
