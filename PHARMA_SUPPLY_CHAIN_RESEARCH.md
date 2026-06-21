# Pharmaceutical Supply-Chain Problems: India & Global — Research Report

**Prepared for:** Provenra product roadmap
**Date:** June 2026
**Method:** Multi-agent deep-research harness (114 agents, 31 sources fetched, 124 claims extracted, 25 adversarially fact-checked with 3-vote verification → 23 confirmed / 2 refuted), supplemented by a targeted second research round to close gaps the harness flagged as unverified.

> **How to read confidence tags**
> - ✅ **Verified** — survived 3-vote adversarial fact-checking (independent agents tried to *refute* it; ≥2/3 had to fail to refute).
> - 🔎 **Sourced** — gathered in the gap-filling round from named sources, not put through the adversarial gauntlet.
> - ⚠️ **Historical** — true but from older datasets; treat as a baseline, not a present-day rate.

---

## Executive summary

Pharma supply-chain dysfunction — India-centric, with direct global parallels — clusters into **four problem domains that map one-to-one onto Provenra's four modules**:

| Domain | Headline finding | Maps to module |
|--------|------------------|----------------|
| **Quality & counterfeit** | In India, **substandard (NSQ) drugs are a far bigger problem than counterfeits** — ~3–7% NSQ vs <0.05% spurious. CDSCO still flags ~150+ failing batches *monthly*. | Track & Trace |
| **Cold chain** | Temperature excursions (especially **freezing**) are pervasive and **invisible to manual logbooks**, which caught only **5.6%** of real deviations. | Cold Chain |
| **Drug shortages** | Structural, concentrated in **single-source sterile injectables**; in India compounded by **~70% API dependence on China** and **price-cap-driven unprofitability**. | Shortage & Inventory |
| **Recall & compliance** | India has **no mandatory nationwide recall law** ("a most serious lacuna") and a **fragmented** CDSCO-vs-36-states regulator. | Recall & Compliance |

The strategic backdrop: India is the **"pharmacy to the world"** — **>9 in 10 US prescriptions are generics** and India is a critical supplier (~20% of global generic volume, ~60% of global vaccine volume). That makes its traceability and quality gaps a *global* patient-safety issue, and makes software that closes them commercially valuable to exporters facing US/EU buyer scrutiny.

**The single biggest product insight:** the dominant India risk is **not** James-Bond counterfeiting — it's **quality failures (NSQ) and silent cold-chain damage that no one detects in time, in a system with no enforceable way to pull a bad batch nationwide.** Provenra should weight **NSQ/quality-alert ingestion, freeze detection, single-source risk, and cross-state batch recall** at least as highly as anti-counterfeit serialization.

---

## 1. Counterfeit, spurious & substandard (NSQ) medicines

### What the data says
- ✅⚠️ **Substandard ≫ counterfeit in India.** CDSCO's 2009 nationwide survey (24,136 samples, 62 brands) found **11 spurious (0.046%)** vs **1,146 substandard (4.75%)**. Trend data: 1995–96 = 10.64% substandard / 0.30% spurious; 2007–08 = 6.42% / 0.16%. The 2014–16 national survey (47,012 samples) found **3.16% NSQ vs 0.0245% spurious**.
  *Sources: [IJPS systematic review](https://www.ijpsonline.com/articles/current-scenario-of-spurious-and-substandard-medicines-in-india-a-systematic-review.html); [Thakur/Reddy CDSCO reform report](https://dineshthakur.com/wp-content/uploads/2016/06/CDSCO-Reform.pdf)*
- ✅ **NSQ is still an active, current problem.** CDSCO's **December 2025** monthly sweep declared **167 samples NSQ** (74 central labs, 93 state labs) plus **7 spurious** drugs — including widely sold brands (Telma-AM, Telma 40, Montina-L, Pantop-D, Chymoral Forte).
  *Source: [India Med Today](https://indiamedtoday.com/cdsco-flags-7-spurious-drugs-167-batches-fail-quality-tests-in-december-sweep/) (reporting CDSCO portal data; corroborated by The Tribune, Business Standard)*
- 🔎 **Global frame:** WHO estimates ~1 in 10 medical products in low- and middle-income countries is substandard or falsified.

### What software can do
- Ingest **CDSCO monthly NSQ/spurious drug-alert feeds** and auto-match against held inventory by **batch number** → instant quarantine/recall workflow.
- Treat **batch-level quality surveillance** as a first-class signal alongside unit serialization.
- Surface NSQ history **by manufacturer/site** to feed supplier risk scoring.

---

## 2. Serialization & track-and-trace

### What the data says
- ✅ **India's QR/barcode mandate** was notified via **GSR 823(E) dated 17 Nov 2022** (Drugs (8th Amendment) Rules 2022), inserting **Schedule H2** and requiring QR/barcodes on the **top-300 drug brands** (Dolo, Allegra, Saridon, Corex, etc.) for all batches **manufactured on/after 1 Aug 2023**. Encoded fields: unique product ID, generic + brand name, manufacturer, batch no., mfg & expiry dates, manufacturing licence no.
  *Source: [The Health Master](https://thehealthmaster.com/2023/07/27/bar-code-or-qr-code-for-300-brand/)*
- ✅ **Exports:** India's drug-export verification is moving from **DAVA** (Drug Authentication and Verification Application) to **iVEDA** (Integrated Validation of Exports of Drugs from India and its Authentication); go-live repeatedly slipped.
  *Source: [SecuringIndustry](https://www.securingindustry.com/pharmaceuticals/india-deadline-for-drug-export-track-and-trace-slips-again/s40/a11604/)*
- ✅ **The gap:** the mandate covers **only the top-300 brands at pack level** — **most domestic supply still has no unit-level traceability**, and aggregation (unit→carton→case→pallet) is inconsistent.

### International benchmarks (🔎)
- **US DSCSA:** the 1-year **stabilization period ended 27 Nov 2024**. After stakeholder pushback, FDA issued exemptions (**9 Oct 2024**) staggering enforcement: **manufacturers 27 May 2025**, **wholesale distributors 27 Aug 2025**, **dispensers (26+ FTEs) 27 Nov 2025**, **small dispensers (≤25 FTEs) 27 Nov 2026**. All partners must exchange **T3 data** (Transaction Info/History/Statement) electronically, typically via **EPCIS**.
  *Sources: [FDA stabilization policy](https://www.fda.gov/drugs/drug-safety-and-availability/dscsa-compliance-policies-establish-1-year-stabilization-period-implementing-electronic-systems); [DLA Piper](https://www.dlapiper.com/en/insights/publications/2025/01/certain-dscsa-deadline-extensions-set-to-eclipse-in-2025)*
- **EU FMD:** 2D DataMatrix + anti-tamper, verified against the **EMVS** hub at the point of dispense.

### What software can do
- Native **GS1 / EPCIS** support; ingest Schedule H2 QR data **and** iVEDA export records.
- Offer **unit-level traceability for the 99% of domestic SKUs the mandate skips** — a concrete product opportunity.
- **Aggregation hierarchy** + **hash-chained chain-of-custody** as tamper-evidence.

---

## 3. Cold chain

### What the data says
- ✅ **Excursions are pervasive and freeze-dominated.** A 3-state study (Bihar, Gujarat, Kerala; 213 facilities; 2014–15 dataloggers) found vaccines exposed to **<0°C for 14.8% of storage time** (up to 18% at sub-district level) and **>8°C for 6.6%**.
- ✅ **Manual monitoring misses almost everything.** Logbooks captured deviations in only **5.6%** of devices — i.e. **~95% of real excursions went unrecorded**. ~**65% of DPT vials** showed freeze damage across 10 states (ICMR/Bull WHO 2013).
  *Sources: [PMC7268609](https://pmc.ncbi.nlm.nih.gov/articles/PMC7268609/); [OUP TRSTMH](https://academic.oup.com/trstmh/article/117/4/310/6947808)*
- ✅ **Digital systems work.** India's **eVIN** (smartphone stock digitization + remote temp monitoring + auto-alerts) cut facilities-with-stockouts from **37.8% → 26.3%** (30.4% relative, p<0.001) and saved **~90 million doses**. Modeled spoilage cost from ice-based carriers ≈ **US$9.6M**. *(Pre-post observational — association, not proven causation.)*
  *Source: [PMC7643996](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7643996/)*

### What software can do
- **Continuous IoT datalogging with automated excursion alerts** — the whole point, since manual logs miss ~95%.
- **Freeze-event detection** as a first-class alert (not just heat) — freezing silently destroys DPT, Hep-B, insulin.
- **Mean Kinetic Temperature (MKT)** to judge cumulative thermal stress, plus a stability-budget / disposition decision (release vs quarantine).

---

## 4. Drug shortages & inventory risk

### What the data says
- ✅ **Structural, single-source, injectable-concentrated.** US FDA recorded only **15 new shortages in CY2024** (vs a **251 peak in 2011**) and **prevented 283**. Sterile **injectables are ~69%** of shortages and last ~2× longer; **~40% of generic markets have a single manufacturer**.
  *Source: [FDA Report to Congress, Drug Shortages CY2024](https://www.fda.gov/media/189325/download)*
- 🔎 **India's API dependence on China.** ~**70%** of India's bulk-drug imports come from China; **antibiotics 87%**; in FY24, **Penicillin-G 77%** and **6-APA 94.1%** Chinese-sourced. The **PLI scheme** (₹6,940 cr, 41 KSMs) had spurred **38 critical APIs** domestically by Mar 2025, but Chinese imports keep growing (and China has cut API prices below cost to undercut new Indian capacity).
  *Sources: [ORF](https://www.orfonline.org/expert-speak/india-s-rise-as-global-pharmacy-masks-deep-dependence-on-china); [Policy Circle](https://www.policycircle.org/industry/apis-import-depencence-on-china/)*
- 🔎 **Price control → unprofitability → withdrawal.** A *Journal of Marketing* study of **179 DPCO-2013-regulated oral solids** found availability **declined** vs unregulated peers — firms cut marketing on price-capped drugs and shifted to unregulated alternatives. NPPA now receives manufacturer applications to **discontinue formulations as "unviable."**
  *Source: [Business Today](https://www.businesstoday.in/industry/pharma/story/indias-drug-price-regulation-leads-to-decline-in-availability-of-essential-medicines-study-finds-435219-2024-06-30)*
- 🔎 **EU** medicine shortages hit record highs in 2023–2024.

### What software can do
- Model **supplier concentration / single-source risk**, **lead times**, and **dosage-form vulnerability** (flag sterile injectables) as core shortage signals.
- Track **API/KSM sourcing geography** → a **geopolitical-concentration risk score** (e.g. "this SKU's API is 94% China-sourced").
- Flag **NLEM/DPCO price-capped + low-margin** SKUs as withdrawal/shortage risks.
- Demand forecasting + FEFO to cut the *other* waste: expiry.

---

## 5. Recalls & quality failures

### What the data says
- 🔎 **The toxic cough-syrup tragedies — recurring.**
  - **2022:** WHO linked **~70 Gambian child deaths** to four syrups by **Maiden Pharmaceuticals** (Haryana) contaminated with diethylene/ethylene glycol (DEG/EG).
  - **2022–23:** **65 child deaths in Uzbekistan** linked to **Dok-1 Max** by **Marion Biotech** (Noida).
  - **2025:** at least **17+ children** (Chhindwara, Madhya Pradesh) died of renal failure from **Coldrif** syrup (**Sresan Pharmaceutical**, Tamil Nadu) found to contain **~48.6% DEG**; also implicated: **Respifresh TR**, **ReLife**. WHO issued an alert (Oct 2025); the manufacturer's owner was arrested.
  - **Cumulative:** **>300 deaths across ≥7 countries since Sept 2022**, mostly children under five — traced to cheap industrial-grade glycol substituted for pharma-grade, i.e. an **uncontrolled excipient / raw-material testing failure**.
  *Sources: [Health Policy Watch](https://healthpolicy-watch.news/toxic-cough-syrup-weak-oversight-indias-unending-drug-safety-crisis/); [CNN](https://www.cnn.com/2025/10/14/world/who-warning-contaminated-cough-syrup-india-deaths-intl-hnk); [Wikipedia: 2025 India cough syrup crisis](https://en.wikipedia.org/wiki/2025_India_cough_syrup_crisis)*
- ✅ **No mandatory nationwide recall mechanism.** "India does not have a nationwide drug recall system… no mechanism to ensure nationwide withdrawal of a bad batch… **a most serious lacuna**." A batch failing a test in one state has no enforceable nationwide pull-back.
  *Source: [Thakur/Reddy](https://dineshthakur.com/wp-content/uploads/2016/06/CDSCO-Reform.pdf); [Drishti Judiciary](https://www.drishtijudiciary.com/editorial/the-lack-of-a-drug-recall-law-in-india)*
- 🔎 **Schedule M revised GMP** notified **28 Dec 2023**; large units had ~6 months, **MSMEs (turnover <₹250 cr) extended to 31 Dec 2025** (must file an upgrade plan in **Form A**). As of **late Dec 2025, only ~26% (≈1,700 of ~8,500) MSME units** had even submitted a gap analysis; CDSCO ordered **mandatory inspections from 1 Jan 2026**.
  *Sources: [India Briefing](https://www.india-briefing.com/news/india-extends-gmp-compliance-deadline-to-december-2025-35679.html/); [Business Standard](https://www.business-standard.com/industry/news/only-one-fourth-msme-drugmakers-comply-gmp-schedule-m-india-125122500521_1.html)*

### What software can do
- **Excipient / raw-material genealogy** — track glycol grade & supplier CoA per batch; block release without a passing DEG/EG test. *(Directly addresses the cough-syrup root cause.)*
- **Operationalize de-facto nationwide recall** via cross-state batch traceability + automated multi-stakeholder notification — filling the legal void.
- **Schedule M GMP-readiness tracker** per manufacturing site (gap analysis, Form A status, inspection dates).
- Recall classification (Class I/II/III), retrieval-rate tracking, effectiveness checks.

---

## 6. Regulatory & structural issues

### What the data says
- ✅ **Fragmented regulator.** No legal hierarchy between central **CDSCO** and **~36 state drug regulatory authorities** — "health" is a **State List** subject, so both function autonomously and "there is no single entity ultimately responsible." A maker licensed by one lax state can sell nationwide.
  *Sources: [ICRIER WP309](https://icrier.org/pdf/Working_Paper_309.pdf); [Thakur/Reddy](https://dineshthakur.com/wp-content/uploads/2016/06/CDSCO-Reform.pdf)*
- ✅ **High stakes — "pharmacy to the world."** FDA (Oct 2023): for the US, "**more than nine out of ten prescriptions dispensed are generic**" and India is a critical supplier; India ≈ 20% of global generics and ~60% of global vaccine volume.
  *Source: [FDA Voices](https://www.fda.gov/news-events/fda-voices/indias-unique-opportunity-and-important-responsibility-pharmacy-world)*
- 🔎 **Fragmented distribution:** manufacturer → C&F agent → stockist → sub-stockist → **~900,000 retail pharmacies**, with limited downstream visibility and inconsistent IT.

### What software can do
- Be **the unified, cross-state data layer the regulatory system itself lacks** — aggregate multi-jurisdiction licence/quality/recall data into one view.
- **Distribution-tier visibility** (C&F → stockist → sub-stockist → retail) to find where stock and traceability break down.

---

## 7. Other systemic issues (🔎)

- **API/raw-material geopolitical risk** (covered in §4) — concentration in a single country is the macro supply risk.
- **Expiry & wastage** — FEFO discipline; expiry-loss is a large, addressable cost separate from spoilage.
- **Diversion & theft / parallel trade** — detectable via chain-of-custody anomalies (impossible geo-jumps, duplicate scans).
- **Fragmented IT / no interoperability** — the case for EPCIS-based standards and an aggregation layer.
- **Emerging tech** — India's "Pharma 4.0" agenda (AI/ML demand forecasting, blockchain provenance pilots); QR-code authentication has known weaknesses (copyable codes) prompting interest in NFC/crypto-anchored alternatives.

---

## Refuted claims (excluded for honesty)

The adversarial verification **killed** two plausible-sounding claims — included here so they're not repeated:
1. ❌ "Ice-based vaccine carriers have a 25% spoilage rate vs 10% for iceless carriers." (vote 1–2; not supported by the cited paper.)
2. ❌ A specific iVEDA "April→October 2020" deadline-extension detail. (vote 1–2; could not be confirmed.)

**Caveats:** Much of the strongest India NSQ/cold-chain data is **historical** (1995–2016 surveys; 2010–15 fieldwork) and predates eVIN and the 2023 Schedule M revision — cite as baselines. eVIN's stockout/dose figures are **observational** (association, not proven causation). Regulatory-structure findings draw on credible policy/advocacy analyses (ICRIER; Thakur/Reddy). Serialization and Dec-2025 NSQ figures rest on reputable trade/news outlets relaying primary gazette/CDSCO data.

---

## Findings → Provenra product roadmap

| # | Research finding | Concrete feature |
|---|------------------|------------------|
| P1 | NSQ ≫ counterfeit; CDSCO flags ~167 batches/month | **CDSCO Drug-Alert ingestion** → auto-match held batches → quarantine. **NSQ Watch** module. |
| P2 | Manual logs miss ~95% of excursions; freezing is the silent killer | **Freeze-event detection** + continuous IoT logging + MKT (already present — extend with freeze alerts). |
| P3 | Shortages = single-source injectables + 70% China API | **Supplier-concentration / single-source risk** + **API geo-dependency score** in Shortage module. |
| P4 | No nationwide recall law | **Cross-state recall orchestration** + stakeholder notification (extend Recall module). |
| P5 | Cough-syrup DEG deaths = excipient testing failure | **Excipient / raw-material genealogy** with CoA + DEG/EG gating. |
| P6 | Schedule M MSME deadline; only 26% ready | **GMP-readiness tracker** per site (gap analysis, Form A, inspection). |
| P7 | Fragmented C&F→stockist→retail chain | **Distribution-tier visibility** view. |
| P8 | DSCSA/EU FMD/EPCIS international rails | **Multi-market compliance** matrix (already present — enrich with real deadlines). |

> Items implemented in the accompanying Provenra update: **P1 (NSQ Watch), P3 (API geo-risk + single-source), P5 (excipient genealogy signal), P6 (GMP-readiness), P4 (cross-state recall), P8 (real DSCSA dates)** — see the app changelog / commit.

---

### Primary source list
WHO; CDSCO (via India Med Today, The Tribune); IJPS systematic review; Thakur/Reddy CDSCO-reform report; ICRIER WP309; US FDA (Drug Shortages CY2024 report; FDA Voices); PMC7268609 & OUP TRSTMH (cold chain); PMC7643996 (eVIN); ORF & Policy Circle (China API); Business Today (DPCO study); Health Policy Watch, CNN, Wikipedia (cough-syrup crisis); India Briefing & Business Standard (Schedule M); DLA Piper & FDA (DSCSA). Full URLs inline above.
