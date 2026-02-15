import type { RequestLike, ResponseLike } from "../_lib/http.js";
import { requireAdmin } from "../_lib/admin.js";

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  try {
    const admin = await requireAdmin(req);
    res.status(200).json({ userId: admin.id, email: admin.email, role: admin.role, isAdmin: true });
  } catch (e) {
    const code = (e as Error).message === "forbidden" ? 403 : 401;
    res.status(code).json({ error: code === 403 ? "forbidden" : "unauthorized" });
  }
}

