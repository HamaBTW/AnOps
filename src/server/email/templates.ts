import { getAppUrl } from "@/config/env";

const COLORS = {
  ink: "#111f1d",
  canvas: "#f7f7f2",
  surface: "#ffffff",
  citron: "#c8f03e",
  secondary: "#59645f",
  border: "#d8ddd5",
};

type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

function layout(heading: string, body: string, ctaLabel: string, ctaUrl: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:${COLORS.canvas};font-family:Inter,-apple-system,Segoe UI,sans-serif;color:${COLORS.ink};">
    <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-family:Manrope,-apple-system,Segoe UI,sans-serif;font-weight:800;font-size:22px;letter-spacing:-0.03em;">AnOps</span>
      </div>
      <div style="background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:12px;padding:32px;">
        <h1 style="margin:0 0 12px;font-family:Manrope,-apple-system,Segoe UI,sans-serif;font-size:22px;letter-spacing:-0.03em;">${heading}</h1>
        <div style="font-size:14px;line-height:1.6;color:${COLORS.ink};">${body}</div>
        <div style="margin-top:24px;">
          <a href="${ctaUrl}" style="display:inline-block;background:${COLORS.citron};color:${COLORS.ink};text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:8px;">${ctaLabel}</a>
        </div>
        <p style="margin:20px 0 0;font-size:12px;color:${COLORS.secondary};word-break:break-all;">If the button does not work, copy this link:<br />${ctaUrl}</p>
      </div>
      <p style="text-align:center;font-size:12px;color:${COLORS.secondary};margin-top:20px;">
        One platform. Every operation.
      </p>
    </div>
  </body>
</html>`;
}

export function verificationEmail(name: string, token: string): RenderedEmail {
  const url = `${getAppUrl()}/verify?token=${encodeURIComponent(token)}`;
  const heading = "Verify your email";
  const body = `<p style="margin:0;">Hi ${escapeHtml(name)},</p>
    <p style="margin:12px 0 0;">Confirm your email address to activate your AnOps account. This link expires in 24 hours.</p>`;
  return {
    subject: "Verify your AnOps email",
    html: layout(heading, body, "Verify email", url),
    text: `Hi ${name},\n\nVerify your AnOps email (expires in 24 hours):\n${url}\n`,
  };
}

export function passwordResetEmail(name: string, token: string): RenderedEmail {
  const url = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const heading = "Reset your password";
  const body = `<p style="margin:0;">Hi ${escapeHtml(name)},</p>
    <p style="margin:12px 0 0;">We received a request to reset your AnOps password. This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`;
  return {
    subject: "Reset your AnOps password",
    html: layout(heading, body, "Reset password", url),
    text: `Hi ${name},\n\nReset your AnOps password (expires in 1 hour):\n${url}\n\nIf you did not request this, ignore this email.\n`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
