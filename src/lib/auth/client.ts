import { createAuthClient } from 'better-auth/react';
import { usernameClient } from 'better-auth/client/plugins';

const envBaseURL = import.meta.env.VITE_AUTH_BASE_URL as string | undefined;
const baseURL =
  envBaseURL && /^https?:\/\//i.test(envBaseURL.trim()) ? envBaseURL.trim() : undefined;

export const authClient = createAuthClient({
  ...(baseURL ? { baseURL } : {}),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [usernameClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
