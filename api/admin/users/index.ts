import { desc, ilike, or } from "drizzle-orm";
import { db } from "../../_lib/db/index.js";
import { user } from "../../_lib/db/schema/index.js";
import { requireAdmin } from "../../_lib/admin.js";
import type { RequestLike, ResponseLike } from "../../_lib/http.js";

const getUrl = (req: RequestLike): string => {
  const raw = (req as unknown as { url?: unknown }).url;
  return typeof raw === "string" ? raw : "http://localhost/api/admin/users";
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  try {
    await requireAdmin(req);
  } catch (e) {
    const code = (e as Error).message === "forbidden" ? 403 : 401;
    res.status(code).json({ error: code === 403 ? "forbidden" : "unauthorized" });
    return;
  }

  const url = new URL(getUrl(req), "http://localhost");
  const query = (url.searchParams.get("query") ?? "").trim();
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") ?? 20) || 20));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);

  const where =
    query.length > 0
      ? or(
          ilike(user.email, `%${query}%`),
          ilike(user.name, `%${query}%`),
          ilike(user.id, `%${query}%`),
          ilike(user.username, `%${query}%`)
        )
      : undefined;

  const rows = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      xp: user.xp,
      brainCoins: user.brainCoins,
      brainLevel: user.brainLevel,
      bannedUntil: user.bannedUntil,
      bannedReason: user.bannedReason,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(where as any)
    .orderBy(desc(user.updatedAt), desc(user.createdAt))
    .limit(limit)
    .offset(offset);

  res.status(200).json({
    items: rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
      xp: r.xp ?? 0,
      brainCoins: r.brainCoins ?? 0,
      brainLevel: r.brainLevel ?? 1,
      bannedUntil: r.bannedUntil ? r.bannedUntil.toISOString() : null,
      bannedReason: r.bannedReason ?? null,
      createdAt: r.createdAt ? r.createdAt.toISOString() : null,
      updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
    })),
    limit,
    offset,
    nextOffset: rows.length === limit ? offset + limit : null,
  });
}
