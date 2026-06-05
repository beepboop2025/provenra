import { NextResponse } from "next/server";
import { llmInfo, llmText } from "@/lib/intel/llm";

// Temporary diagnostic — returns LLM availability + a live test call result.
// No secret is exposed. Remove after verifying the intel agents work.
export const dynamic = "force-dynamic";

export async function GET() {
  const info = llmInfo();
  let test = "skipped (not enabled)";
  if (info.enabled) {
    const r = await llmText({
      system: "Reply with the single word OK.",
      user: "Reply with the single word OK.",
      maxTokens: 16,
    });
    test = r ? `ok · ${r.model} · "${r.text.trim().slice(0, 24)}"` : "CALL FAILED (null)";
  }
  return NextResponse.json({ info, test });
}
