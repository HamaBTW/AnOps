import { getAppUrl } from "@/config/env";

const COLORS = {
  canvas: "#f7f7f2",
  surface: "#ffffff",
  border: "#d8ddd5",
  ink: "#111f1d",
  secondary: "#59645f",
  citron: "#c8f03e",
};

type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

function layout(heading: string, body: string, ctaLabel: string, ctaUrl: string): string {
  const logoUrl = `${getAppUrl()}/anops-horizontal-logo.svg`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AnOps</title>
  </head>
  <body style="margin:0;background:${COLORS.canvas};font-family:Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;color:${COLORS.ink};-webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.canvas};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
            <tr>
              <td align="center" style="padding:0 0 24px 0;">
                <img src="${logoUrl}" alt="AnOps" height="32" style="display:block;height:32px;width:auto;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:12px;padding:32px;">
                <h1 style="margin:0 0 12px 0;font-family:Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;font-size:20px;line-height:28px;font-weight:800;letter-spacing:-0.03em;color:${COLORS.ink};">${escapeHtml(heading)}</h1>
                <div style="font-size:14px;line-height:22px;color:${COLORS.ink};">${body}</div>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                  <tr>
                    <td align="center" style="border-radius:8px;background:${COLORS.citron};">
                      <a href="${ctaUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;line-height:20px;font-weight:700;color:${COLORS.ink};text-decoration:none;">${escapeHtml(ctaLabel)}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 0 0;font-size:12px;line-height:18px;color:${COLORS.secondary};word-break:break-all;">
                  If the button doesn&apos;t work, copy and paste this link into your browser:<br />
                  <a href="${ctaUrl}" style="color:${COLORS.secondary};text-decoration:underline;">${ctaUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 0 0 0;font-size:12px;line-height:18px;color:${COLORS.secondary};">
                &copy; ${new Date().getFullYear()} AnOps. One platform. Every operation.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function verificationEmail(name: string, token: string): RenderedEmail {
  const url = `${getAppUrl()}/verify?token=${encodeURIComponent(token)}`;
  const heading = "Verify your email";
  const body = `<p style="margin:0;">Hi ${escapeHtml(name)},</p>
    <p style="margin:12px 0 0 0;">Confirm your email address to activate your AnOps account. This link expires in 24 hours.</p>
    <p style="margin:12px 0 0 0;">If you didn&apos;t create an AnOps account, you can safely ignore this email.</p>`;

  return {
    subject: "Verify your email for AnOps",
    html: layout(heading, body, "Verify email", url),
    text: `Hi ${name},\n\nConfirm your email address to activate your AnOps account (expires in 24 hours):\n${url}\n\nIf you didn't create an AnOps account, you can safely ignore this email.\n`,
  };
}

export function passwordResetEmail(name: string, token: string): RenderedEmail {
  const url = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const heading = "Reset your password";
  const body = `<p style="margin:0;">Hi ${escapeHtml(name)},</p>
    <p style="margin:12px 0 0 0;">We received a request to reset the password for your AnOps account. This link expires in 1 hour.</p>
    <p style="margin:12px 0 0 0;">If you didn&apos;t request a password reset, you can safely ignore this email.</p>`;

  return {
    subject: "Reset your AnOps password",
    html: layout(heading, body, "Reset password", url),
    text: `Hi ${name},\n\nReset your AnOps password (expires in 1 hour):\n${url}\n\nIf you didn't request a password reset, you can safely ignore this email.\n`,
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
