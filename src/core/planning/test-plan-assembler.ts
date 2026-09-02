import crypto from "node:crypto";

import {
  RequirementInput,
  TestPlan,
  TestScenario
} from "../contracts/types";

import {
  PlanningProposal
} from "../contracts/planning-proposal";

import {
  TestPlanSchema
} from "../contracts/test-plan-schema";

import {
  ExecutionPolicy
} from "./execution-policy";

import {
  SafeDefaultExecutionPolicy
} from "./safe-default-execution-policy";

export function assembleTestPlan(
  requirement: RequirementInput,
  proposal: PlanningProposal,
  executionPolicy: ExecutionPolicy =
    new SafeDefaultExecutionPolicy()
): TestPlan {
  const scenarios: TestScenario[] =
    proposal.scenarios.map(
      (scenario, index) => ({
        id: `S${String(index + 1).padStart(3, "0")}`,
        title: scenario.title,
        description: scenario.description,
        kind: scenario.kind,
        executionMode:
          executionPolicy.resolveExecutionMode(
            scenario
          ),
        executionIntent:
          scenario.executionCapability ===
          "application-availability"
            ? {
                type:
                  "application-availability"
              }
            : undefined,
        priority: scenario.priority,
        expectedResult: scenario.expectedResult
      })
    );

  const plan: TestPlan = {
    id: crypto.randomUUID(),
    requirement,
    createdAt: new Date().toISOString(),
    scenarios
  };

  return TestPlanSchema.parse(plan);
}
