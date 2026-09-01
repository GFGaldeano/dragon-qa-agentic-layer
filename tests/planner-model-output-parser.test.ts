import { describe, expect, it } from "vitest";

import {
  parsePlannerModelOutput
} from "../src/providers/planner/llm/planner-model-output-parser";

describe("parsePlannerModelOutput", () => {
  it("parses valid JSON output", () => {
    const raw = JSON.stringify({
      scenarios: [
        {
          title: "Availability",
          description: "Validate availability",
          kind: "smoke",
          priority: "critical",
          expectedResult: "Application responds"
        }
      ]
    });

    const parsed = parsePlannerModelOutput(raw);

    expect(parsed.scenarios).toHaveLength(1);
  });

  it("rejects empty responses", () => {
    expect(() =>
      parsePlannerModelOutput("   ")
    ).toThrow(
      "Planner model returned an empty response"
    );
  });

  it("rejects invalid JSON", () => {
    expect(() =>
      parsePlannerModelOutput("not-json")
    ).toThrow(
      "Planner model returned invalid JSON"
    );
  });

  it("rejects structurally invalid JSON", () => {
    expect(() =>
      parsePlannerModelOutput(
        JSON.stringify({ scenarios: [] })
      )
    ).toThrow();
  });
});
