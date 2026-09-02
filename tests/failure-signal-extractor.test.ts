import {
  describe,
  expect,
  it
} from "vitest";

import {
  extractFailureSignal
} from "../src/agents/failure-analyzer/failure-signal-extractor";

describe(
  "extractFailureSignal",
  () => {
    it(
      "extracts network failures",
      () => {
        const signal =
          extractFailureSignal(
            new Error(
              "page.goto: net::ERR_CONNECTION_REFUSED"
            )
          );

        expect(signal.type).toBe(
          "network"
        );

        expect(signal.message).toContain(
          "ERR_CONNECTION_REFUSED"
        );
      }
    );

    it(
      "extracts DNS failures as network failures",
      () => {
        const signal =
          extractFailureSignal(
            new Error(
              "net::ERR_NAME_NOT_RESOLVED"
            )
          );

        expect(signal.type).toBe(
          "network"
        );
      }
    );

    it(
      "extracts selector and locator failures",
      () => {
        const signal =
          extractFailureSignal(
            new Error(
              "Locator could not resolve selector"
            )
          );

        expect(signal.type).toBe(
          "selector"
        );
      }
    );

    it(
      "extracts timeout failures without assuming their verdict",
      () => {
        const signal =
          extractFailureSignal(
            new Error(
              "Timeout 30000ms exceeded."
            )
          );

        expect(signal.type).toBe(
          "timeout"
        );
      }
    );

    it(
      "extracts assertion failures",
      () => {
        const signal =
          extractFailureSignal(
            new Error(
              "AssertionError: expected 10 to equal 20"
            )
          );

        expect(signal.type).toBe(
          "assertion"
        );
      }
    );

    it(
      "falls back to unknown",
      () => {
        const signal =
          extractFailureSignal(
            new Error(
              "Something unexpected happened."
            )
          );

        expect(signal.type).toBe(
          "unknown"
        );
      }
    );

    it(
      "normalizes non Error values",
      () => {
        const signal =
          extractFailureSignal(
            "Unexpected raw failure"
          );

        expect(signal).toEqual({
          type: "unknown",
          message:
            "Unexpected raw failure"
        });
      }
    );
  }
);
