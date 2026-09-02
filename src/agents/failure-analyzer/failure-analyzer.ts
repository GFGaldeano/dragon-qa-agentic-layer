import {
  QAVerdict
} from "../../core/contracts/types";

import {
  FailureSignal
} from "./failure-signal";

export class FailureAnalyzer {
  classify(
    signal: FailureSignal
  ): QAVerdict {
    if (
      signal.retryAttempt !== undefined &&
      signal.retryAttempt > 0 &&
      signal.retrySucceeded === true
    ) {
      return "FLAKY";
    }

    switch (signal.type) {
      case "network":
        return "ENVIRONMENT";

      case "selector":
        return "TEST_ISSUE";

      case "assertion":
        return "PRODUCT_BUG";

      case "timeout":
      case "http":
      case "browser":
      case "unknown":
      default:
        return "REVIEW";
    }
  }
}
