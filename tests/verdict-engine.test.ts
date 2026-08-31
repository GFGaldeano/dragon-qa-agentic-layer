import { describe, expect, it } from "vitest";

import {
  calculateFinalVerdict
} from "../src/core/verdicts/verdict-engine";

describe("calculateFinalVerdict", () => {
  it("returns REVIEW when human review is required", () => {
    const verdict = calculateFinalVerdict([
      {
        scenarioId: "S001",
        scenarioTitle: "Smoke",
        status: "passed",
        verdict: "PASS",
        durationMs: 10,
        message: "ok",
        evidence: []
      },
      {
        scenarioId: "S002",
        scenarioTitle: "Business flow",
        status: "review",
        verdict: "REVIEW",
        durationMs: 0,
        message: "review",
        evidence: []
      }
    ]);

    expect(verdict).toBe("REVIEW");
  });

  it("prioritizes PRODUCT_BUG", () => {
    const verdict = calculateFinalVerdict([
      {
        scenarioId: "S001",
        scenarioTitle: "Smoke",
        status: "passed",
        verdict: "PASS",
        durationMs: 10,
        message: "ok",
        evidence: []
      },
      {
        scenarioId: "S002",
        scenarioTitle: "Feature",
        status: "failed",
        verdict: "PRODUCT_BUG",
        durationMs: 20,
        message: "bug",
        evidence: []
      }
    ]);

    expect(verdict).toBe("PRODUCT_BUG");
  });
});
