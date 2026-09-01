import crypto from "node:crypto";

import {
  RequirementsAgent
} from "../../agents/requirements/requirements-agent";

import {
  DeterministicPlannerProvider
} from "../../providers/planner/deterministic-planner-provider";

import {
  FailureAnalyzer
} from "../../agents/failure-analyzer/failure-analyzer";

import {
  EvidenceManager
} from "../../evidence/evidence-manager";

import {
  PlaywrightRunner
} from "../../runners/playwright/playwright-runner";

import {
  Reporter
} from "../../reporting/reporter";

import {
  DragonConfig
} from "../config/schema";

import {
  DragonRunResult
} from "../contracts/types";

import {
  calculateFinalVerdict
} from "../verdicts/verdict-engine";

export class DragonOrchestrator {
  constructor(
    private readonly config: DragonConfig
  ) {}

  async run(
    requirementText: string
  ): Promise<{
    result: DragonRunResult;
    runDirectory: string;
  }> {
    const runId =
      `${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}-${crypto
        .randomUUID()
        .slice(0, 8)}`;

    const startedAt =
      new Date().toISOString();

    const requirementsAgent =
      new RequirementsAgent();

    const planner =
      new DeterministicPlannerProvider();

    const failureAnalyzer =
      new FailureAnalyzer();

    const evidenceManager =
      new EvidenceManager();

    const reporter =
      new Reporter();

    const requirement =
      requirementsAgent.analyze(
        requirementText
      );

    const plan =
      await planner.createPlan(
        requirement
      );

    const runDirectory =
      evidenceManager.createRunDirectory(
        runId
      );

    const runner =
      new PlaywrightRunner(
        this.config,
        evidenceManager,
        failureAnalyzer
      );

    const results = [];

    for (const scenario of plan.scenarios) {
      const result =
        await runner.execute(
          scenario,
          {
            runDirectory,
            baseUrl:
              this.config.project.baseUrl
          }
        );

      results.push(result);
    }

    const finalVerdict =
      calculateFinalVerdict(results);

    const result: DragonRunResult = {
      runId,
      startedAt,
      completedAt:
        new Date().toISOString(),

      baseUrl:
        this.config.project.baseUrl,

      requirement,
      plan,
      results,
      finalVerdict,

      humanApprovalRequired:
        this.config.autonomy.level !==
        "autonomous"
    };

    if (this.config.reporting.json) {
      reporter.writeJson(
        result,
        runDirectory
      );
    }

    if (this.config.reporting.markdown) {
      reporter.writeMarkdown(
        result,
        runDirectory
      );
    }

    return {
      result,
      runDirectory
    };
  }
}