import http from "node:http";

import {
  AddressInfo
} from "node:net";

import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";

import {
  DragonConfig
} from "../src/core/config/schema";

import {
  TestScenario
} from "../src/core/contracts/types";

import {
  FailureAnalyzer
} from "../src/agents/failure-analyzer/failure-analyzer";

import {
  EvidenceManager
} from "../src/evidence/evidence-manager";

import {
  PageTextExecutor
} from "../src/runners/executors/page-text-executor";

const config: DragonConfig = {
  project: {
    name: "test-project",
    baseUrl: "http://127.0.0.1"
  },
  autonomy: {
    level: "assist"
  },
  testing: {
    ui: true,
    api: false,
    accessibility: false,
    visual: false
  },
  browser: {
    engine: "chromium",
    headless: true,
    timeoutMs: 3000
  },
  evidence: {
    screenshots: false,
    trace: false,
    video: false
  },
  reporting: {
    markdown: false,
    json: false
  },
  providers: {
    planner: "deterministic",
    failureAnalyzer: "deterministic"
  }
};

const servers: http.Server[] = [];

async function createServer(
  bodyText: string
): Promise<{
  server: http.Server;
  url: string;
}> {
  const server = http.createServer(
    (_request, response) => {
      response.statusCode = 200;

      response.setHeader(
        "content-type",
        "text/html"
      );

      response.end(
        `<html><body>${bodyText}</body></html>`
      );
    }
  );

  await new Promise<void>(
    (resolve, reject) => {
      server.once("error", reject);

      server.listen(
        0,
        "127.0.0.1",
        () => resolve()
      );
    }
  );

  servers.push(server);

  const address =
    server.address() as AddressInfo;

  return {
    server,
    url:
      `http://127.0.0.1:${address.port}`
  };
}

afterEach(async () => {
  const pending =
    servers.splice(0);

  await Promise.all(
    pending.map(
      (server) =>
        new Promise<void>(
          (resolve) => {
            server.close(
              () => resolve()
            );
          }
        )
    )
  );
});

function createScenario(
  expectedText: string
): TestScenario {
  return {
    id: "S001",
    title: "Page text",
    description:
      "Verify the application page text.",
    kind: "smoke",
    executionMode: "automated",
    executionIntent: {
      type: "page-text",
      expectedText
    },
    priority: "high",
    expectedResult:
      `The application page contains ${expectedText}.`
  };
}

describe(
  "PageTextExecutor",
  () => {
    it(
      "passes when the page contains the expected text",
      async () => {
        const { url } =
          await createServer(
            "Welcome to Dragon QA Agentic Layer"
          );

        const executor =
          new PageTextExecutor(
            config,
            new EvidenceManager(),
            new FailureAnalyzer()
          );

        expect(
          executor.intentType
        ).toBe("page-text");

        const result =
          await executor.execute(
            createScenario("Dragon QA"),
            {
              runDirectory:
                ".dragon-qa/test-runs",
              baseUrl: url
            }
          );

        expect(result.status).toBe(
          "passed"
        );

        expect(result.verdict).toBe(
          "PASS"
        );

        expect(result.message).toContain(
          "Dragon QA"
        );
      }
    );

    it(
      "requires review when the page does not contain the expected text",
      async () => {
        const { url } =
          await createServer(
            "Welcome to another application"
          );

        const executor =
          new PageTextExecutor(
            config,
            new EvidenceManager(),
            new FailureAnalyzer()
          );

        const result =
          await executor.execute(
            createScenario("Dragon QA"),
            {
              runDirectory:
                ".dragon-qa/test-runs",
              baseUrl: url
            }
          );

        expect(result.status).toBe(
          "failed"
        );

        expect(result.verdict).toBe(
          "REVIEW"
        );

        expect(result.message).toContain(
          'Expected page text to contain "Dragon QA"'
        );
      }
    );

    it(
      "classifies connection failures as environment issues",
      async () => {
        const { server, url } =
          await createServer(
            "Dragon QA"
          );

        await new Promise<void>(
          (resolve) => {
            server.close(
              () => resolve()
            );
          }
        );

        const index =
          servers.indexOf(server);

        if (index >= 0) {
          servers.splice(index, 1);
        }

        const executor =
          new PageTextExecutor(
            config,
            new EvidenceManager(),
            new FailureAnalyzer()
          );

        const result =
          await executor.execute(
            createScenario("Dragon QA"),
            {
              runDirectory:
                ".dragon-qa/test-runs",
              baseUrl: url
            }
          );

        expect(result.status).toBe(
          "failed"
        );

        expect(result.verdict).toBe(
          "ENVIRONMENT"
        );

        expect(
          result.message.length
        ).toBeGreaterThan(0);
      }
    );
  }
);
