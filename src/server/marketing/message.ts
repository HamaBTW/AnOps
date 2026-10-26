import "server-only";
import { escapeHtml, plainTextToHtml, renderTemplate, SMS_OPT_OUT_FOOTER, smsSegmentCount, SMS_BODY_MAX, type TemplateVariable } from "@/features/marketing/utils/template";
import type { MarketingChannel } from "@/features/marketing/types/constants";

export type RenderedMessage = {
  channel: MarketingChannel;
  subject: string;
  text: string;
  /** Escaped HTML part for email. Null for SMS. */
  html: string | null;
  segments: number;
};

/**
 * Renders the campaign content for one recipient. Templates are plain text: every value is escaped for
 * the HTML part, and the text part is used verbatim. An unsubscribe line is always present, so no email
 * can be sent without an opt-out route, and every SMS carries the opt-out wording.
 */
export function renderMessage(
  channel: MarketingChannel,
  content: { subject: string; body: string },
  values: Record<TemplateVariable, string>
): RenderedMessage {
  const subject = renderTemplate(content.subject, values);
  const body = renderTemplate(content.body, values);

  if (channel === "sms") {
    const text = `${body} ${SMS_OPT_OUT_FOOTER}`;
    if (text.length > SMS_BODY_MAX) throw new Error("SMS content exceeds the length limit after rendering");
    return { channel, subject: "", text, html: null, segments: smsSegmentCount(text) };
  }

  const hasLinkInBody = content.body.includes("{{unsubscribe_url}}");
  const footerText = hasLinkInBody ? "" : `\n\nUnsubscribe: ${values.unsubscribe_url}`;
  const footerHtml = hasLinkInBody
    ? ""
    : `<p style="margin-top:24px;font-size:12px;color:#666">Unsubscribe: <a href="${escapeHtml(values.unsubscribe_url)}">${escapeHtml(values.unsubscribe_url)}</a></p>`;
  const text = `${body}${footerText}`;
  const html = `<div>${plainTextToHtml(body)}</div>${footerHtml}`;
  return { channel, subject, text, html, segments: 1 };
}
