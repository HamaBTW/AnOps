import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env, isEmailConfigured } from "@/config/env";

export type MailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.EMAIL_SERVER_HOST,
    port: env.EMAIL_SERVER_PORT ?? 587,
    secure: env.EMAIL_SERVER_SECURE ?? false,
    auth:
      env.EMAIL_SERVER_USER && env.EMAIL_SERVER_PASSWORD
        ? { user: env.EMAIL_SERVER_USER, pass: env.EMAIL_SERVER_PASSWORD }
        : undefined,
  });

  return transporter;
}

export async function sendMail(input: MailInput): Promise<{ delivered: boolean }> {
  if (!isEmailConfigured()) {
    if (env.NODE_ENV !== "production") {
      console.info(
        `[email:dev] To: ${input.to}\nSubject: ${input.subject}\n${input.text}`
      );
      return { delivered: false };
    }
    throw new Error("Email is not configured. Set EMAIL_SERVER_HOST and EMAIL_FROM.");
  }

  await getTransporter().sendMail({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return { delivered: true };
}
