export type FailureSignalType =
  | "network"
  | "timeout"
  | "selector"
  | "assertion"
  | "http"
  | "browser"
  | "unknown";

export interface FailureSignal {
  type: FailureSignalType;
  message: string;
  code?: string;
  statusCode?: number;
  retryAttempt?: number;
  retrySucceeded?: boolean;
}
