import {
  RequirementInput,
  TestPlan
} from "../../../core/contracts/types";

import {
  PlanningProposal
} from "../../../core/contracts/planning-proposal";

import {
  assembleTestPlan
} from "../../../core/planning/test-plan-assembler";

import {
  PlannerProvider
} from "../planner-provider";

import {
  buildPlannerPrompt
} from "./planner-prompt-builder";

import {
  parsePlannerModelOutput
} from "./planner-model-output-parser";

import {
  PlannerModelClient
} from "./planner-model-client";

export class LlmPlannerProvider
  implements PlannerProvider {
  readonly name = "llm";

  constructor(
    private readonly client: PlannerModelClient
  ) {}

  async createPlan(
    requirement: RequirementInput
  ): Promise<TestPlan> {
    const prompt =
      buildPlannerPrompt(requirement);

    const raw =
      await this.client.generate(prompt);

    const modelOutput =
      parsePlannerModelOutput(raw);

    const proposal: PlanningProposal = {
      scenarios: modelOutput.scenarios
    };

    return assembleTestPlan(
      requirement,
      proposal
    );
  }
}
