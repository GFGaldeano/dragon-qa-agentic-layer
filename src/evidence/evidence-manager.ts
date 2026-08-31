import fs from "node:fs";
import path from "node:path";

export class EvidenceManager {
  constructor(
    private readonly rootDirectory = ".dragon-qa/runs"
  ) {}

  createRunDirectory(runId: string): string {
    const directory = path.resolve(
      this.rootDirectory,
      runId
    );

    fs.mkdirSync(directory, {
      recursive: true
    });

    return directory;
  }

  createScenarioDirectory(
    runDirectory: string,
    scenarioId: string
  ): string {
    const directory = path.join(
      runDirectory,
      scenarioId
    );

    fs.mkdirSync(directory, {
      recursive: true
    });

    return directory;
  }
}