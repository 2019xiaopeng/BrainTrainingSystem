import { and, eq, gt } from "drizzle-orm";
import { db } from "./db/index.js";
import { session, user } from "./db/schema/index.js";
import type { RequestLike } from "./http.js";

type SessionUser = {
  id: string;
  xp: number;
  brainLevel: number;
  energyCurrent: number;
  energyLastUpdated: Date | null;
  unlimitedEnergyUntil: Date | null;
};

const parseCookies = (cookieHeader: string): Map<string, string> => {
  const cookieMap = new Map<string, string>();
  const parts = cookieHeader.split("; ");
  for (const part of parts) {
    const [name, value] = part.split(/=(.*)/s);
    if (name) cookieMap.set(name, value ?? "");
  }
  return cookieMap;
};

export const getSessionTokenFromRequest = (req: RequestLike): string | null => {
  const cookieHeader =
    (typeof req.headers?.get === "function" ? req.headers.get("cookie") : null) ??
    (typeof req.headers?.cookie === "string" ? req.headers.cookie : null) ??
    (typeof req.headers?.Cookie === "string" ? req.headers.Cookie : null) ??
    null;
  if (!cookieHeader || typeof cookieHeader !== "string") return null;

  const cookieName = "better-auth.session_token";
  const secureCookieName = `__Secure-${cookieName}`;
  const parsed = parseCookies(cookieHeader);
  return parsed.get(cookieName) ?? parsed.get(secureCookieName) ?? null;
};

export const requireSessionUser = async (req: RequestLike): Promise<SessionUser> => {
  const token = getSessionTokenFromRequest(req);
  if (!token) throw new Error("unauthorized");

  const now = new Date();
  const rows = await db
    .select({
      userId: session.userId,
      xp: user.xp,
      brainLevel: user.brainLevel,
      energyCurrent: user.energyCurrent,
      energyLastUpdated: user.energyLastUpdated,
      unlimitedEnergyUntil: user.unlimitedEnergyUntil,
    })
    .from(session)
    .innerJoin(user, eq(user.id, session.userId))
    .where(and(eq(session.token, token), gt(session.expiresAt, now)))
    .limit(1);

  const row = rows[0];
  if (!row) throw new Error("unauthorized");

  return {
    id: row.userId,
    xp: row.xp ?? 0,
    brainLevel: row.brainLevel ?? 1,
    energyCurrent: row.energyCurrent ?? 5,
    energyLastUpdated: row.energyLastUpdated ?? null,
    unlimitedEnergyUntil: row.unlimitedEnergyUntil ?? null,
  };
};
