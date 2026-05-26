import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";

test("env checker runs without exposing secret values", async () => {
  const result = spawnSync("npm", ["run", "check:env"], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 30000,
  });

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

  expect(result.status).toBe(0);
  expect(output).toContain("Environment contract check");
  expect(output).not.toMatch(/sk_(test|live)_[A-Za-z0-9]+/);
  expect(output).not.toMatch(/pk_(test|live)_[A-Za-z0-9]+/);
  expect(output).not.toMatch(/postgres(ql)?:\/\//);
});
