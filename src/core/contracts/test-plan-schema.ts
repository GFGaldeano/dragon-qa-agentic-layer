import { z } from "zod";

export const RequirementInputSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  text: z.string().trim().min(1),
  source: z.enum(["cli", "jira", "file", "api"]).optional()
});

export const TestScenarioSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  kind: z.enum([
    "smoke",
    "happy-path",
    "negative",
    "edge-case",
    "accessibility",
    "visual",
    "api"
  ]),
  executionMode: z.enum(["automated", "manual-review"]),
  priority: z.enum(["critical", "high", "medium", "low"]),
  expectedResult: z.string().min(1)
});

export const TestPlanSchema = z.object({
  id: z.string().min(1),
  requirement: RequirementInputSchema,
  createdAt: z.string().datetime(),
  scenarios: z.array(TestScenarioSchema).min(1)
});
