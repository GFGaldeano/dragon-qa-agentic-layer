import {
  ExecutionIntent,
  TestExecutionResult,
  TestScenario
} from "../../core/contracts/types";

export interface ScenarioExecutorContext {
  runDirectory: string;
  baseUrl: string;
}

export interface ScenarioExecutor {
  readonly intentType: ExecutionIntent["type"];

  execute(
    scenario: TestScenario,
    context: ScenarioExecutorContext
  ): Promise<TestExecutionResult>;
}
