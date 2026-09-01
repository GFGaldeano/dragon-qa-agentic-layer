import { Command } from "commander";
import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";

import { loadDragonConfig } from "../core/config/loader";
import { DragonOrchestrator } from "../core/orchestration/dragon-orchestrator";
import {
  resolvePlannerModelClient
} from "../providers/planner/llm/planner-model-client-resolver";

const program = new Command();

function header(): void {
  console.log("");
  console.log(chalk.red("[DRAGON] DRAGON QA Agentic Layer"));
  console.log("Agentic Quality Engineering for Modern SDLC");
  console.log("");
}

program
  .name("dragon-qa")
  .description("Agentic Quality Engineering for Modern SDLC")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize DRAGON QA in the current project")
  .action(async () => {
    header();

    const cwd = process.cwd();

    const configPath = path.join(cwd, "dragon-qa.config.yaml");
    const evidencePath = path.join(cwd, ".dragon-qa", "runs");

    const exampleConfigPath = path.join(
      cwd,
      "dragon-qa.config.example.yaml"
    );

    if (!fs.existsSync(configPath)) {
      if (fs.existsSync(exampleConfigPath)) {
        fs.copyFileSync(exampleConfigPath, configPath);
      } else {
        const defaultConfig = [
          "project:",
          "  name: my-project",
          "  baseUrl: http://localhost:3000",
          "",
          "autonomy:",
          "  level: assist",
          "",
          "testing:",
          "  ui: true",
          "  api: false",
          "  accessibility: false",
          "  visual: false",
          "",
          "browser:",
          "  engine: chromium",
          "  headless: true",
          "  timeoutMs: 30000",
          "",
          "evidence:",
          "  screenshots: true",
          "  trace: true",
          "  video: false",
          "",
          "reporting:",
          "  markdown: true",
          "  json: true",
          "",
          "providers:",
          "  planner: deterministic",
          "  failureAnalyzer: deterministic",
          ""
        ].join("\n");

        fs.writeFileSync(configPath, defaultConfig, "utf8");
      }
    }

    fs.mkdirSync(evidencePath, { recursive: true });

    console.log(chalk.green("[OK] DRAGON QA initialized"));
    console.log("");
    console.log(`Configuration: ${configPath}`);
    console.log(`Evidence:      ${evidencePath}`);
    console.log("");
    console.log("Next: edit dragon-qa.config.yaml and run:");
    console.log("");
    console.log('  dragon-qa run --requirement "Your requirement"');
    console.log("");
  });

program
  .command("run")
  .description("Analyze and execute QA scenarios")
  .requiredOption(
    "-r, --requirement <requirement>",
    "Requirement or acceptance criteria"
  )
  .option("-u, --url <url>", "Override application URL")
  .action(async (options: { requirement: string; url?: string }) => {
    header();

    try {
      const config = loadDragonConfig(path.join(process.cwd(), "dragon-qa.config.yaml"));

      if (options.url) {
        config.project.baseUrl = options.url;
      }

      console.log(`Project: ${config.project.name}`);
      console.log(`URL:     ${config.project.baseUrl}`);
      console.log(`Mode:    ${config.autonomy.level}`);
      console.log("");

      console.log("-> Analyzing requirement...");

      const plannerModelClient =
        resolvePlannerModelClient(
          config,
          process.env
        );

      const orchestrator =
        new DragonOrchestrator(
          config,
          plannerModelClient
            ? {
                planner: {
                  plannerModelClient
                }
              }
            : {}
        );

      const execution = await orchestrator.run(options.requirement);
      const result = execution.result;

      console.log(chalk.green("[OK] Requirement analyzed"));
      console.log(
        chalk.green(
          `[OK] ${result.plan.scenarios.length} scenarios generated`
        )
      );
      console.log(chalk.green("[OK] Execution completed"));
      console.log(chalk.green("[OK] Evidence collected"));

      console.log("");
      console.log("RESULT");
      console.log("--------------------------------");

      for (const scenario of result.results) {
        let marker = "[REVIEW]";
        let formatter = chalk.yellow;

        if (scenario.verdict === "PASS") {
          marker = "[PASS]";
          formatter = chalk.green;
        } else if (
          scenario.verdict === "PRODUCT_BUG" ||
          scenario.verdict === "TEST_ISSUE" ||
          scenario.verdict === "ENVIRONMENT"
        ) {
          marker = "[FAIL]";
          formatter = chalk.red;
        }

        const plannedScenario = result.plan.scenarios.find(
          (item) => item.id === scenario.scenarioId
        );

        const title = plannedScenario?.title ?? "Untitled scenario";

        console.log(
          formatter(
            `${marker} ${scenario.scenarioId} ${scenario.verdict} - ${title}`
          )
        );
      }

      console.log("--------------------------------");
      console.log("");
      console.log(`Final verdict: ${result.finalVerdict}`);
      console.log(`Evidence:      ${execution.runDirectory}`);
      console.log("");

      if (result.humanApprovalRequired) {
        console.log(chalk.yellow("Human QA approval required."));
        console.log("");
      }
    } catch (error) {
      console.error("");
      console.error(chalk.red("[ERROR] DRAGON QA execution failed"));

      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error(String(error));
      }

      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv).catch((error) => {
  console.error("[ERROR]", error);
  process.exitCode = 1;
});