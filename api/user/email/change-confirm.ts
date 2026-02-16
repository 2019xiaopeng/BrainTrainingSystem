import { and, eq } from "drizzle-orm";
import { db } from "../../_lib/db/index.js";
import { user, verification } from "../../_lib/db/schema/index.js";
import { requireSessionUser } from "../../_lib/session.js";
import type { RequestLike, ResponseLike } from "../../_lib/http.js";
import { isRecord } from "../../_lib/http.js";

const normalizeEmail = (raw: unknown) => String(raw ?? "").trim().toLowerCase();

const isValidEmail = (email: string) => {
  if (!email || email.length > 254) return false;
  if (!email.includes("@")) return false;
  const [local, domain] = email.split("@");
  if (!local || !domain) return false;
  if (!domain.includes(".")) return false;
  return true;
};

const normalizeOtp = (raw: unknown) => String(raw ?? "").trim();

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

  const body = isRecord(req.body) ? req.body : {};
  const nextEmail = normalizeEmail(body.email);
  const otp = normalizeOtp(body.otp);

  if (!isValidEmail(nextEmail)) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }
  if (!/^\d{6}$/.test(otp)) {
    res.status(400).json({ error: "invalid_otp" });
    return;
  }

  const existsRows = await db.select({ id: user.id }).from(user).where(eq(user.email, nextEmail)).limit(1);
  if (existsRows[0]?.id) {
    res.status(409).json({ error: "email_in_use" });
    return;
  }

  const id = `email_change:${sessionUser.id}:${nextEmail}`;
  const verRows = await db
    .select({ value: verification.value, expiresAt: verification.expiresAt })
    .from(verification)
    .where(and(eq(verification.id, id), eq(verification.identifier, id)))
    .limit(1);

  const row = verRows[0];
  if (!row) {
    res.status(400).json({ error: "invalid_otp" });
    return;
  }

  if (row.expiresAt.getTime() < Date.now()) {
    res.status(400).json({ error: "expired_otp" });
    return;
  }

  if (String(row.value) !== otp) {
    res.status(400).json({ error: "invalid_otp" });
    return;
  }

  await db
    .update(user)
    .set({ email: nextEmail, emailVerified: true })
    .where(eq(user.id, sessionUser.id));

  await db.delete(verification).where(eq(verification.id, id));

  res.status(200).json({ email: nextEmail, emailVerified: true });
}

