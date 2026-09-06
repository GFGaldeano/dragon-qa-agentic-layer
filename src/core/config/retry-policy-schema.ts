import { z } from "zod";

export const RetryableFailureTypeSchema =
  z.enum([
    "network",
    "timeout"
  ]);

export const RetryPolicyConfigSchema =
  z.object({
    enabled:
      z.boolean()
        .default(false),

    maxRetries:
      z.number()
        .int()
        .min(0)
        .max(3)
        .default(1),

    retryableFailureTypes:
      z.array(
        RetryableFailureTypeSchema
      )
        .default([
          "network",
          "timeout"
        ])
  }).strict();

export type RetryPolicyConfig =
  z.infer<
    typeof RetryPolicyConfigSchema
  >;

export type RetryableFailureType =
  z.infer<
    typeof RetryableFailureTypeSchema
  >;
