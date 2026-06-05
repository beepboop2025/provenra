import { llmText, llmInfo } from "@/lib/intel/llm";
import type { IntelItem, IntelBriefing } from "@/lib/intel/types";

/**
 * Analyst agent. Consolidates the collector's items into a short structured
 * briefing using whatever free/paid LLM is configured (Gemini → Claude → none).
 * Without a key it returns a deterministic fallback, so the page and build never
 * break. Runs on Vercel during ISR regeneration — bounded cost, no laptop.
 */

const SYSTEM = `You are the analyst agent for VitalChain, a pharmaceutical supply-chain command center.
You receive a list of real drug recalls and shortages collected from public regulators (openFDA, India CDSCO).
Write a tight intelligence briefing for a pharma supply-chain operator (hospital chains, distributors).
Be specific and factual. No filler, no hedging, no emojis. Active voice.
Return ONLY a JSON object, no prose or code fences, with exactly this shape:
{"summary": "2-3 sentence situation read", "highlights": ["3 to 5 short, specific bullet strings"]}`;

function fallbackBriefing(items: IntelItem[]): IntelBriefing {
  const recalls = items.filter((i) => i.kind === "recall").length;
  const shortages = items.filter((i) => i.kind === "shortage").length;
  const critical = items.filter((i) => i.severity === "critical").length;
  return {
    summary: `Tracking ${recalls} recent drug recalls and ${shortages} active shortages from openFDA and CDSCO${
      critical ? `, including ${critical} Class I / critical item${critical > 1 ? "s" : ""}` : ""
    }. Add a free Gemini API key (or an Anthropic key) to enable the AI analyst agent for a synthesized briefing.`,
    highlights: items.slice(0, 4).map((i) =>
      i.kind === "recall"
        ? `Recall (${i.classification}): ${i.title} — ${i.org}`
        : `Shortage: ${i.title} — ${i.status}`
    ),
    generatedAt: new Date().toISOString(),
    model: "fallback",
    byAI: false,
  };
}

/** Pull the first balanced JSON object out of the model's text. */
function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("no json");
  return JSON.parse(text.slice(start, end + 1));
}

export async function generateBriefing(items: IntelItem[]): Promise<IntelBriefing> {
  if (items.length === 0 || !llmInfo().enabled) return fallbackBriefing(items);

  const digest = items
    .slice(0, 24)
    .map((i) => `- [${i.kind}/${i.classification}/${i.region}] ${i.title} | ${i.org} | ${i.status} | ${i.date}`)
    .join("\n");

  const res = await llmText({
    system: SYSTEM,
    user: `Today's collected pharma intelligence:\n\n${digest}\n\nWrite the briefing JSON now.`,
    json: true,
    maxTokens: 1200,
  });
  if (!res) return fallbackBriefing(items);

  try {
    const parsed = extractJson(res.text) as { summary?: unknown; highlights?: unknown };
    const summary = typeof parsed.summary === "string" ? parsed.summary : "";
    const highlights = Array.isArray(parsed.highlights)
      ? parsed.highlights.filter((h): h is string => typeof h === "string").slice(0, 5)
      : [];
    if (!summary || highlights.length === 0) return fallbackBriefing(items);
    return { summary, highlights, generatedAt: new Date().toISOString(), model: res.model, byAI: true };
  } catch {
    return fallbackBriefing(items);
  }
}
