import { collectIntel } from "@/lib/intel/collector";

const withTimeout = <T>(fn: () => Promise<T>, ms = 60_000): Promise<T | "TIMEOUT" | string> => {
  return Promise.race([
    fn(),
    new Promise<"TIMEOUT">((resolve) => setTimeout(() => resolve("TIMEOUT"), ms)),
  ]).catch((err) => `ERROR: ${err instanceof Error ? err.message : String(err)}`);
};

async function main() {
  console.log("=== Live collector verification ===\n");

  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  console.log(`LLM keys present: GEMINI=${hasGemini}, ANTHROPIC=${hasAnthropic}`);
  console.log("");

  const result = await withTimeout(() => collectIntel(), 60_000);

  if (Array.isArray(result)) {
    const recalls = result.filter((i) => i.kind === "recall" && i.source.includes("openFDA"));
    const shortages = result.filter((i) => i.kind === "shortage");
    const cdsco = result.filter((i) => i.source.includes("CDSCO"));

    console.log(`openFDA recalls: ${recalls.length} items`);
    if (recalls.length > 0) {
      console.log(`  first: ${recalls[0].title} (${recalls[0].date})`);
    }

    console.log(`openFDA shortages: ${shortages.length} items`);

    const cdscoParsed = cdsco.some((i) => /cdsco-\d+-\d+-\d+/.test(i.id));
    const cdscoPointer = cdsco.length === 1 && /cdsco-\d+-\d+$|cdsco-listing/.test(cdsco[0].id);
    console.log(`CDSCO: ${cdsco.length} items (${cdscoParsed ? "parsed rows" : cdscoPointer ? "pointer/link" : "unknown"})`);
  } else {
    console.log(`collectIntel: ${result}`);
  }

  console.log("\n=== Done ===");
}

main();
