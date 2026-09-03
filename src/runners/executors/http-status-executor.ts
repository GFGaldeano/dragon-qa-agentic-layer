import path from "node:path";

import {
  Browser,
  BrowserContext,
  chromium,
  firefox,
  webkit
} from "playwright";

import {
  DragonConfig
} from "../../core/config/schema";

import {
  TestExecutionResult,
  TestScenario
} from "../../core/contracts/types";

import {
  FailureAnalyzer
} from "../../agents/failure-analyzer/failure-analyzer";

import {
  extractFailureSignal
} from "../../agents/failure-analyzer/failure-signal-extractor";

import {
  EvidenceManager
} from "../../evidence/evidence-manager";

import {
  ScenarioExecutor,
  ScenarioExecutorContext
} from "./scenario-executor";

export class HttpStatusExecutor
  implements ScenarioExecutor {
  readonly intentType =
    "http-status" as const;

  constructor(
    private readonly config: DragonConfig,
    private readonly evidenceManager: EvidenceManager,
    private readonly failureAnalyzer: FailureAnalyzer
  ) {}

  private async launchBrowser(): Promise<Browser> {
    const options = {
      headless: this.config.browser.headless
    };

    switch (this.config.browser.engine) {
      case "firefox":
        return firefox.launch(options);

      case "webkit":
        return webkit.launch(options);

      case "chromium":
      default:
        return chromium.launch(options);
    }
  }

  async execute(
    scenario: TestScenario,
    context: ScenarioExecutorContext
  ): Promise<TestExecutionResult> {
    const started = Date.now();

    const intent =
      scenario.executionIntent;

    if (
      !intent ||
      intent.type !== "http-status"
    ) {
      return {
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        status: "review",
        verdict: "REVIEW",
        durationMs:
          Date.now() - started,
        message:
          "HTTP status execution requires a valid http-status execution intent.",
        evidence: []
      };
    }

    const scenarioDirectory =
      this.evidenceManager.createScenarioDirectory(
        context.runDirectory,
        scenario.id
      );

    let browser: Browser | undefined;
    let browserContext:
      BrowserContext | undefined;

    try {
      browser = await this.launchBrowser();

      browserContext =
        await browser.newContext({
          recordVideo:
            this.config.evidence.video
              ? {
                  dir: scenarioDirectory
                }
              : undefined
        });

      if (this.config.evidence.trace) {
        await browserContext.tracing.start({
          screenshots: true,
          snapshots: true,
          sources: true
        });
      }

      const page =
        await browserContext.newPage();

      page.setDefaultTimeout(
        this.config.browser.timeoutMs
      );

      const response =
        await page.goto(
          context.baseUrl,
          {
            waitUntil:
              "domcontentloaded",
            timeout:
              this.config.browser.timeoutMs
          }
        );

      if (!response) {
        return {
          scenarioId: scenario.id,
          scenarioTitle:
            scenario.title,
          status: "review",
          verdict: "REVIEW",
          durationMs:
            Date.now() - started,
          message:
            "HTTP status verification did not receive an HTTP response.",
          evidence: []
        };
      }

      const actualStatus =
        response.status();

      const evidence:
        TestExecutionResult["evidence"] =
          [];

      if (
        this.config.evidence.screenshots
      ) {
        const screenshotPath =
          path.join(
            scenarioDirectory,
            "page.png"
          );

        await page.screenshot({
          path: screenshotPath,
          fullPage: true
        });

        evidence.push({
          type: "screenshot",
          path: screenshotPath
        });
      }

      if (this.config.evidence.trace) {
        const tracePath =
          path.join(
            scenarioDirectory,
            "trace.zip"
          );

        await browserContext.tracing.stop({
          path: tracePath
        });

        evidence.push({
          type: "trace",
          path: tracePath
        });
      }

      if (
        actualStatus !==
        intent.expectedStatus
      ) {
        const verdict =
          this.failureAnalyzer.classify({
            type: "http",
            message:
              `Expected HTTP ${intent.expectedStatus}, received HTTP ${actualStatus}.`,
            statusCode: actualStatus
          });

        return {
          scenarioId: scenario.id,
          scenarioTitle:
            scenario.title,
          status: "failed",
          verdict,
          durationMs:
            Date.now() - started,
          message:
            `Expected HTTP ${intent.expectedStatus}, received HTTP ${actualStatus}.`,
          evidence
        };
      }

      return {
        scenarioId: scenario.id,
        scenarioTitle:
          scenario.title,
        status: "passed",
        verdict: "PASS",
        durationMs:
          Date.now() - started,
        message:
          `HTTP ${actualStatus} matched the expected status.`,
        evidence
      };
    } catch (error) {
      const verdict =
        this.failureAnalyzer.classify(
          extractFailureSignal(error)
        );

      return {
        scenarioId: scenario.id,
        scenarioTitle:
          scenario.title,
        status: "failed",
        verdict,
        durationMs:
          Date.now() - started,
        message:
          error instanceof Error
            ? error.message
            : String(error),
        evidence: []
      };
    } finally {
      if (browserContext) {
        try {
          await browserContext.close();
        } catch {
          // Ignore cleanup failures.
        }
      }

      if (browser) {
        try {
          await browser.close();
        } catch {
          // Ignore cleanup failures.
        }
      }
    }
  }
}
