import {
  ExecutionMode
} from "../contracts/types";

import {
  PlanningScenarioProposal
} from "../contracts/planning-proposal";

import {
  ExecutionPolicy
} from "./execution-policy";

export class SafeDefaultExecutionPolicy
  implements ExecutionPolicy {
  resolveExecutionMode(
    _scenario: PlanningScenarioProposal
  ): ExecutionMode {
    return "manual-review";
  }
}
