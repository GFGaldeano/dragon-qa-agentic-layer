import { describe, expect, it } from "vitest";

import {
  LlmPlannerProvider
} from "../src/providers/planner/llm/llm-planner-provider";

import {
  PlannerModelClient
} from "../src/providers/planner/llm/planner-model-client";

describe("LlmPlannerProvider", () => {
  it("creates a validated test plan from model output", async () => {
    let capturedPrompt = "";

    const client: PlannerModelClient = {
      name: "fake",

      async generate(prompt: string) {
        capturedPrompt = prompt;

        return JSON.stringify({
          scenarios: [
            {
              title: "Successful sign in",
              description:
                "Validate a successful sign-in flow",
              kind: "happy-path",
              priority: "critical",
              expectedResult:
                "User reaches the application"
            },
            {
              title: "Invalid credentials",
              description:
                "Validate rejection of invalid credentials",
              kind: "negative",
              priority: "high",
              expectedResult:
                "Authentication is rejected safely"
            }
          ]
        });
      }
    };

    const provider =
      new LlmPlannerProvider(client);

    const plan =
      await provider.createPlan({
        text: "User can sign in",
        source: "cli"
      });

    expect(provider.name).toBe("llm");

    expect(capturedPrompt).toContain(
      "User can sign in"
    );

    expect(plan.scenarios).toHaveLength(2);

    expect(plan.scenarios[0]).toMatchObject({
      id: "S001",
      title: "Successful sign in",
      kind: "happy-path",
      executionMode: "manual-review",
      priority: "critical"
    });

    expect(plan.scenarios[1]).toMatchObject({
      id: "S002",
      title: "Invalid credentials",
      kind: "negative",
      executionMode: "manual-review",
      priority: "high"
    });

    expect(plan.id).toBeTruthy();

    expect(
      Number.isNaN(Date.parse(plan.createdAt))
    ).toBe(false);
  });

  it("fails closed when the model returns invalid JSON", async () => {
    const client: PlannerModelClient = {
      name: "fake",

      async generate() {
        return "not-json";
      }
    };

    const provider =
      new LlmPlannerProvider(client);

    await expect(
      provider.createPlan({
        text: "User can sign in"
      })
    ).rejects.toThrow(
      "Planner model returned invalid JSON"
    );
  });

  it("fails closed when the model output violates the schema", async () => {
    const client: PlannerModelClient = {
      name: "fake",

      async generate() {
        return JSON.stringify({
          scenarios: [
            {
              title: "Generated scenario",
              description:
                "Scenario with forbidden execution mode",
              kind: "happy-path",
              priority: "high",
              expectedResult:
                "Expected behavior",
              executionMode: "automated"
            }
          ]
        });
      }
    };

    const provider =
      new LlmPlannerProvider(client);

    await expect(
      provider.createPlan({
        text: "User can sign in"
      })
    ).rejects.toThrow();
  });
});
