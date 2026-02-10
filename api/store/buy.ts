import { eq } from "drizzle-orm";
import { db } from "../_lib/db/index.js";
import { user } from "../_lib/db/schema/index.js";
import { requireSessionUser } from "../_lib/session.js";
import type { RequestLike, ResponseLike } from "../_lib/http.js";
import { isRecord } from "../_lib/http.js";

const ENERGY_MAX = 5;

type Product =
  | { id: "energy_1"; price: number; kind: "energy"; amount: number }
  | { id: "energy_5"; price: number; kind: "energy"; amount: number }
  | { id: "streak_saver"; price: number; kind: "inventory"; inventoryKey: string; amount: number }
  | { id: "premium_report"; price: number; kind: "permanent"; ownedItemId: string };

const PRODUCTS: Record<string, Product> = {
  energy_1: { id: "energy_1", price: 100, kind: "energy", amount: 1 },
  energy_5: { id: "energy_5", price: 450, kind: "energy", amount: 5 },
  streak_saver: { id: "streak_saver", price: 500, kind: "inventory", inventoryKey: "streak_saver", amount: 1 },
  premium_report: { id: "premium_report", price: 1000, kind: "permanent", ownedItemId: "premium_report" },
};

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

  const productId = String(body.productId ?? "");
  const product = PRODUCTS[productId];
  if (!product) {
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
      if (brainCoinsBefore < product.price) {
        const err = new Error("insufficient_coins") as Error & { code?: string };
        err.code = "insufficient_coins";
        throw err;
      }

      const ownedItems: string[] = Array.isArray(u.ownedItems) ? (u.ownedItems as unknown as string[]) : [];
      const inventoryRaw = u.inventory && typeof u.inventory === "object" ? (u.inventory as Record<string, unknown>) : {};
      const inventory: Record<string, number> = Object.fromEntries(
        Object.entries(inventoryRaw).map(([k, v]) => [k, Number(v) || 0])
      );

      if (product.kind === "permanent" && ownedItems.includes(product.ownedItemId)) {
        const err = new Error("already_owned") as Error & { code?: string };
        err.code = "already_owned";
        throw err;
      }

      const brainCoinsAfter = brainCoinsBefore - product.price;
      let energyAfter = u.energyCurrent ?? ENERGY_MAX;
      let nextOwnedItems = ownedItems;
      let nextInventory = inventory;

      if (product.kind === "energy") {
        energyAfter = Math.min(ENERGY_MAX, energyAfter + product.amount);
      }

      if (product.kind === "permanent") {
        nextOwnedItems = [...ownedItems, product.ownedItemId];
      }

      if (product.kind === "inventory") {
        nextInventory = { ...inventory, [product.inventoryKey]: (inventory[product.inventoryKey] ?? 0) + product.amount };
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

