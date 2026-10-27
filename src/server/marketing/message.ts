import "server-only";
import { renderTemplate, SMS_OPT_OUT_FOOTER, smsSegmentCount, SMS_BODY_MAX, type TemplateVariable } from "@/features/marketing/utils/template";
import { normalizeEmailDesign, renderEmailHtml, type EmailDesign } from "@/features/marketing/utils/email-design";
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
 * Renders the campaign content for one recipient. The body is plain text: every value is escaped for
 * the HTML part, and the text part is used verbatim. A curated design wraps that text in
 * table-based, inline-styled HTML. An unsubscribe route is always present, so no email can be sent
 * without an opt-out route, and every SMS carries the opt-out wording.
 */
export function renderMessage(
  channel: MarketingChannel,
  content: { subject: string; body: string; design?: EmailDesign },
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
  const html = renderEmailHtml({
    design: normalizeEmailDesign(content.design),
    subject,
    body,
    companyName: values.company_name,
    unsubscribeUrl: values.unsubscribe_url,
    unsubscribeInBody: hasLinkInBody,
  });
  const text = `${body}${footerText}`;
  return { channel, subject, text, html, segments: 1 };
}
