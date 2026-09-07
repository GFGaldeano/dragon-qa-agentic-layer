import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Package entrypoints", () => {
  it("declares the public JavaScript, TypeScript and CLI entries", () => {
    const manifest = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, "../package.json"),
        "utf8"
      )
    ) as {
      main?: string;
      types?: string;
      bin?: Record<string, string>;
    };

    expect(manifest.main).toBe("dist/index.js");
    expect(manifest.types).toBe("dist/index.d.ts");
    expect(manifest.bin?.["dragon-qa"]).toBe(
      "dist/cli/index.js"
    );
  });
});
