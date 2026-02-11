import { requireSessionUser } from "../../_lib/session.js";
import type { RequestLike, ResponseLike } from "../../_lib/http.js";
import { isRecord } from "../../_lib/http.js";

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

  try {
    await requireSessionUser(req);
  } catch {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const body = parseBody(req);
  if (!isRecord(body)) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  const currentPassword = String(body.currentPassword ?? "");
  const password = String(body.password ?? "");
  if (!currentPassword || password.length < 8) {
    res.status(400).json({ error: "invalid_password" });
    return;
  }

  res.status(501).json({ error: "not_implemented" });
}

