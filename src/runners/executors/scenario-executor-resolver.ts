import {
  ExecutionIntent
} from "../../core/contracts/types";

import {
  ScenarioExecutor
} from "./scenario-executor";

export class ScenarioExecutorResolver {
  private readonly executors =
    new Map<
      ExecutionIntent["type"],
      ScenarioExecutor
    >();

  constructor(
    executors: ScenarioExecutor[] = []
  ) {
    for (const executor of executors) {
      if (
        this.executors.has(
          executor.intentType
        )
      ) {
        throw new Error(
          `Duplicate scenario executor for intent: ${executor.intentType}`
        );
      }

      this.executors.set(
        executor.intentType,
        executor
      );
    }
  }

  resolve(
    intent: ExecutionIntent
  ): ScenarioExecutor {
    const executor =
      this.executors.get(intent.type);

    if (!executor) {
      throw new Error(
        `No scenario executor registered for intent: ${intent.type}`
      );
    }

    return executor;
  }
}
