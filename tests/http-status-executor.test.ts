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
  HttpStatusExecutor
} from "../src/runners/executors/http-status-executor";

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
  statusCode: number
): Promise<{
  server: http.Server;
  url: string;
}> {
  const server = http.createServer(
    (_request, response) => {
      response.statusCode = statusCode;
      response.setHeader(
        "content-type",
        "text/html"
      );
      response.end(
        "<html><body>Dragon QA</body></html>"
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
  expectedStatus: number
): TestScenario {
  return {
    id: "S001",
    title: "HTTP status",
    description:
      "Verify the application HTTP status.",
    kind: "smoke",
    executionMode: "automated",
    executionIntent: {
      type: "http-status",
      expectedStatus
    },
    priority: "critical",
    expectedResult:
      `The application returns HTTP ${expectedStatus}.`
  };
}

describe(
  "HttpStatusExecutor",
  () => {
    it(
      "passes when the actual HTTP status matches the expected status",
      async () => {
        const { url } =
          await createServer(200);

        const executor =
          new HttpStatusExecutor(
            config,
            new EvidenceManager(),
            new FailureAnalyzer()
          );

        expect(
          executor.intentType
        ).toBe("http-status");

        const result =
          await executor.execute(
            createScenario(200),
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
          "HTTP 200"
        );
      }
    );

    it(
      "requires review when the actual HTTP status does not match the expected status",
      async () => {
        const { url } =
          await createServer(503);

        const executor =
          new HttpStatusExecutor(
            config,
            new EvidenceManager(),
            new FailureAnalyzer()
          );

        const result =
          await executor.execute(
            createScenario(200),
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
          "Expected HTTP 200"
        );

        expect(result.message).toContain(
          "received HTTP 503"
        );
      }
    );

    it(
      "classifies connection failures as environment issues",
      async () => {
        const { server, url } =
          await createServer(200);

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
          new HttpStatusExecutor(
            config,
            new EvidenceManager(),
            new FailureAnalyzer()
          );

        const result =
          await executor.execute(
            createScenario(200),
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
