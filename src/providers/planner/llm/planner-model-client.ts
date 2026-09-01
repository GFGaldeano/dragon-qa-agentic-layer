export interface PlannerModelClient {
  readonly name: string;

  generate(
    prompt: string
  ): Promise<string>;
}
