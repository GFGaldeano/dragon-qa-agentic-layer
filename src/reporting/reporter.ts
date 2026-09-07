import fs from "node:fs";
import path from "node:path";

import {
  DragonRunResult
} from "../core/contracts/types";

export class Reporter {
  writeJson(
    result: DragonRunResult,
    runDirectory: string
  ): string {
    const reportPath = path.join(
      runDirectory,
      "report.json"
    );

    fs.writeFileSync(
      reportPath,
      JSON.stringify(result, null, 2),
      "utf8"
    );

    return reportPath;
  }

  writeMarkdown(
    result: DragonRunResult,
    runDirectory: string
  ): string {
    const reportPath = path.join(
      runDirectory,
      "report.md"
    );

    const lines: string[] = [
      "# DRAGON QA Agentic Layer",
      "",
      `Run ID: \`${result.runId}\``,
      "",
      `Base URL: ${result.baseUrl}`,
      "",
      "## Requirement",
      "",
      result.requirement.text,
      "",
      "## Final Verdict",
      "",
      `**${result.finalVerdict}**`,
      "",
      "## Test Results",
      ""
    ];

    for (const item of result.results) {
      lines.push(
        `### ${item.scenarioId} - ${item.scenarioTitle}`,
        "",
        `- Status: ${item.status}`,
        `- Verdict: ${item.verdict}`,
        `- Duration: ${item.durationMs} ms`,
        `- Message: ${item.message}`,
        ""
      );

      if (item.evidence.length > 0) {
        lines.push("Evidence:", "");

        for (const evidence of item.evidence) {
          lines.push(
            `- ${evidence.type}: \`${evidence.path}\``
          );
        }

        lines.push("");
      }
    }

    if (result.retryHistories?.length) {
      lines.push(
        "## Retry History",
        ""
      );

      for (const history of result.retryHistories) {
        lines.push(
          `### ${history.scenarioId}`,
          "",
          `- Retries used: ${history.retriesUsed}`,
          ""
        );

        for (const attempt of history.attempts) {
          lines.push(
            `#### Attempt ${attempt.attemptNumber}`,
            "",
            `- Status: ${attempt.result.status}`,
            `- Verdict: ${attempt.result.verdict}`,
            `- Duration: ${attempt.result.durationMs} ms`,
            `- Message: ${attempt.result.message}`,
            ""
          );

          if (attempt.result.failure) {
            const failure = attempt.result.failure;

            lines.push(
              `- Failure type: ${failure.type}`,
              `- Failure message: ${failure.message}`,
              ""
            );

            if (failure.code !== undefined) {
              lines.push(
                `- Failure code: ${failure.code}`
              );
            }

            if (failure.statusCode !== undefined) {
              lines.push(
                `- HTTP status: ${failure.statusCode}`
              );
            }

            if (failure.retryAttempt !== undefined) {
              lines.push(
                `- Retry attempt: ${failure.retryAttempt}`
              );
            }

            if (failure.retrySucceeded !== undefined) {
              lines.push(
                `- Retry succeeded: ${failure.retrySucceeded}`
              );
            }

            lines.push("");
          }

          const decision =
            attempt.decisionAfterAttempt;

          if (decision) {
            lines.push(
              `- Retry decision: ${decision.reason}`,
              `- Retry authorized: ${decision.shouldRetry}`,
              ""
            );
          }

          if (attempt.result.evidence.length > 0) {
            lines.push("Evidence:", "");

            for (const evidence of attempt.result.evidence) {
              lines.push(
                `- ${evidence.type}: \`${evidence.path}\``
              );
            }

            lines.push("");
          }
        }
      }
    }

    lines.push(
      "## Human Validation",
      "",
      result.humanApprovalRequired
        ? "Human QA approval is required before this run is considered an official QA verdict."
        : "No additional human approval was requested.",
      ""
    );

    fs.writeFileSync(
      reportPath,
      lines.join("\n"),
      "utf8"
    );

    return reportPath;
  }
}