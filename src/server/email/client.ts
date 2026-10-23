import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env, isEmailConfigured } from "@/config/env";

export type MailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendMailResult =
  | { delivered: true }
  | { delivered: false; reason: "not_configured" | "error"; error?: string };

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

function describeTransport(): string {
  return `host=${env.EMAIL_SERVER_HOST ?? "(unset)"} port=${env.EMAIL_SERVER_PORT ?? 587} secure=${env.EMAIL_SERVER_SECURE ?? false} user=${env.EMAIL_SERVER_USER ? "(set)" : "(unset)"} from=${env.EMAIL_FROM ?? "(unset)"}`;
}

export async function sendMail(input: MailInput): Promise<SendMailResult> {
  console.info(`[email] preparing "${input.subject}" to ${input.to} | ${describeTransport()}`);

  if (!isEmailConfigured()) {
    console.warn(
      "[email] NOT CONFIGURED — required: EMAIL_SERVER_HOST and EMAIL_FROM. Falling back to console output (dev only)."
    );
    console.warn(`[email:preview] To: ${input.to}\nSubject: ${input.subject}\n\n${input.text}`);

    if (env.NODE_ENV === "production") {
      const error = "Email is not configured (set EMAIL_SERVER_HOST and EMAIL_FROM).";
      console.error(`[email] FAILED: ${error}`);
      return { delivered: false, reason: "not_configured", error };
    }

    return { delivered: false, reason: "not_configured" };
  }

  try {
    const info = await getTransporter().sendMail({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    console.info(
      `[email] SENT "${input.subject}" to ${input.to} (messageId=${info.messageId ?? "n/a"} response=${info.response ?? "n/a"})`
    );
    return { delivered: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[email] FAILED to send "${input.subject}" to ${input.to}: ${message}`);
    if (error instanceof Error && error.stack) console.error(error.stack);

    if (env.NODE_ENV !== "production") {
      console.warn(`[email:fallback] To: ${input.to}\nSubject: ${input.subject}\n\n${input.text}`);
    }

    return { delivered: false, reason: "error", error: message };
  }
}
