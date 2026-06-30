import type { OpenfdaEnforcementRecall, OpenfdaShortage } from "@/lib/intel/openfda/types";

/**
 * Provenance helpers for openFDA records.
 *
 * Every persisted record carries source_url, listing_url, retrieved_at,
 * parser_version, extraction_method, and (when AI is involved) extraction_prompt
 * and raw_extraction_log. These helpers expose that provenance in the UI and
 * let consumers verify the record is a direct public-API result.
 */

export interface ProvenanceSummary {
  sourceUrl: string;
  listingUrl: string;
  retrievedAt: string;
  parserVersion: string;
  extractionMethod: string;
  hasAiProvenance: boolean;
  aiModel?: string;
  aiPrompt?: string;
}

export function summarizeRecallProvenance(recall: OpenfdaEnforcementRecall): ProvenanceSummary {
  const method = recall.extractionMethod || "unknown";
  const hasAi = method.startsWith("llm:") || method.includes("ai");
  return {
    sourceUrl: recall.sourceUrl,
    listingUrl: recall.listingUrl,
    retrievedAt: recall.retrievedAt,
    parserVersion: recall.parserVersion,
    extractionMethod: method,
    hasAiProvenance: hasAi,
    aiModel: hasAi ? method.replace("llm:", "") : undefined,
    aiPrompt: hasAi ? recall.extractionPrompt ?? undefined : undefined,
  };
}

export function summarizeShortageProvenance(shortage: OpenfdaShortage): ProvenanceSummary {
  const method = shortage.extractionMethod || "unknown";
  const hasAi = method.startsWith("llm:") || method.includes("ai");
  return {
    sourceUrl: shortage.sourceUrl,
    listingUrl: shortage.listingUrl,
    retrievedAt: shortage.retrievedAt,
    parserVersion: shortage.parserVersion,
    extractionMethod: method,
    hasAiProvenance: hasAi,
    aiModel: hasAi ? method.replace("llm:", "") : undefined,
    aiPrompt: hasAi ? shortage.extractionPrompt ?? undefined : undefined,
  };
}

export function isLiveOpenfdaRecall(recall: OpenfdaEnforcementRecall): boolean {
  return recall.extractionMethod === "openfda-json-api" && recall.sourceUrl.includes("api.fda.gov/drug/enforcement");
}

export function isLiveOpenfdaShortage(shortage: OpenfdaShortage): boolean {
  return shortage.extractionMethod === "openfda-json-api" && shortage.sourceUrl.includes("api.fda.gov/drug/shortages");
}
