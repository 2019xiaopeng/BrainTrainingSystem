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

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      setAuthProfile(guestProfile);
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
  }, [isPending, session, setAuthProfile]);

  return children;
}
