import {
  FailureSignal
} from "./failure-signal";

export function extractFailureSignal(
  error: unknown
): FailureSignal {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  const normalized =
    message.toLowerCase();

  if (
    normalized.includes("net::") ||
    normalized.includes("connection refused") ||
    normalized.includes("err_connection_refused") ||
    normalized.includes("dns") ||
    normalized.includes("name_not_resolved")
  ) {
    return {
      type: "network",
      message
    };
  }

  if (
    normalized.includes("selector") ||
    normalized.includes("locator")
  ) {
    return {
      type: "selector",
      message
    };
  }

  if (
    normalized.includes("assertionerror") ||
    normalized.includes("expected") &&
    (
      normalized.includes("equal") ||
      normalized.includes("received")
    )
  ) {
    return {
      type: "assertion",
      message
    };
  }

  if (
    normalized.includes("timeout") ||
    normalized.includes("timed out")
  ) {
    return {
      type: "timeout",
      message
    };
  }

  return {
    type: "unknown",
    message
  };
}
