import {
  ExecutionMode
} from "../contracts/types";

import {
  PlanningScenarioProposal
} from "../contracts/planning-proposal";

export interface ExecutionPolicy {
  resolveExecutionMode(
    scenario: PlanningScenarioProposal
  ): ExecutionMode;
}
