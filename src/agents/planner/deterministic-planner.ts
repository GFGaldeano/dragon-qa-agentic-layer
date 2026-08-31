import crypto from "node:crypto";

import {
  RequirementInput,
  TestPlan,
  TestScenario
} from "../../core/contracts/types";

export class DeterministicPlanner {
  createPlan(requirement: RequirementInput): TestPlan {
    const scenarios: TestScenario[] = [
      {
        id: "S001",
        title: "Application availability",
        description:
          "Verify that the target application is reachable and returns a usable page.",
        kind: "smoke",
        executionMode: "automated",
        priority: "critical",
        expectedResult:
          "The application loads successfully without a browser navigation failure."
      },
      {
        id: "S002",
        title: "Primary requirement happy path",
        description:
          `Validate the expected successful workflow for: ${requirement.text}`,
        kind: "happy-path",
        executionMode: "manual-review",
        priority: "high",
        expectedResult:
          "The requirement behaves according to its expected business outcome."
      },
      {
        id: "S003",
        title: "Requirement negative path",
        description:
          `Validate invalid or rejected behavior related to: ${requirement.text}`,
        kind: "negative",
        executionMode: "manual-review",
        priority: "high",
        expectedResult:
          "Invalid inputs or invalid states are rejected safely and clearly."
      },
      {
        id: "S004",
        title: "Requirement edge cases",
        description:
          `Explore boundary and uncommon conditions related to: ${requirement.text}`,
        kind: "edge-case",
        executionMode: "manual-review",
        priority: "medium",
        expectedResult:
          "Boundary conditions do not cause unexpected application behavior."
      }
    ];

    return {
      id: crypto.randomUUID(),
      requirement,
      createdAt: new Date().toISOString(),
      scenarios
    };
  }
}