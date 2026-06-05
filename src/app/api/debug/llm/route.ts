import { NextResponse } from "next/server";

// Temporary diagnostic — raw Gemini call from the Vercel runtime to surface the
// real error (status + body). No key is returned. Remove after debugging.
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ enabled: false });

  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Reply with the single word OK." }] }],
        generationConfig: { maxOutputTokens: 16 },
      }),
    });
    const body = await res.text();
    return NextResponse.json({ model, status: res.status, ok: res.ok, body: body.slice(0, 600) });
  } catch (e) {
    return NextResponse.json({ model, error: String(e).slice(0, 300) });
  }
}
