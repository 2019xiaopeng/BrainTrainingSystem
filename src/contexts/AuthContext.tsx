import { useEffect, type ReactNode } from 'react';
import { useSession } from '../lib/auth/client';
import { useGameStore } from '../store/gameStore';
import type { AuthProfile } from '../types/game';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const setAuthProfile = useGameStore((s) => s.setAuthProfile);
  const setCloudUnlocks = useGameStore((s) => s.setCloudUnlocks);

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      setAuthProfile(guestProfile);
      setCloudUnlocks(null);
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
            totalXP: data.xp ?? s.userProfile.totalXP,
            brainCoins: data.brainCoins ?? s.userProfile.brainCoins,
            energy: data.energy ?? s.userProfile.energy,
            checkIn: data.checkIn ?? s.userProfile.checkIn,
          },
          cloudUnlocks: data.unlocks ?? s.cloudUnlocks,
        }));
      } catch {
        return;
      }
    })();
  }, [isPending, session, setAuthProfile, setCloudUnlocks]);

  return children;
}
