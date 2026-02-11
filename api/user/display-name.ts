import { eq } from "drizzle-orm";
import { db } from "../_lib/db/index.js";
import { user } from "../_lib/db/schema/index.js";
import { requireSessionUser } from "../_lib/session.js";
import type { RequestLike, ResponseLike } from "../_lib/http.js";
import { isRecord } from "../_lib/http.js";

const parseBody = (req: RequestLike): unknown => {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return null;
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  let sessionUser;
  try {
    sessionUser = await requireSessionUser(req);
  } catch {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const body = parseBody(req);
  if (!isRecord(body)) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  const displayName = String(body.displayName ?? "").trim();
  if (displayName.length < 2 || displayName.length > 20) {
    res.status(400).json({ error: "invalid_display_name" });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      const rows = await tx
        .select({ name: user.name, inventory: user.inventory })
        .from(user)
        .where(eq(user.id, sessionUser.id))
        .limit(1);

      const u = rows[0];
      if (!u) throw new Error("user_not_found");

      const inventoryRaw = u.inventory && typeof u.inventory === "object" ? (u.inventory as Record<string, unknown>) : {};
      const renameCount = Number(inventoryRaw.rename_card) || 0;
      if (renameCount <= 0) {
        const err = new Error("no_rename_card") as Error & { code?: string };
        err.code = "no_rename_card";
        throw err;
      }

      const nextInventory = { ...Object.fromEntries(Object.entries(inventoryRaw).map(([k, v]) => [k, Number(v) || 0])) };
      nextInventory.rename_card = Math.max(0, renameCount - 1);

      await tx
        .update(user)
        .set({
          name: displayName,
          inventory: nextInventory,
          updatedAt: new Date(),
        })
        .where(eq(user.id, sessionUser.id));

      return { displayName, inventory: nextInventory };
    });

    res.status(200).json(result);
  } catch (e: unknown) {
    const err = e as { code?: unknown; message?: unknown };
    const code = String(err?.code ?? err?.message ?? "unknown");
    if (code === "no_rename_card") {
      res.status(400).json({ error: "no_rename_card" });
      return;
    }
    if (code === "user_not_found") {
      res.status(404).json({ error: "user_not_found" });
      return;
    }
    res.status(500).json({ error: "server_error" });
  }
}

