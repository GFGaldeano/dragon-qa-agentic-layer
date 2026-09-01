import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  OpenAICompatiblePlannerModelClient
} from "../src/providers/planner/llm/openai-compatible-planner-model-client";

describe(
  "OpenAICompatiblePlannerModelClient",
  () => {
    it("sends a chat completion request and returns model content", async () => {
      const fetchMock =
        vi.fn(async () =>
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content:
                      '{"scenarios":[]}'
                  }
                }
              ]
            }),
            {
              status: 200,
              headers: {
                "content-type":
                  "application/json"
              }
            }
          )
        );

      const client =
        new OpenAICompatiblePlannerModelClient(
          {
            baseUrl:
              "https://example.test/v1/",
            model: "test-model",
            apiKey: "secret-key"
          },
          fetchMock as typeof fetch
        );

      const result =
        await client.generate(
          "Generate a QA plan"
        );

      expect(client.name).toBe(
        "openai-compatible"
      );

      expect(result).toBe(
        '{"scenarios":[]}'
      );

      expect(fetchMock).toHaveBeenCalledTimes(
        1
      );

      const [
        url,
        init
      ] = fetchMock.mock.calls[0];

      expect(url).toBe(
        "https://example.test/v1/chat/completions"
      );

      expect(init).toMatchObject({
        method: "POST",
        headers: {
          "content-type":
            "application/json",
          authorization:
            "Bearer secret-key"
        }
      });

      const body =
        JSON.parse(
          String(init?.body)
        );

      expect(body).toEqual({
        model: "test-model",
        messages: [
          {
            role: "user",
            content:
              "Generate a QA plan"
          }
        ]
      });
    });

    it("does not send authorization when no api key is configured", async () => {
      const fetchMock =
        vi.fn(async () =>
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content:
                      '{"scenarios":[]}'
                  }
                }
              ]
            }),
            {
              status: 200
            }
          )
        );

      const client =
        new OpenAICompatiblePlannerModelClient(
          {
            baseUrl:
              "http://localhost:11434/v1",
            model: "local-model"
          },
          fetchMock as typeof fetch
        );

      await client.generate(
        "Generate a QA plan"
      );

      const [, init] =
        fetchMock.mock.calls[0];

      expect(init?.headers).toEqual({
        "content-type":
          "application/json"
      });
    });

    it("fails closed on non-successful HTTP responses", async () => {
      const fetchMock =
        vi.fn(async () =>
          new Response(
            JSON.stringify({
              error: "provider failure"
            }),
            {
              status: 500
            }
          )
        );

      const client =
        new OpenAICompatiblePlannerModelClient(
          {
            baseUrl:
              "https://example.test/v1",
            model: "test-model"
          },
          fetchMock as typeof fetch
        );

      await expect(
        client.generate(
          "Generate a QA plan"
        )
      ).rejects.toThrow(
        "OpenAI-compatible planner model request failed: HTTP 500"
      );
    });

    it("fails closed when the provider response has no usable content", async () => {
      const fetchMock =
        vi.fn(async () =>
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: ""
                  }
                }
              ]
            }),
            {
              status: 200
            }
          )
        );

      const client =
        new OpenAICompatiblePlannerModelClient(
          {
            baseUrl:
              "https://example.test/v1",
            model: "test-model"
          },
          fetchMock as typeof fetch
        );

      await expect(
        client.generate(
          "Generate a QA plan"
        )
      ).rejects.toThrow();
    });
  }
);
