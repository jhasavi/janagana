import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";

test("env checker runs without exposing secret values", async () => {
  let output = "";
  try {
    output = execSync("npm run check:env", {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error: any) {
    output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
  }

  expect(output).toContain("Environment contract check");
  expect(output).not.toMatch(/sk_(test|live)_[A-Za-z0-9]+/);
  expect(output).not.toMatch(/pk_(test|live)_[A-Za-z0-9]+/);
  expect(output).not.toMatch(/postgres(ql)?:\/\//);
});
