import type { CdscoNsqAlert } from "@/lib/intel/cdsco/types";

/**
 * Provenance helpers for CDSCO NSQ records.
 *
 * Every persisted record carries source_url, listing_url, retrieved_at,
 * parser_version, extraction_method, and (when AI is involved) extraction_prompt
 * and raw_extraction_log. This module exposes helpers to render that provenance
 * in the UI and to verify that no silent transformation happened.
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

export function summarizeProvenance(alert: CdscoNsqAlert): ProvenanceSummary {
  const method = alert.extractionMethod || "unknown";
  const hasAi = method.startsWith("llm:") || method.includes("ai");
  return {
    sourceUrl: alert.sourceUrl,
    listingUrl: alert.listingUrl,
    retrievedAt: alert.retrievedAt,
    parserVersion: alert.parserVersion,
    extractionMethod: method,
    hasAiProvenance: hasAi,
    aiModel: hasAi ? method.replace("llm:", "") : undefined,
    aiPrompt: hasAi ? alert.extractionPrompt ?? undefined : undefined,
  };
}

export function isLiveCdscoRecord(alert: CdscoNsqAlert): boolean {
  return alert.extractionMethod === "cdsco-json-api" && alert.sourceUrl.includes("cdscoonline.gov.in");
}
