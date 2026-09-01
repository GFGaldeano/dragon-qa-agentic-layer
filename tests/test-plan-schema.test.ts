import { describe, expect, it } from "vitest";

import {
  TestPlanSchema
} from "../src/core/contracts/test-plan-schema";

describe("TestPlanSchema", () => {
  it("accepts a valid test plan", () => {
    const parsed = TestPlanSchema.parse({
      id: "plan-1",
      requirement: {
        text: "User can sign in",
        source: "cli"
      },
      createdAt: new Date().toISOString(),
      scenarios: [
        {
          id: "S001",
          title: "Sign in",
          description: "Validate sign in",
          kind: "happy-path",
          executionMode: "manual-review",
          priority: "high",
          expectedResult: "User signs in"
        }
      ]
    });

    expect(parsed.scenarios).toHaveLength(1);
  });

  it("rejects a plan without scenarios", () => {
    expect(() =>
      TestPlanSchema.parse({
        id: "plan-1",
        requirement: {
          text: "User can sign in"
        },
        createdAt: new Date().toISOString(),
        scenarios: []
      })
    ).toThrow();
  });
});
