import { describe, expect, it } from "vitest";

import {
  DeterministicPlannerProvider
} from "../src/providers/planner/deterministic-planner-provider";

describe("DeterministicPlannerProvider", () => {
  it("returns a validated deterministic plan", async () => {
    const provider =
      new DeterministicPlannerProvider();

    const plan = await provider.createPlan({
      text: "The website must be reachable",
      source: "cli"
    });

    expect(provider.name).toBe("deterministic");
    expect(plan.scenarios).toHaveLength(4);
    expect(plan.scenarios[0].id).toBe("S001");
    expect(plan.scenarios[0].kind).toBe("smoke");
  });
});
