import {
  RequirementInput
} from "../../core/contracts/types";

export class RequirementsAgent {
  analyze(input: string): RequirementInput {
    const normalized = input.trim();

    if (!normalized) {
      throw new Error("Requirement cannot be empty.");
    }

    return {
      text: normalized,
      source: "cli"
    };
  }
}