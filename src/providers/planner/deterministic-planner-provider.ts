import {
  DeterministicPlanner
} from "../../agents/planner/deterministic-planner";

import {
  RequirementInput,
  TestPlan
} from "../../core/contracts/types";

import {
  TestPlanSchema
} from "../../core/contracts/test-plan-schema";

import {
  PlannerProvider
} from "./planner-provider";

export class DeterministicPlannerProvider
  implements PlannerProvider {

  readonly name = "deterministic";

  private readonly planner =
    new DeterministicPlanner();

  async createPlan(
    requirement: RequirementInput
  ): Promise<TestPlan> {
    const plan =
      this.planner.createPlan(requirement);

    return TestPlanSchema.parse(plan);
  }
}
