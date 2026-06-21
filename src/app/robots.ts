import type { MetadataRoute } from "next";

const SITE_URL = "https://provenra.vercel.app";

/**
 * robots.txt. We explicitly welcome both classic search crawlers and AI
 * answer/generative-engine crawlers (AEO/GEO) — GPTBot (ChatGPT), OAI-SearchBot,
 * ClaudeBot, PerplexityBot, Google-Extended (Gemini/AI Overviews), etc. — so the
 * platform can be discovered and cited by AI assistants, not just Google.
 */
export default function robots(): MetadataRoute.Robots {
  const aiBots = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-Web",
    "anthropic-ai",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "Applebot-Extended",
    "CCBot",
    "Amazonbot",
    "Bytespider",
    "Meta-ExternalAgent",
  ];
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...aiBots.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
