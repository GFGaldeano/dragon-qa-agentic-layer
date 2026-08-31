import {
  QAVerdict,
  TestExecutionResult
} from "../contracts/types";

const priority: QAVerdict[] = [
  "PRODUCT_BUG",
  "ENVIRONMENT",
  "TEST_ISSUE",
  "FLAKY",
  "REVIEW",
  "PASS"
];

export function calculateFinalVerdict(
  results: TestExecutionResult[]
): QAVerdict {
  for (const verdict of priority) {
    if (
      results.some(
        (result) => result.verdict === verdict
      )
    ) {
      return verdict;
    }
  }

  return "REVIEW";
}