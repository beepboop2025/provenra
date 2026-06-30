import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { rmSync } from "fs";
import { closeDb } from "@/lib/intel/db";
import {
  upsertRecalls,
  upsertShortages,
  getRecalls,
  getShortages,
  getFeedMeta,
  PARSER_VERSION,
  EXTRACTION_METHOD,
} from "@/lib/intel/openfda/store";
import type { OpenfdaEnforcementRecall, OpenfdaShortage } from "@/lib/intel/openfda/types";

const TEST_DB = ".data/test-openfda-store.db";

process.env.CDSCO_DB_PATH = TEST_DB;

function makeRecall(overrides: Partial<OpenfdaEnforcementRecall> = {}): Omit<OpenfdaEnforcementRecall, "id"> {
  return {
    recallNumber: "R-001",
    eventId: "E-001",
    productDescription: "Test Tablets 10 mg",
    codeInfo: "NDC 12345-678-90",
    recallingFirm: "Test Pharma Inc",
    reasonForRecall: "Failed dissolution specification",
    classification: "Class II",
    status: "Ongoing",
    distributionPattern: "Nationwide",
    productQuantity: "5,000 bottles",
    country: "US",
    reportDate: "2026-06-01",
    recallInitiationDate: "2026-05-15",
    sourceUrl: "https://api.fda.gov/drug/enforcement.json",
    listingUrl: "https://www.fda.gov/drugs/drug-safety-and-availability/drug-recalls",
    retrievedAt: new Date().toISOString(),
    parserVersion: PARSER_VERSION,
    extractionMethod: EXTRACTION_METHOD,
    extractionPrompt: null,
    rawExtractionLog: null,
    ...overrides,
  };
}

function makeShortage(overrides: Partial<OpenfdaShortage> = {}): Omit<OpenfdaShortage, "id"> {
  return {
    drugName: "Testamine",
    genericName: "testamine",
    companyName: "Generic Labs",
    therapeuticCategory: "Cardiovascular",
    shortageReason: "Manufacturing delay",
    presentation: "Injection, 10 mg/mL",
    status: "Current",
    updateDate: "2026-06-01",
    dosageForm: "Injection",
    relatedInfo: "See FDA page for updates",
    sourceUrl: "https://api.fda.gov/drug/shortages.json",
    listingUrl: "https://www.fda.gov/drugs/drug-shortages",
    retrievedAt: new Date().toISOString(),
    parserVersion: PARSER_VERSION,
    extractionMethod: EXTRACTION_METHOD,
    extractionPrompt: null,
    rawExtractionLog: null,
    ...overrides,
  };
}

describe("openfda store", () => {
  beforeEach(() => {
    closeDb();
    try {
      rmSync(TEST_DB, { force: true });
    } catch {
      // ignore
    }
  });

  afterEach(() => {
    closeDb();
    try {
      rmSync(TEST_DB, { force: true });
    } catch {
      // ignore
    }
  });

  it("upserts recalls idempotently by content hash", () => {
    const r = makeRecall();
    const first = upsertRecalls([r]);
    expect(first.recordsFound).toBe(1);
    expect(first.recordsInserted).toBe(1);
    expect(first.recordsUpdated).toBe(0);

    const second = upsertRecalls([r]);
    expect(second.recordsInserted).toBe(0);
    expect(second.recordsUpdated).toBe(1);
  });

  it("filters recalls by classification and status", () => {
    upsertRecalls([
      makeRecall({ recallNumber: "R-A", classification: "Class I", status: "Ongoing" }),
      makeRecall({ recallNumber: "R-B", classification: "Class II", status: "Completed" }),
      makeRecall({ recallNumber: "R-C", classification: "Class I", status: "Completed" }),
    ]);

    const classI = getRecalls({ classification: "Class I" });
    expect(classI).toHaveLength(2);
    expect(classI.every((r) => r.classification === "Class I")).toBe(true);

    const completed = getRecalls({ status: "Completed" });
    expect(completed).toHaveLength(2);

    const both = getRecalls({ classification: "Class I", status: "Completed" });
    expect(both).toHaveLength(1);
    expect(both[0]?.recallNumber).toBe("R-C");
  });

  it("upserts shortages idempotently by content hash", () => {
    const s = makeShortage();
    const first = upsertShortages([s]);
    expect(first.recordsFound).toBe(1);
    expect(first.recordsInserted).toBe(1);

    const second = upsertShortages([s]);
    expect(second.recordsInserted).toBe(0);
    expect(second.recordsUpdated).toBe(1);
  });

  it("returns combined metadata", () => {
    upsertRecalls([makeRecall({ recallNumber: "R-1" })]);
    upsertShortages([makeShortage({ drugName: "Drug A" })]);

    const meta = getFeedMeta();
    expect(meta.totalRecalls).toBe(1);
    expect(meta.totalShortages).toBe(1);
    expect(meta.latestRetrievedAt).not.toBeNull();
    expect(meta.recallClassifications).toContain("Class II");
    expect(meta.shortageStatuses).toContain("Current");
  });
});
