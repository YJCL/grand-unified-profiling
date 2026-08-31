import type { MetadataRoute } from "next";
import { insights } from "./data/insights";

const baseUrl = "https://orba.life";

export default function sitemap(): MetadataRoute.Sitemap {
  const latestInsightUpdate = insights.reduce(
    (latest, insight) => (insight.updatedAt > latest ? insight.updatedAt : latest),
    "2026-08-17",
  );
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date("2026-08-17"), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/insights`, lastModified: new Date(latestInsightUpdate), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/diagnosis/strengths`, lastModified: new Date("2026-08-30"), changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/brand`, lastModified: new Date("2026-08-17"), changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/legal/terms`, lastModified: new Date("2026-08-24"), changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/legal/privacy`, lastModified: new Date("2026-08-24"), changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/safety`, lastModified: new Date("2026-08-24"), changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/legal/cancellation`, lastModified: new Date("2026-08-17"), changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/contact`, lastModified: new Date("2026-08-17"), changeFrequency: "yearly", priority: 0.3 },
  ];

  const articlePages: MetadataRoute.Sitemap = insights.map((insight) => ({
    url: `${baseUrl}/insights/${insight.slug}`,
    lastModified: new Date(insight.updatedAt),
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  return [...staticPages, ...articlePages];
}
