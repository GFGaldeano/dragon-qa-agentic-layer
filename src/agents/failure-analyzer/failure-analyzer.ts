import {
  QAVerdict
} from "../../core/contracts/types";

export class FailureAnalyzer {
  classify(error: unknown): QAVerdict {
    const message =
      error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();

    if (
      message.includes("net::") ||
      message.includes("connection refused") ||
      message.includes("dns") ||
      message.includes("name_not_resolved")
    ) {
      return "ENVIRONMENT";
    }

    if (
      message.includes("timeout") ||
      message.includes("selector") ||
      message.includes("locator")
    ) {
      return "TEST_ISSUE";
    }

    return "REVIEW";
  }
}