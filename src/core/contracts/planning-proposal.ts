import {
  ScenarioKind
} from "./types";

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
}

export interface PlanningProposal {
  scenarios: PlanningScenarioProposal[];
}
