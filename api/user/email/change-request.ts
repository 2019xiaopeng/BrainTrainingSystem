import { eq } from "drizzle-orm";
import { db } from "../../_lib/db/index.js";
import { sendResendEmail } from "../../_lib/email/resend.js";
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

const makeOtp = () => String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");

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
  if (!isValidEmail(nextEmail)) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }

  const currentRows = await db.select({ email: user.email }).from(user).where(eq(user.id, sessionUser.id)).limit(1);
  const currentEmail = normalizeEmail(currentRows[0]?.email ?? "");
  if (currentEmail && currentEmail === nextEmail) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }

  const existsRows = await db.select({ id: user.id }).from(user).where(eq(user.email, nextEmail)).limit(1);
  if (existsRows[0]?.id) {
    res.status(409).json({ error: "email_in_use" });
    return;
  }

  const otp = makeOtp();
  const id = `email_change:${sessionUser.id}:${nextEmail}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db
    .insert(verification)
    .values({ id, identifier: id, value: otp, expiresAt })
    .onConflictDoUpdate({ target: verification.id, set: { identifier: id, value: otp, expiresAt } });

  await sendResendEmail({
    to: nextEmail,
    subject: "BrainTrainSystem 更改邮箱验证码",
    text: `你的更改邮箱验证码：${otp}\n\n该验证码 10 分钟内有效。若非本人操作，请忽略此邮件。`,
  });

  res.status(200).json({ ok: true });
}

