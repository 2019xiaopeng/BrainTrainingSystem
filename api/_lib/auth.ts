import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, username } from "better-auth/plugins";
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
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      overrideDefaultEmailVerification: true,
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (type === "email-verification") {
          const subject = "邮箱验证码";
          const text = `你的邮箱验证码是：${otp}\n\n该验证码 10 分钟内有效。`;
          await sendResendEmail({
            to: email,
            subject,
            text,
            html: `<p>你的邮箱验证码是：</p><p style="font-size:20px;font-weight:700;letter-spacing:2px">${otp}</p><p>该验证码 10 分钟内有效。</p>`,
          });
          return;
        }
        if (type === "forget-password") {
          const subject = "重置密码验证码";
          const text = `你的重置密码验证码是：${otp}\n\n该验证码 10 分钟内有效。`;
          await sendResendEmail({
            to: email,
            subject,
            text,
            html: `<p>你的重置密码验证码是：</p><p style="font-size:20px;font-weight:700;letter-spacing:2px">${otp}</p><p>该验证码 10 分钟内有效。</p>`,
          });
          return;
        }
        const subject = "登录验证码";
        const text = `你的登录验证码是：${otp}\n\n该验证码 10 分钟内有效。`;
        await sendResendEmail({
          to: email,
          subject,
          text,
          html: `<p>你的登录验证码是：</p><p style="font-size:20px;font-weight:700;letter-spacing:2px">${otp}</p><p>该验证码 10 分钟内有效。</p>`,
        });
      },
    }),
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
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
