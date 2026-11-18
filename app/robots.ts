import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    // Private or per-customer pages stay out of search results.
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/", "/embed/", "/invite/", "/chat/", "/auth/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
