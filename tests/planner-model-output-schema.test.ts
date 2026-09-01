import { describe, expect, it } from "vitest";

import {
  PlannerModelOutputSchema
} from "../src/providers/planner/llm/planner-model-output-schema";

describe("PlannerModelOutputSchema", () => {
  it("accepts valid model output", () => {
    const parsed = PlannerModelOutputSchema.parse({
      scenarios: [
        {
          title: "Successful sign in",
          description: "Validate valid credentials",
          kind: "happy-path",
          priority: "critical",
          expectedResult: "User signs in"
        }
      ]
    });

    expect(parsed.scenarios).toHaveLength(1);
  });

  it("rejects empty scenario arrays", () => {
    expect(() =>
      PlannerModelOutputSchema.parse({
        scenarios: []
      })
    ).toThrow();
  });

  it("rejects model-controlled scenario ids", () => {
    expect(() =>
      PlannerModelOutputSchema.parse({
        scenarios: [
          {
            id: "MODEL-001",
            title: "Successful sign in",
            description: "Validate valid credentials",
            kind: "happy-path",
            priority: "critical",
            expectedResult: "User signs in"
          }
        ]
      })
    ).toThrow();
  });

  it("rejects model-controlled execution modes", () => {
    expect(() =>
      PlannerModelOutputSchema.parse({
        scenarios: [
          {
            title: "Successful sign in",
            description: "Validate valid credentials",
            kind: "happy-path",
            executionMode: "automated",
            priority: "critical",
            expectedResult: "User signs in"
          }
        ]
      })
    ).toThrow();
  });

  it("rejects unknown top-level properties", () => {
    expect(() =>
      PlannerModelOutputSchema.parse({
        scenarios: [
          {
            title: "Successful sign in",
            description: "Validate valid credentials",
            kind: "happy-path",
            priority: "critical",
            expectedResult: "User signs in"
          }
        ],
        metadata: {
          controlledByModel: true
        }
      })
    ).toThrow();
  });
});
