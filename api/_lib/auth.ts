import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { db } from "./db/index.js";
import { restrictedUsernames } from "./usernames.js";
import { sendResendEmail } from "./email/resend.js";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL,
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    "http://localhost:5173",
  ].filter(Boolean) as string[],
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
  plugins: [
    username({
      minUsernameLength: 4,
      maxUsernameLength: 10,
      usernameValidator: (value) => !restrictedUsernames.includes(value),
      usernameNormalization: (value) => value.toLowerCase(),
    }),
  ],
  emailVerification: {
    sendOnSignUp: false,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const subject = "验证你的邮箱";
      const text = `请点击链接验证邮箱：${url}`;
      await sendResendEmail({
        to: user.email,
        subject,
        text,
        html: `<p>请点击链接验证邮箱：</p><p><a href="${url}">${url}</a></p>`,
      });
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      const subject = "重置你的密码";
      const text = `请点击链接重置密码：${url}`;
      await sendResendEmail({
        to: user.email,
        subject,
        text,
        html: `<p>请点击链接重置密码：</p><p><a href="${url}">${url}</a></p>`,
      });
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        required: false,
        input: false,
      },
      gender: {
        type: "boolean",
        required: true,
        input: true,
      },
    },
  },
});
