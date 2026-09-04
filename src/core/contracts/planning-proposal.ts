import {
  ScenarioKind
} from "./types";

export type ExecutionCapability =
  | "application-availability"
  | "http-status"
  | "page-title";

export type ExecutionSpec =
  | {
      expectedStatus: number;
    }
  | {
      expectedTitle: string;
    };

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

  /**
   * Internal trusted execution parameters.
   *
   * This field is assigned only by trusted code paths.
   * It is intentionally not part of the LLM model output contract.
   */
  executionSpec?: ExecutionSpec;
}

export interface PlanningProposal {
  scenarios: PlanningScenarioProposal[];
}
