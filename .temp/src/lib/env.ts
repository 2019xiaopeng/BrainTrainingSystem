import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export function loadRootEnvForLocalDev() {
  if (process.env.BETTER_AUTH_SECRET && process.env.DATABASE_URL) return;

  const rootEnvPath = path.resolve(process.cwd(), "..", ".env");
  if (!fs.existsSync(rootEnvPath)) return;

  dotenv.config({ path: rootEnvPath });
}

