import { toNodeHandler } from "better-auth/node";
import { auth } from "./_lib/auth.js";
import { ensureSchemaReady } from "./_lib/db/index.js";

const handler = toNodeHandler(auth);

export default async function authHandler(req: any, res: any) {
  try {
    await ensureSchemaReady();
  } catch {
    res.status(500).json({ error: "db_migration_required" });
    return;
  }

  return handler(req, res);
}
