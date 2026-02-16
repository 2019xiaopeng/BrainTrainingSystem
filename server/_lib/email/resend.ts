import { Resend } from "resend";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const getFrom = () => {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error("missing_resend_from");
  return from;
};

const getClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("missing_resend_api_key");
  return new Resend(apiKey);
};

export const sendResendEmail = async (payload: EmailPayload) => {
  const resend = getClient();
  const from = getFrom();
  await resend.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    ...(payload.html ? { html: payload.html } : {}),
  });
};

