import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db, ensureSchemaReady } from "../server/_lib/db/index.js";
import { user } from "../server/_lib/db/schema/index.js";

const parseEmails = (raw: string | undefined) =>
  (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

const main = async () => {
  await ensureSchemaReady();

  const emails = parseEmails(process.env.ADMIN_EMAILS);
  if (emails.length === 0) {
    throw new Error("missing_ADMIN_EMAILS");
  }

  const rows = await db.select({ id: user.id, email: user.email, role: user.role }).from(user).where(inArray(user.email, emails));
  if (rows.length === 0) {
    throw new Error("no_matching_users");
  }

  await db.update(user).set({ role: "admin" }).where(inArray(user.email, emails));

  const after = await db.select({ id: user.id, email: user.email, role: user.role }).from(user).where(inArray(user.email, emails));
  console.log(
    JSON.stringify(
      {
        ok: true,
        promoted: after.map((r) => ({ id: r.id, email: r.email, role: r.role })),
      },
      null,
      2
    )
  );
};

main().catch((e) => {
  console.error(String((e as Error).message ?? e));
  process.exitCode = 1;
});

