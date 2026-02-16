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
          const subject = "BrainTrainSystem 邮箱验证码";
          const text = `你的 BrainTrainSystem 邮箱验证码：${otp}\n\n该验证码 10 分钟内有效。若非本人操作，请忽略此邮件。`;
          await sendResendEmail({
            to: email,
            subject,
            text,
            html: `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans','Apple Color Emoji','Segoe UI Emoji';background:#f6f7f9;padding:32px 12px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e8ec;border-radius:14px;overflow:hidden">
    <div style="padding:18px 22px;background:#0f172a;color:#ffffff">
      <div style="font-size:14px;letter-spacing:.3px;opacity:.9">BrainTrainSystem</div>
      <div style="font-size:18px;font-weight:700;margin-top:4px">邮箱验证码</div>
    </div>
    <div style="padding:22px">
      <div style="font-size:14px;color:#111827;line-height:1.6">你的验证码如下（10 分钟内有效）：</div>
      <div style="margin:14px 0 8px;padding:14px 16px;border:1px dashed #cbd5e1;border-radius:12px;background:#f8fafc;text-align:center">
        <div style="font-size:26px;font-weight:800;letter-spacing:10px;color:#0f172a">${otp}</div>
      </div>
      <div style="font-size:12px;color:#64748b;line-height:1.6">若非本人操作，请忽略此邮件。</div>
    </div>
    <div style="padding:14px 22px;background:#f8fafc;border-top:1px solid #eef2f7;color:#94a3b8;font-size:12px;line-height:1.6">
      此邮件由 BrainTrainSystem 自动发送，请勿回复。
    </div>
  </div>
</div>`,
          });
          return;
        }
        if (type === "forget-password") {
          const subject = "BrainTrainSystem 重置密码验证码";
          const text = `你的 BrainTrainSystem 重置密码验证码：${otp}\n\n该验证码 10 分钟内有效。若非本人操作，请忽略此邮件并检查账号安全。`;
          await sendResendEmail({
            to: email,
            subject,
            text,
            html: `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans','Apple Color Emoji','Segoe UI Emoji';background:#f6f7f9;padding:32px 12px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e8ec;border-radius:14px;overflow:hidden">
    <div style="padding:18px 22px;background:#111827;color:#ffffff">
      <div style="font-size:14px;letter-spacing:.3px;opacity:.9">BrainTrainSystem</div>
      <div style="font-size:18px;font-weight:700;margin-top:4px">重置密码验证码</div>
    </div>
    <div style="padding:22px">
      <div style="font-size:14px;color:#111827;line-height:1.6">你正在重置密码。验证码如下（10 分钟内有效）：</div>
      <div style="margin:14px 0 8px;padding:14px 16px;border:1px dashed #cbd5e1;border-radius:12px;background:#f8fafc;text-align:center">
        <div style="font-size:26px;font-weight:800;letter-spacing:10px;color:#111827">${otp}</div>
      </div>
      <div style="font-size:12px;color:#64748b;line-height:1.6">若非本人操作，请忽略此邮件并检查账号安全。</div>
    </div>
    <div style="padding:14px 22px;background:#f8fafc;border-top:1px solid #eef2f7;color:#94a3b8;font-size:12px;line-height:1.6">
      此邮件由 BrainTrainSystem 自动发送，请勿回复。
    </div>
  </div>
</div>`,
          });
          return;
        }
        const subject = "BrainTrainSystem 登录验证码";
        const text = `你的 BrainTrainSystem 登录验证码：${otp}\n\n该验证码 10 分钟内有效。若非本人操作，请忽略此邮件。`;
        await sendResendEmail({
          to: email,
          subject,
          text,
          html: `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans','Apple Color Emoji','Segoe UI Emoji';background:#f6f7f9;padding:32px 12px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e8ec;border-radius:14px;overflow:hidden">
    <div style="padding:18px 22px;background:#0b1220;color:#ffffff">
      <div style="font-size:14px;letter-spacing:.3px;opacity:.9">BrainTrainSystem</div>
      <div style="font-size:18px;font-weight:700;margin-top:4px">登录验证码</div>
    </div>
    <div style="padding:22px">
      <div style="font-size:14px;color:#111827;line-height:1.6">你的验证码如下（10 分钟内有效）：</div>
      <div style="margin:14px 0 8px;padding:14px 16px;border:1px dashed #cbd5e1;border-radius:12px;background:#f8fafc;text-align:center">
        <div style="font-size:26px;font-weight:800;letter-spacing:10px;color:#0b1220">${otp}</div>
      </div>
      <div style="font-size:12px;color:#64748b;line-height:1.6">若非本人操作，请忽略此邮件。</div>
    </div>
    <div style="padding:14px 22px;background:#f8fafc;border-top:1px solid #eef2f7;color:#94a3b8;font-size:12px;line-height:1.6">
      此邮件由 BrainTrainSystem 自动发送，请勿回复。
    </div>
  </div>
</div>`,
        });
      },
    }),
  ],
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: false,
  },
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
