import { eq } from "drizzle-orm";
import { db } from "../_lib/db/index.js";
import { user } from "../_lib/db/schema/index.js";
import { getBanStatus } from "../_lib/admin.js";
import { requireSessionUser } from "../_lib/session.js";
import type { RequestLike, ResponseLike } from "../_lib/http.js";

const computeBrainLevel = (xp: number) => {
  if (xp >= 80000) return 7;
  if (xp >= 50000) return 6;
  if (xp >= 25000) return 5;
  if (xp >= 10000) return 4;
  if (xp >= 2500) return 3;
  if (xp >= 500) return 2;
  return 1;
};

const getReward = (streak: number) => {
  const xp = 50;
  const coins = streak >= 7 ? 60 : streak >= 3 ? 20 : 10;
  return { xp, coins };
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

  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(todayKey);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  const dayBeforeYesterday = new Date(todayKey);
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
  const dayBeforeYesterdayKey = dayBeforeYesterday.toISOString().slice(0, 10);

  const result = await db.transaction(async (tx) => {
    const rows = await tx
      .select({
        xp: user.xp,
        brainLevel: user.brainLevel,
        brainCoins: user.brainCoins,
        checkInLastDate: user.checkInLastDate,
        checkInStreak: user.checkInStreak,
        inventory: user.inventory,
      })
      .from(user)
      .where(eq(user.id, sessionUser.id))
      .limit(1);

    const row = rows[0];
    if (!row) return { error: "user_not_found" as const };

    const last = row.checkInLastDate ? String(row.checkInLastDate) : null;
    if (last === todayKey) {
      return {
        alreadyCheckedIn: true,
        xpAfter: row.xp ?? 0,
        brainLevelAfter: row.brainLevel ?? 1,
        brainCoinsAfter: row.brainCoins ?? 0,
        checkIn: { lastCheckInDate: todayKey, consecutiveDays: row.checkInStreak ?? 0 },
        reward: { xp: 0, coins: 0 },
      };
    }

    const prevStreak = row.checkInStreak ?? 0;
    const inventoryRaw = row.inventory && typeof row.inventory === "object" ? (row.inventory as Record<string, unknown>) : {};
    const streakSaverCount = Number(inventoryRaw["streak_saver"] ?? 0) || 0;
    const canUseStreakSaver = last === dayBeforeYesterdayKey && streakSaverCount > 0;
    const newStreak = last === yesterdayKey || canUseStreakSaver ? prevStreak + 1 : 1;
    const reward = getReward(newStreak);

    const xpBefore = row.xp ?? 0;
    const coinsBefore = row.brainCoins ?? 0;
    const xpAfter = xpBefore + reward.xp;
    const brainCoinsAfter = coinsBefore + reward.coins;
    const brainLevelAfter = computeBrainLevel(xpAfter);
    const nextInventory = canUseStreakSaver
      ? { ...inventoryRaw, streak_saver: Math.max(0, streakSaverCount - 1) }
      : inventoryRaw;

    await tx
      .update(user)
      .set({
        xp: xpAfter,
        brainLevel: brainLevelAfter,
        brainCoins: brainCoinsAfter,
        checkInLastDate: todayKey,
        checkInStreak: newStreak,
        inventory: nextInventory,
      })
      .where(eq(user.id, sessionUser.id));

    return {
      alreadyCheckedIn: false,
      xpAfter,
      brainLevelAfter,
      brainCoinsAfter,
      checkIn: { lastCheckInDate: todayKey, consecutiveDays: newStreak },
      reward,
    };
  });

  if ("error" in result && result.error === "user_not_found") {
    res.status(404).json({ error: "user_not_found" });
    return;
  }

  res.status(200).json(result);
}
