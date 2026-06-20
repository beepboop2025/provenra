import Anthropic from "@anthropic-ai/sdk";
import { availableProviders } from "@/lib/free-llm-router/providers";
import { getFreeRouter, type ChatMessage } from "@/lib/free-llm-router/router";

/**
 * Provider-agnostic LLM adapter for the intel agents.
 *
 * Resolution order:
 *   1. Free LLM router → fails over across Groq/Cerebras/Gemini/Mistral/OpenRouter
 *      (text-only requests). Perpetually-free; multi-provider resilience.
 *   2. GEMINI_API_KEY   → Google Gemini native (required for PDF-grounded extraction)
 *   3. ANTHROPIC_API_KEY → Claude (paid API)
 *   4. none             → callers use their deterministic fallback
 *
 * PDF requests bypass the router (inline-PDF grounding isn't portable across the
 * OpenAI-compatible shims) and go straight to the native Gemini/Claude path.
 *
 * One small surface (`llmText`) keeps the briefing and CDSCO agents provider-neutral.
 */

export type LlmInfo = {
  enabled: boolean;
  provider: "gemini" | "claude" | "none";
  model: string;
};

export function llmInfo(): LlmInfo {
  // Any free-provider key (incl. GEMINI_API_KEY, which the router reuses) enables LLM.
  if (availableProviders().length > 0) {
    if (process.env.GEMINI_API_KEY) {
      return { enabled: true, provider: "gemini", model: process.env.GEMINI_MODEL || "gemini-flash-latest" };
    }
    return { enabled: true, provider: "gemini", model: "free-router" };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { enabled: true, provider: "claude", model: "claude-opus-4-8" };
  }
  return { enabled: false, provider: "none", model: "fallback" };
}

export interface LlmRequest {
  system: string;
  user: string;
  pdfBase64?: string;
  maxTokens?: number;
  json?: boolean;
}

export async function llmText(req: LlmRequest): Promise<{ text: string; model: string } | null> {
  // Text-only path → multi-provider free router with failover.
  if (!req.pdfBase64) {
    const viaRouter = await viaFreeRouter(req);
    if (viaRouter) return viaRouter;
    // fall through to native providers if the router has no providers / all failed
  }

  const info = llmInfo();
  try {
    if (process.env.GEMINI_API_KEY) return await viaGemini(req, process.env.GEMINI_MODEL || "gemini-flash-latest");
    if (process.env.ANTHROPIC_API_KEY) return await viaClaude(req, "claude-opus-4-8");
  } catch {
    return null;
  }
  return null;
}

async function viaFreeRouter(req: LlmRequest): Promise<{ text: string; model: string } | null> {
  const router = getFreeRouter();
  if (!router.hasProviders) return null;
  const system = req.json
    ? `${req.system}\n\nRespond with valid JSON only — no prose, no code fences.`
    : req.system;
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: req.user },
  ];
  try {
    const result = await router.chatCompletion(messages, {
      taskType: req.json ? "factual" : "summarization",
      maxTokens: req.maxTokens ?? 2048,
      temperature: 0.2,
    });
    const text = (result.text ?? "").trim();
    return text ? { text, model: `${result.provider}:${result.model}` } : null;
  } catch {
    return null;
  }
}

async function viaGemini(req: LlmRequest, model: string): Promise<{ text: string; model: string } | null> {
  const key = process.env.GEMINI_API_KEY!;
  // Header auth (X-goog-api-key) — works across key types and newer models;
  // the ?key= query param fails for some key kinds.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const parts: Array<Record<string, unknown>> = [];
  if (req.pdfBase64) parts.push({ inline_data: { mime_type: "application/pdf", data: req.pdfBase64 } });
  parts.push({ text: req.user });

  const body = {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      maxOutputTokens: req.maxTokens ?? 2048,
      // gemini-flash-latest is a thinking model — thinking consumes the output
      // budget and truncates the answer. We don't need it for extraction/summary,
      // so disable it and give the full budget to the response.
      thinkingConfig: { thinkingBudget: 0 },
      ...(req.json ? { responseMimeType: "application/json" } : {}),
    },
  };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30_000);
  const res = await fetch(url, {
    method: "POST",
    signal: ctrl.signal,
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
  });
  clearTimeout(t);
  if (!res.ok) return null;

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("");
  return text ? { text, model } : null;
}

async function viaClaude(req: LlmRequest, model: string): Promise<{ text: string; model: string } | null> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const content: Anthropic.ContentBlockParam[] = [];
  if (req.pdfBase64) {
    content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: req.pdfBase64 } });
  }
  content.push({ type: "text", text: req.user });

  const resp = await client.messages.create({
    model,
    max_tokens: req.maxTokens ?? 2048,
    system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return text ? { text, model: resp.model } : null;
}
