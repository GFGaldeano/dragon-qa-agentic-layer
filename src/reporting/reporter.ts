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