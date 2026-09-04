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

  it("accepts an http status execution intent", () => {
    const parsed = TestPlanSchema.parse({
      id: "plan-1",
      requirement: {
        text: "Application returns HTTP 200",
        source: "cli"
      },
      createdAt: new Date().toISOString(),
      scenarios: [
        {
          id: "S001",
          title: "HTTP status",
          description:
            "Verify the application HTTP status.",
          kind: "smoke",
          executionMode: "automated",
          executionIntent: {
            type: "http-status",
            expectedStatus: 200
          },
          priority: "critical",
          expectedResult:
            "Application returns HTTP 200."
        }
      ]
    });

    expect(
      parsed.scenarios[0].executionIntent
    ).toEqual({
      type: "http-status",
      expectedStatus: 200
    });
  });

  it("accepts a page title execution intent", () => {
    const parsed = TestPlanSchema.parse({
      id: "plan-page-title",
      requirement: {
        text:
          "Application page title is Dragon QA",
        source: "cli"
      },
      createdAt:
        new Date().toISOString(),
      scenarios: [
        {
          id: "S001",
          title: "Page title",
          description:
            "Verify the application page title.",
          kind: "smoke",
          executionMode: "automated",
          executionIntent: {
            type: "page-title",
            expectedTitle:
              "Dragon QA"
          },
          priority: "high",
          expectedResult:
            "Application page title is Dragon QA."
        }
      ]
    });

    expect(
      parsed.scenarios[0].executionIntent
    ).toEqual({
      type: "page-title",
      expectedTitle: "Dragon QA"
    });
  });

  it.each([
    "",
    "   "
  ])(
    "rejects page title execution intent with invalid expected title %j",
    (expectedTitle) => {
      expect(() =>
        TestPlanSchema.parse({
          id: "plan-page-title-invalid",
          requirement: {
            text:
              "Application must have a page title",
            source: "cli"
          },
          createdAt:
            new Date().toISOString(),
          scenarios: [
            {
              id: "S001",
              title: "Page title",
              description:
                "Verify the application page title.",
              kind: "smoke",
              executionMode:
                "automated",
              executionIntent: {
                type: "page-title",
                expectedTitle
              },
              priority: "high",
              expectedResult:
                "Application has a page title."
            }
          ]
        })
      ).toThrow();
    }
  );

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
