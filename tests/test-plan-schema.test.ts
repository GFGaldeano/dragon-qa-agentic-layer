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

  it("accepts a supported execution intent", () => {
    const parsed = TestPlanSchema.parse({
      id: "plan-1",
      requirement: {
        text: "Application is reachable",
        source: "cli"
      },
      createdAt: new Date().toISOString(),
      scenarios: [
        {
          id: "S001",
          title: "Application availability",
          description:
            "Verify that the application is reachable.",
          kind: "smoke",
          executionMode: "automated",
          executionIntent: {
            type: "application-availability"
          },
          priority: "critical",
          expectedResult:
            "The application loads successfully."
        }
      ]
    });

    expect(
      parsed.scenarios[0].executionIntent
    ).toEqual({
      type: "application-availability"
    });
  });

  it("rejects an unsupported execution intent", () => {
    expect(() =>
      TestPlanSchema.parse({
        id: "plan-1",
        requirement: {
          text: "Application is reachable"
        },
        createdAt: new Date().toISOString(),
        scenarios: [
          {
            id: "S001",
            title: "Unsupported execution",
            description:
              "Attempt unsupported execution semantics.",
            kind: "smoke",
            executionMode: "automated",
            executionIntent: {
              type: "arbitrary-browser-actions"
            },
            priority: "critical",
            expectedResult:
              "Execution must be rejected."
          }
        ]
      })
    ).toThrow();
  });

  it("rejects extra execution intent properties", () => {
    expect(() =>
      TestPlanSchema.parse({
        id: "plan-1",
        requirement: {
          text: "Application is reachable"
        },
        createdAt: new Date().toISOString(),
        scenarios: [
          {
            id: "S001",
            title: "Application availability",
            description:
              "Verify that the application is reachable.",
            kind: "smoke",
            executionMode: "automated",
            executionIntent: {
              type: "application-availability",
              selector: "#unsafe"
            },
            priority: "critical",
            expectedResult:
              "The application loads successfully."
          }
        ]
      })
    ).toThrow();
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
