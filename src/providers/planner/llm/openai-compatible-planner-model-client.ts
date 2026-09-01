import { z } from "zod";

import {
  PlannerModelClient
} from "./planner-model-client";

const OpenAICompatibleResponseSchema =
  z.object({
    choices: z.array(
      z.object({
        message: z.object({
          content: z.string().trim().min(1)
        })
      })
    ).min(1)
  });

export interface OpenAICompatiblePlannerModelClientOptions {
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export class OpenAICompatiblePlannerModelClient
  implements PlannerModelClient {
  readonly name = "openai-compatible";

  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey?: string;

  constructor(
    options: OpenAICompatiblePlannerModelClientOptions,
    private readonly fetchImpl: typeof fetch = fetch
  ) {
    const baseUrl = options.baseUrl.trim();
    const model = options.model.trim();
    const apiKey = options.apiKey?.trim();

    if (!baseUrl) {
      throw new Error(
        "OpenAI-compatible planner model base URL is required"
      );
    }

    if (!model) {
      throw new Error(
        "OpenAI-compatible planner model name is required"
      );
    }

    this.baseUrl =
      baseUrl.replace(/\/+$/, "");

    this.model = model;
    this.apiKey =
      apiKey || undefined;
  }

  async generate(
    prompt: string
  ): Promise<string> {
    const normalizedPrompt =
      prompt.trim();

    if (!normalizedPrompt) {
      throw new Error(
        "Planner model prompt cannot be empty"
      );
    }

    const headers: Record<string, string> = {
      "content-type": "application/json"
    };

    if (this.apiKey) {
      headers.authorization =
        `Bearer ${this.apiKey}`;
    }

    const response =
      await this.fetchImpl(
        `${this.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: this.model,
            messages: [
              {
                role: "user",
                content: normalizedPrompt
              }
            ]
          })
        }
      );

    if (!response.ok) {
      const responseBody =
        await response.text();

      const detail =
        responseBody
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 500);

      throw new Error(
        [
          "OpenAI-compatible planner model request failed",
          `HTTP ${response.status}`,
          detail
        ]
          .filter(Boolean)
          .join(": ")
      );
    }

    const payload: unknown =
      await response.json();

    const parsed =
      OpenAICompatibleResponseSchema.parse(
        payload
      );

    return parsed.choices[0].message.content;
  }
}
