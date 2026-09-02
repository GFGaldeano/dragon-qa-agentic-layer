import {
  ScenarioKind
} from "./types";

export type ExecutionCapability =
  | "application-availability";

export interface PlanningScenarioProposal {
  title: string;
  description: string;
  kind: ScenarioKind;
  priority:
    | "critical"
    | "high"
    | "medium"
    | "low";
  expectedResult: string;

  /**
   * Internal trusted capability.
   *
   * This field is assigned only by trusted code paths.
   * It is intentionally not part of the LLM model output contract.
   */
  executionCapability?: ExecutionCapability;
}

export interface PlanningProposal {
  scenarios: PlanningScenarioProposal[];
}
