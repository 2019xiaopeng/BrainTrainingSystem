import { useEffect, type ReactNode } from 'react';
import { useSession } from '../lib/auth/client';
import { useGameStore } from '../store/gameStore';
import type { AuthProfile, EnergyState } from '../types/game';

type SessionUser = {
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  image?: string | null;
};

type SessionData = {
  user: SessionUser;
};

const guestProfile: AuthProfile = {
  status: 'guest',
  userId: undefined,
  email: undefined,
  displayName: 'Guest',
  avatarUrl: null,
  linkedProviders: ['guest'],
};

const isEnergyState = (v: unknown): v is EnergyState => {
  if (!v || typeof v !== 'object') return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.current === 'number' &&
    typeof e.max === 'number' &&
    typeof e.lastUpdated === 'number' &&
    typeof e.unlimitedUntil === 'number'
  );
};

const mergeEnergyState = (local: EnergyState, remote: unknown): EnergyState => {
  if (!isEnergyState(remote)) return local;
  const r = remote;
  if (r.unlimitedUntil > local.unlimitedUntil) return r;
  if (r.lastUpdated > local.lastUpdated) return r;
  if (r.lastUpdated === local.lastUpdated) return r.current < local.current ? r : local;
  return r.current < local.current ? { ...local, current: r.current } : local;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const setAuthProfile = useGameStore((s) => s.setAuthProfile);
  const setCloudUnlocks = useGameStore((s) => s.setCloudUnlocks);
  const setCloudDailyActivity = useGameStore((s) => s.setCloudDailyActivity);

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      setAuthProfile(guestProfile);
      setCloudUnlocks(null);
      setCloudDailyActivity(null);
      return;
    }

    const { user } = session as SessionData;

    const displayName = user.name || user.username || user.email || 'User';
    const avatarUrl = user.image ?? null;

    setAuthProfile({
      status: 'authenticated',
      userId: user.id,
      email: user.email,
      displayName,
      avatarUrl,
      linkedProviders: ['email'],
    });

    void (async () => {
      try {
        const resp = await fetch('/api/user/profile', { credentials: 'include' });
        if (!resp.ok) return;
        const data = await resp.json();
        useGameStore.setState((s) => ({
          userProfile: {
            ...s.userProfile,
            totalScore: data.totalScore ?? s.userProfile.totalScore,
            totalXP: data.xp ?? s.userProfile.totalXP,
            maxNLevel: data.maxNLevel ?? s.userProfile.maxNLevel,
            daysStreak: data.daysStreak ?? s.userProfile.daysStreak,
            brainStats: data.brainStats ?? s.userProfile.brainStats,
            brainCoins: data.brainCoins ?? s.userProfile.brainCoins,
            completedMilestones: Array.isArray(data.completedMilestones) ? data.completedMilestones : s.userProfile.completedMilestones,
            energy: mergeEnergyState(s.userProfile.energy, data.energy),
            checkIn: data.checkIn ?? s.userProfile.checkIn,
            ownedItems: Array.isArray(data.ownedItems) ? data.ownedItems : s.userProfile.ownedItems,
          },
          cloudUnlocks: data.unlocks ?? s.cloudUnlocks,
          cloudDailyActivity: Array.isArray(data.dailyActivity) ? data.dailyActivity : s.cloudDailyActivity,
          sessionHistory: Array.isArray(data.sessionHistory) ? data.sessionHistory : s.sessionHistory,
        }));
      } catch {
        return;
      }
    })();
  }, [isPending, session, setAuthProfile, setCloudUnlocks, setCloudDailyActivity]);

  return children;
}
