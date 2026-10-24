import type { MetadataRoute } from "next";
import { apps } from "@/shared/config/catalog";
import { siteUrl } from "@/shared/config/url";

const staticRoutes = ["", "/apps", "/industries", "/community", "/pricing", "/help", "/about", "/contact", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [...staticRoutes, ...apps.map((app) => `/apps/${app.slug}`)];
  return routes.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
