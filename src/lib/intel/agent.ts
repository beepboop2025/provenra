import Anthropic from "@anthropic-ai/sdk";
import type { IntelItem, IntelBriefing } from "@/lib/intel/types";

/**
 * Analyst agent. Takes the collector's normalized items and uses Claude to write
 * a short, structured intelligence briefing. Runs on Vercel during ISR
 * regeneration (~once per refresh window), so cost is bounded and no laptop is
 * involved. Gated on ANTHROPIC_API_KEY: without it (e.g. local build), it returns
 * a deterministic fallback so the page and build never break.
 */

const SYSTEM = `You are the analyst agent for VitalChain, a pharmaceutical supply-chain command center.
You receive a list of real drug recalls and shortages collected from public regulators (openFDA).
Write a tight intelligence briefing for a pharma supply-chain operator (hospital chains, distributors).
Be specific and factual. No filler, no hedging, no emojis. Active voice.
Return ONLY a JSON object, no prose or code fences, with exactly this shape:
{"summary": "2-3 sentence situation read", "highlights": ["3 to 5 short, specific bullet strings"]}`;

function fallbackBriefing(items: IntelItem[]): IntelBriefing {
  const recalls = items.filter((i) => i.kind === "recall").length;
  const shortages = items.filter((i) => i.kind === "shortage").length;
  const critical = items.filter((i) => i.severity === "critical").length;
  return {
    summary: `Tracking ${recalls} recent drug recalls and ${shortages} active shortages from openFDA${
      critical ? `, including ${critical} Class I (most serious) recall${critical > 1 ? "s" : ""}` : ""
    }. Add an Anthropic API key to enable the AI analyst agent for a synthesized briefing.`,
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || items.length === 0) return fallbackBriefing(items);

  try {
    const client = new Anthropic({ apiKey });
    const digest = items
      .slice(0, 24)
      .map((i) => `- [${i.kind}/${i.classification}] ${i.title} | ${i.org} | ${i.status} | ${i.date}`)
      .join("\n");

    const resp = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1200,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: `Today's collected pharma intelligence:\n\n${digest}\n\nWrite the briefing JSON now.`,
        },
      ],
    });

    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const parsed = extractJson(text) as { summary?: unknown; highlights?: unknown };

    const summary = typeof parsed.summary === "string" ? parsed.summary : "";
    const highlights = Array.isArray(parsed.highlights)
      ? parsed.highlights.filter((h): h is string => typeof h === "string").slice(0, 5)
      : [];
    if (!summary || highlights.length === 0) return fallbackBriefing(items);

    return {
      summary,
      highlights,
      generatedAt: new Date().toISOString(),
      model: resp.model,
      byAI: true,
    };
  } catch {
    return fallbackBriefing(items);
  }
}
