import type { MetadataRoute } from "next";

// Dynamic sitemap for RealE
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.real-e.space";
  const pages: string[] = [
    "/",
    "/chat",
    "/chat/new",
    "/chat/share",
    "/product",
    "/checkout",
    "/checkout/info",
    "/checkout/success",
    "/faq",
    "/privacy",
    "/account"
  ];
  const now = new Date();
  return pages.map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: p === "/" ? 1.0 : 0.7,
  }));
}


