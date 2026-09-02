import {
  AutonomyLevel,
  TestExecutionResult
} from "../contracts/types";

export function requiresHumanApproval(
  autonomyLevel: AutonomyLevel,
  results: TestExecutionResult[]
): boolean {
  if (
    autonomyLevel !== "autonomous"
  ) {
    return true;
  }

  if (results.length === 0) {
    return true;
  }

  return results.some(
    (result) =>
      result.verdict === "REVIEW" ||
      result.status === "review"
  );
}
