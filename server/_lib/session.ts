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

type SubtleLike = {
  importKey: (
    format: "raw",
    keyData: Uint8Array,
    algorithm: { name: "HMAC"; hash: "SHA-256" },
    extractable: false,
    keyUsages: Array<"verify">
  ) => Promise<unknown>;
  verify: (
    algorithm: { name: "HMAC" },
    key: unknown,
    signature: Uint8Array,
    data: Uint8Array
  ) => Promise<boolean>;
};

const getSubtle = (): SubtleLike => {
  const subtle = (globalThis as unknown as { crypto?: { subtle?: unknown } }).crypto?.subtle;
  if (!subtle) throw new Error("missing_webcrypto");
  return subtle as SubtleLike;
};

const getCryptoKey = async (secret: string | ArrayBuffer | Uint8Array) => {
  const secretBuf =
    typeof secret === "string"
      ? new TextEncoder().encode(secret)
      : secret instanceof Uint8Array
        ? secret
        : new Uint8Array(secret);
  return await getSubtle().importKey("raw", secretBuf, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
};

const verifySignature = async (base64Signature: string, value: string, secret: string) => {
  try {
    const signatureBinStr = atob(base64Signature);
    const signature = new Uint8Array(signatureBinStr.length);
    for (let i = 0, len = signatureBinStr.length; i < len; i++) signature[i] = signatureBinStr.charCodeAt(i);
    const key = await getCryptoKey(secret);
    return await getSubtle().verify({ name: "HMAC" }, key, signature, new TextEncoder().encode(value));
  } catch {
    return false;
  }
};

const parseCookies = (cookieHeader: string): Map<string, string> => {
  const cookieMap = new Map<string, string>();
  const parts = cookieHeader.split(/;\s*/g);
  for (const part of parts) {
    const [name, value] = part.split(/=(.*)/s);
    if (name) {
      const raw = value ?? "";
      try {
        cookieMap.set(name, decodeURIComponent(raw));
      } catch {
        cookieMap.set(name, raw);
      }
    }
  }
  return cookieMap;
};

const getSignedCookieFromRequest = (req: RequestLike, name: string): string | null => {
  const cookieHeader =
    (typeof req.headers?.get === "function" ? req.headers.get("cookie") : null) ??
    (typeof req.headers?.cookie === "string" ? req.headers.cookie : null) ??
    (typeof req.headers?.Cookie === "string" ? req.headers.Cookie : null) ??
    null;
  if (!cookieHeader || typeof cookieHeader !== "string") return null;

  const secureCookieName = `__Secure-${name}`;
  const parsed = parseCookies(cookieHeader);
  return parsed.get(name) ?? parsed.get(secureCookieName) ?? null;
};

const getVerifiedSessionTokenFromRequest = async (req: RequestLike): Promise<string | null> => {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return null;

  const cookieName = "better-auth.session_token";
  const raw = getSignedCookieFromRequest(req, cookieName);
  if (!raw) return null;

  const signatureStartPos = raw.lastIndexOf(".");
  if (signatureStartPos < 1) return null;
  const signedValue = raw.substring(0, signatureStartPos);
  const signature = raw.substring(signatureStartPos + 1);
  if (signature.length !== 44 || !signature.endsWith("=")) return null;
  const ok = await verifySignature(signature, signedValue, secret);
  return ok ? signedValue : null;
};

export const requireSessionUser = async (req: RequestLike): Promise<SessionUser> => {
  const token = await getVerifiedSessionTokenFromRequest(req);
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
