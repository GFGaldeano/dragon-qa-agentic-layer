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

export class PageTextExecutor
  implements ScenarioExecutor {
  readonly intentType =
    "page-text" as const;

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
      intent.type !== "page-text"
    ) {
      return {
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        status: "review",
        verdict: "REVIEW",
        durationMs:
          Date.now() - started,
        message:
          "Page text execution requires a valid page-text execution intent.",
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

      await page.goto(
        context.baseUrl,
        {
          waitUntil:
            "domcontentloaded",
          timeout:
            this.config.browser.timeoutMs
        }
      );

      const actualText =
        await page
          .locator("body")
          .innerText();

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
        !actualText.includes(
          intent.expectedText
        )
      ) {
        return {
          scenarioId: scenario.id,
          scenarioTitle:
            scenario.title,
          status: "failed",
          verdict: "REVIEW",
          durationMs:
            Date.now() - started,
          message:
            `Expected page text to contain "${intent.expectedText}".`,
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
          `Page text contains "${intent.expectedText}".`,
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
