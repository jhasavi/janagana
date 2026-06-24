import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

for (const file of [".env", ".env.local"]) {
  const path = resolve(process.cwd(), file);
  if (existsSync(path)) {
    dotenv.config({ path, override: file === ".env.local" });
  }
}

const result = spawnSync("prisma", ["validate"], {
  shell: true,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
