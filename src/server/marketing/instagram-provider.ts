import { instagramConfig, instagramConfigured } from "./instagram.config";

export type InstagramPublishResult = { status: "published" | "failed" | "uncertain"; providerPostId?: string; safeError?: string };

export function instagramCapabilities() {
  return { configured: instagramConfigured(), platform: "instagram", supported: ["professional_image_post"], unsupported: ["personal_accounts", "reels", "stories", "carousels", "video", "media_hosting"] };
}

function validPublicImageUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:"; } catch { return false; }
}

async function readJson(response: Response): Promise<unknown> {
  try { return await response.json(); } catch { return null; }
}

function hasId(data: unknown): data is { id: string } { return Boolean(data && typeof data === "object" && "id" in data && typeof data.id === "string" && data.id); }

export async function publishInstagramImagePost(accessToken: string, instagramAccountId: string, caption: string, imageUrl: string): Promise<InstagramPublishResult> {
  if (!instagramConfigured()) return { status: "failed", safeError: "Instagram configuration is incomplete." };
  if (!validPublicImageUrl(imageUrl)) return { status: "failed", safeError: "Instagram image URL must be a public HTTPS URL." };
  if (caption.length > 2200) return { status: "failed", safeError: "Instagram captions must be 2200 characters or fewer." };
  const config = instagramConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const containerResponse = await fetch(`https://graph.instagram.com/${config.graphVersion}/${encodeURIComponent(instagramAccountId)}/media`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }), signal: controller.signal });
    const container = await readJson(containerResponse);
    if (!containerResponse.ok || !hasId(container)) return { status: "failed", safeError: containerResponse.status === 429 ? "Instagram rate limit reached." : "Instagram rejected the media container." };
    let statusCode = "IN_PROGRESS";
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const statusResponse = await fetch(`https://graph.instagram.com/${config.graphVersion}/${encodeURIComponent(container.id)}?fields=status_code`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal });
      const statusData = await readJson(statusResponse);
      statusCode = statusData && typeof statusData === "object" && "status_code" in statusData && typeof statusData.status_code === "string" ? statusData.status_code : "ERROR";
      if (statusCode === "FINISHED") break;
      if (["ERROR", "EXPIRED"].includes(statusCode)) return { status: "failed", safeError: "Instagram could not process the media container." };
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (statusCode !== "FINISHED") return { status: "uncertain", safeError: "Instagram media processing did not finish before the timeout; manual reconciliation is required." };
    const publishResponse = await fetch(`https://graph.instagram.com/${config.graphVersion}/${encodeURIComponent(instagramAccountId)}/media_publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creation_id: container.id, access_token: accessToken }), signal: controller.signal });
    const published = await readJson(publishResponse);
    if (!publishResponse.ok || !hasId(published)) return { status: publishResponse.status === 429 ? "failed" : "uncertain", safeError: publishResponse.status === 429 ? "Instagram rate limit reached." : "Instagram publication could not be confirmed." };
    return { status: "published", providerPostId: published.id };
  } catch (error) { return { status: "uncertain", safeError: error instanceof Error && error.name === "AbortError" ? "Instagram publication timed out; manual reconciliation is required." : "Instagram publication could not be confirmed." }; }
  finally { clearTimeout(timeout); }
}
