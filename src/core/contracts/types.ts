export type AutonomyLevel =
  | "observe"
  | "assist"
  | "execute"
  | "autonomous";

export type ScenarioKind =
  | "smoke"
  | "happy-path"
  | "negative"
  | "edge-case"
  | "accessibility"
  | "visual"
  | "api";

export type ExecutionMode =
  | "automated"
  | "manual-review";

export type ExecutionIntent =
  | {
      type: "application-availability";
    }
  | {
      type: "http-status";
      expectedStatus: number;
    }
  | {
      type: "page-title";
      expectedTitle: string;
    };

export type ResultStatus =
  | "passed"
  | "failed"
  | "review"
  | "skipped";

export type QAVerdict =
  | "PASS"
  | "PRODUCT_BUG"
  | "TEST_ISSUE"
  | "FLAKY"
  | "ENVIRONMENT"
  | "REVIEW";

export interface RequirementInput {
  id?: string;
  title?: string;
  text: string;
  source?: "cli" | "jira" | "file" | "api";
}

export interface TestScenario {
  id: string;
  title: string;
  description: string;
  kind: ScenarioKind;
  executionMode: ExecutionMode;
  executionIntent?: ExecutionIntent;
  priority: "critical" | "high" | "medium" | "low";
  expectedResult: string;
}

export interface TestPlan {
  id: string;
  requirement: RequirementInput;
  createdAt: string;
  scenarios: TestScenario[];
}

export interface EvidenceReference {
  type: "screenshot" | "trace" | "video" | "log";
  path: string;
}

export interface TestExecutionResult {
  scenarioId: string;
  scenarioTitle: string;
  status: ResultStatus;
  verdict: QAVerdict;
  durationMs: number;
  message: string;
  evidence: EvidenceReference[];
}

export interface DragonRunResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  baseUrl: string;
  requirement: RequirementInput;
  plan: TestPlan;
  results: TestExecutionResult[];
  finalVerdict: QAVerdict;
  humanApprovalRequired: boolean;
}