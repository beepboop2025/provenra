import Anthropic from "@anthropic-ai/sdk";

/**
 * Provider-agnostic LLM adapter for the intel agents.
 *
 * Picks whatever key is configured, in order:
 *   1. GEMINI_API_KEY   → Google Gemini (FREE tier; reads PDFs natively)
 *   2. ANTHROPIC_API_KEY → Claude (paid API)
 *   3. none             → callers use their deterministic fallback
 *
 * One small surface (`llmText`) handles both plain JSON generation and
 * PDF-grounded extraction, so the briefing and CDSCO agents stay provider-neutral.
 */

export type LlmInfo = {
  enabled: boolean;
  provider: "gemini" | "claude" | "none";
  model: string;
};

export function llmInfo(): LlmInfo {
  if (process.env.GEMINI_API_KEY) {
    return { enabled: true, provider: "gemini", model: process.env.GEMINI_MODEL || "gemini-flash-latest" };
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
  const info = llmInfo();
  try {
    if (info.provider === "gemini") return await viaGemini(req, info.model);
    if (info.provider === "claude") return await viaClaude(req, info.model);
  } catch {
    return null;
  }
  return null;
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
