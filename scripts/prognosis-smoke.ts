/**
 * Smoke checks for prognosis bands — no survival-score language.
 * Run: npx tsx scripts/prognosis-smoke.ts
 */
import assert from "node:assert/strict";

import {
  buildPrognosisReport,
  buildPrognosisSummary,
  outlookBandForDomain,
} from "../src/engine/prognosis";
import { createInitialSimulationState } from "../src/types/simulation";

function main() {
  const fragileRenal = createInitialSimulationState({
    renalReserve: 28,
    infectionControl: 70,
  });
  const report = buildPrognosisReport(fragileRenal, {
    renalReserve: -15,
    infectionControl: 12,
  });

  assert.ok(report.groups.length === 5, "expected five prognosis groups");
  assert.ok(
    report.disclaimer.toLowerCase().includes("not a survival score"),
    "disclaimer must reject survival scoring",
  );

  const infectionGroup = report.groups.find((g) => g.id === "infection-renal");
  assert.ok(infectionGroup, "infection-renal group required");
  assert.match(
    infectionGroup.summary,
    /renal|infection|trade-off/i,
    "infection–renal summary should name the trade-off",
  );

  const lines = buildPrognosisSummary(fragileRenal, {
    renalReserve: -15,
    infectionControl: 12,
  });
  assert.ok(lines.length >= 1 && lines.length <= 3, "1–3 summary lines");
  for (const line of lines) {
    assert.doesNotMatch(
      line,
      /\b(survival|mortality)\s*%|\b%\s*chance\b|\bwill\s+(walk|extubat)/i,
      `forbidden survival/victory language: ${line}`,
    );
  }

  assert.equal(
    outlookBandForDomain("airwayObstructionRisk", 80, 10),
    "worsening",
  );
  assert.equal(
    outlookBandForDomain("communicationAccess", 75, 12),
    "improving",
  );

  console.log("prognosis-smoke passed.");
}

main();
