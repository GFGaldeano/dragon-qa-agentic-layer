import {
  RequirementInput,
  TestPlan
} from "../../core/contracts/types";

import {
  PlanningProposal
} from "../../core/contracts/planning-proposal";

import {
  ExecutionPolicy
} from "../../core/planning/execution-policy";

import {
  assembleTestPlan
} from "../../core/planning/test-plan-assembler";

export class DeterministicPlanner {

  constructor(
    private readonly executionPolicy?:
      ExecutionPolicy
  ) {}

  createPlan(
    requirement: RequirementInput
  ): TestPlan {

    const proposal: PlanningProposal = {
      scenarios: [
        {
          title: "Application availability",
          description:
            "Verify that the target application is reachable and returns a usable page.",
          kind: "smoke",
          priority: "critical",
          expectedResult:
            "The application loads successfully without a browser navigation failure.",
          executionCapability:
            "application-availability"
        },
        {
          title:
            "Primary requirement happy path",
          description:
            `Validate the expected successful workflow for: ${requirement.text}`,
          kind: "happy-path",
          priority: "high",
          expectedResult:
            "The requirement behaves according to its expected business outcome."
        },
        {
          title:
            "Requirement negative path",
          description:
            `Validate invalid or rejected behavior related to: ${requirement.text}`,
          kind: "negative",
          priority: "high",
          expectedResult:
            "Invalid inputs or invalid states are rejected safely and clearly."
        },
        {
          title:
            "Requirement edge cases",
          description:
            `Explore boundary and uncommon conditions related to: ${requirement.text}`,
          kind: "edge-case",
          priority: "medium",
          expectedResult:
            "Boundary conditions do not cause unexpected application behavior."
        }
      ]
    };

    return assembleTestPlan(
      requirement,
      proposal,
      this.executionPolicy
    );
  }
}
