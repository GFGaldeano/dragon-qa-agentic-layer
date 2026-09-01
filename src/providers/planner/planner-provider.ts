import {
  RequirementInput,
  TestPlan
} from "../../core/contracts/types";

export interface PlannerProvider {
  readonly name: string;

  createPlan(
    requirement: RequirementInput
  ): Promise<TestPlan>;
}
