import { z } from "zod";

const PlannerModelConfigSchema = z.object({
  type: z
    .enum(["openai-compatible"]),

  baseUrl: z
    .string()
    .url(),

  model: z
    .string()
    .trim()
    .min(1),

  apiKeyEnv: z
    .string()
    .trim()
    .min(1)
    .optional()
});

export const DragonConfigSchema = z.object({
  project: z.object({
    name: z.string().min(1),
    baseUrl: z.string().url()
  }),

  autonomy: z.object({
    level: z
      .enum([
        "observe",
        "assist",
        "execute",
        "autonomous"
      ])
      .default("assist")
  }),

  testing: z.object({
    ui: z.boolean().default(true),
    api: z.boolean().default(false),
    accessibility:
      z.boolean().default(false),
    visual:
      z.boolean().default(false)
  }),

  browser: z.object({
    engine: z
      .enum([
        "chromium",
        "firefox",
        "webkit"
      ])
      .default("chromium"),

    headless:
      z.boolean().default(true),

    timeoutMs:
      z.number()
        .positive()
        .default(30000)
  }),

  evidence: z.object({
    screenshots:
      z.boolean().default(true),

    trace:
      z.boolean().default(true),

    video:
      z.boolean().default(false)
  }),

  reporting: z.object({
    markdown:
      z.boolean().default(true),

    json:
      z.boolean().default(true)
  }),

  providers: z.object({
    planner:
      z.string()
        .default("deterministic"),

    failureAnalyzer:
      z.string()
        .default("deterministic"),

    plannerModel:
      PlannerModelConfigSchema.optional()
  })
});

export type DragonConfig =
  z.infer<typeof DragonConfigSchema>;
