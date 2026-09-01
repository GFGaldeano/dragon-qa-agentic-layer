import { z } from "zod";

export const PlannerModelScenarioSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  kind: z.enum([
    "smoke",
    "happy-path",
    "negative",
    "edge-case",
    "accessibility",
    "visual",
    "api"
  ]),
  priority: z.enum([
    "critical",
    "high",
    "medium",
    "low"
  ]),
  expectedResult: z.string().trim().min(1)
}).strict();

export const PlannerModelOutputSchema = z.object({
  scenarios: z.array(
    PlannerModelScenarioSchema
  ).min(1).max(50)
}).strict();

export type PlannerModelOutput =
  z.infer<typeof PlannerModelOutputSchema>;
