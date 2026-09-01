import {
  PlannerModelOutput,
  PlannerModelOutputSchema
} from "./planner-model-output-schema";

export function parsePlannerModelOutput(
  raw: string
): PlannerModelOutput {
  const normalized = raw.trim();

  if (!normalized) {
    throw new Error(
      "Planner model returned an empty response"
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new Error(
      "Planner model returned invalid JSON"
    );
  }

  return PlannerModelOutputSchema.parse(parsed);
}
