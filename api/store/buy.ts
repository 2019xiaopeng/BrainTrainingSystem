import { eq } from "drizzle-orm";
import { db } from "../../server/_lib/db/index.js";
import { products, user } from "../../server/_lib/db/schema/index.js";
import { getBanStatus } from "../../server/_lib/admin.js";
import { requireSessionUser } from "../../server/_lib/session.js";
import type { RequestLike, ResponseLike } from "../../server/_lib/http.js";
import { isRecord } from "../../server/_lib/http.js";

const ENERGY_MAX = 5;

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

  const ban = await getBanStatus(sessionUser.id);
  if (ban.banned) {
    res.status(403).json({ error: "banned" });
    return;
  }

  const body = parseBody(req);
  if (!isRecord(body)) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  const productId = String(body.productId ?? "");
  const productRow = await db
    .select({
      id: products.id,
      type: products.type,
      priceCoins: products.priceCoins,
      rewards: products.rewards,
      isActive: products.isActive,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  const product = productRow[0];
  if (!product || (product.isActive ?? 1) !== 1) {
    res.status(400).json({ error: "invalid_product" });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      const rows = await tx
        .select({
          brainCoins: user.brainCoins,
          energyCurrent: user.energyCurrent,
          ownedItems: user.ownedItems,
          inventory: user.inventory,
        })
        .from(user)
        .where(eq(user.id, sessionUser.id))
        .limit(1);

      const u = rows[0];
      if (!u) throw new Error("user_not_found");

      const brainCoinsBefore = u.brainCoins ?? 0;
      if (brainCoinsBefore < (product.priceCoins ?? 0)) {
        const err = new Error("insufficient_coins") as Error & { code?: string };
        err.code = "insufficient_coins";
        throw err;
      }

      const ownedItems: string[] = Array.isArray(u.ownedItems) ? (u.ownedItems as unknown as string[]) : [];
      const inventoryRaw = u.inventory && typeof u.inventory === "object" ? (u.inventory as Record<string, unknown>) : {};
      const inventory: Record<string, number> = Object.fromEntries(
        Object.entries(inventoryRaw).map(([k, v]) => [k, Number(v) || 0])
      );

      const rewards = (product.rewards && typeof product.rewards === "object" ? (product.rewards as Record<string, unknown>) : {}) as Record<
        string,
        unknown
      >;

      const ownedItemId = typeof rewards.ownedItem === "string" ? rewards.ownedItem : null;
      if (product.type === "permanent" && ownedItemId && ownedItems.includes(ownedItemId)) {
        const err = new Error("already_owned") as Error & { code?: string };
        err.code = "already_owned";
        throw err;
      }

      const brainCoinsAfter = brainCoinsBefore - (product.priceCoins ?? 0);
      let energyAfter = u.energyCurrent ?? ENERGY_MAX;
      let nextOwnedItems = ownedItems;
      let nextInventory = inventory;

      if (typeof rewards.energy === "number") {
        energyAfter = Math.min(ENERGY_MAX, energyAfter + Math.max(0, Math.trunc(rewards.energy)));
      }

      if (product.type === "permanent" && ownedItemId) {
        nextOwnedItems = [...ownedItems, ownedItemId];
      }

      const inv = rewards.inventory && typeof rewards.inventory === "object" ? (rewards.inventory as Record<string, unknown>) : null;
      if (inv) {
        const next: Record<string, number> = { ...inventory };
        for (const [k, v] of Object.entries(inv)) {
          const amt = Number(v) || 0;
          if (!Number.isFinite(amt) || amt <= 0) continue;
          next[k] = (next[k] ?? 0) + Math.trunc(amt);
        }
        nextInventory = next;
      }

      await tx
        .update(user)
        .set({
          brainCoins: brainCoinsAfter,
          energyCurrent: energyAfter,
          ownedItems: nextOwnedItems,
          inventory: nextInventory,
          updatedAt: new Date(),
        })
        .where(eq(user.id, sessionUser.id));

      return {
        brainCoins: brainCoinsAfter,
        energy: { current: energyAfter, max: ENERGY_MAX },
        ownedItems: nextOwnedItems,
        inventory: nextInventory,
      };
    });

    res.status(200).json(result);
  } catch (e: unknown) {
    const err = e as { code?: unknown; message?: unknown };
    const code = String(err?.code ?? err?.message ?? "unknown");
    if (code === "insufficient_coins") {
      res.status(400).json({ error: "insufficient_coins" });
      return;
    }
    if (code === "already_owned") {
      res.status(400).json({ error: "already_owned" });
      return;
    }
    if (code === "user_not_found") {
      res.status(404).json({ error: "user_not_found" });
      return;
    }
    if (code === "invalid_product") {
      res.status(400).json({ error: "invalid_product" });
      return;
    }
    res.status(500).json({ error: "server_error" });
  }
}

