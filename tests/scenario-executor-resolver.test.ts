import {
  describe,
  expect,
  it
} from "vitest";

import {
  ScenarioExecutor
} from "../src/runners/executors/scenario-executor";

import {
  ScenarioExecutorResolver
} from "../src/runners/executors/scenario-executor-resolver";

describe(
  "ScenarioExecutorResolver",
  () => {
    const executor: ScenarioExecutor = {
      intentType:
        "application-availability",

      async execute() {
        throw new Error(
          "Not implemented in resolver test."
        );
      }
    };

    it(
      "resolves a registered executor",
      () => {
        const resolver =
          new ScenarioExecutorResolver([
            executor
          ]);

        expect(
          resolver.resolve({
            type:
              "application-availability"
          })
        ).toBe(executor);
      }
    );

    it(
      "fails closed when no executor is registered",
      () => {
        const resolver =
          new ScenarioExecutorResolver();

        expect(() =>
          resolver.resolve({
            type:
              "application-availability"
          })
        ).toThrow(
          "No scenario executor registered for intent: application-availability"
        );
      }
    );

    it(
      "rejects duplicate executors for the same intent",
      () => {
        expect(() =>
          new ScenarioExecutorResolver([
            executor,
            executor
          ])
        ).toThrow(
          "Duplicate scenario executor for intent: application-availability"
        );
      }
    );
  }
);
