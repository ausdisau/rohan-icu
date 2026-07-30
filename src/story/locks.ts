/**
 * Narration lock lint — reject LLM/director text that invents clinical truth
 * or violates educational / chronology / representation boundaries.
 */

import { lintContinuityText, type ContinuityFinding } from "@/schemas/continuity";

import type { NarrationViewModel, StoryDirectorCompactSnapshot } from "./types";

const DOSE_OR_ENERGY =
  /\b(\d+(\.\d+)?\s?(mg|mcg|µg|joules?|j\b|ml\/kg)|shock\s+at|defibrillat\w*\s+at\s+\d)/i;

const VENT_SETTINGS =
  /\b(peep|fio2|fiO2|tidal\s+volume|pip|pressure\s+support)\s*[:=]?\s*\d/i;

const GESTURE_CPR = /\b(gesture|mime|pretend|simulated)\s+cpr\b/i;

const FAMILY_CLINICAL =
  /\b(samira|arvind|leela|parents?|family)\b.{0,50}\b(compress|suction|ventilat|shock|intubat|replace\s+airway|interpret\s+aac\s+clinically)\b/i;

export interface NarrationLockResult {
  ok: boolean;
  findings: ContinuityFinding[];
}

function collectNarrationText(view: Pick<
  NarrationViewModel,
  "summary" | "dialogue" | "captions" | "framingNotes"
>): string {
  return [
    view.summary,
    ...view.dialogue.map((line) => `${line.speaker}: ${line.line}`),
    ...view.captions,
    ...view.framingNotes,
  ].join("\n");
}

/**
 * Validate narration does not invent vitals that contradict the compact snapshot.
 * Allows mentioning the same values; blocks contradictory pulse/rhythm claims.
 */
export function lintNarrationAgainstCompact(
  text: string,
  compact: StoryDirectorCompactSnapshot,
  path = "narration",
): ContinuityFinding[] {
  const findings: ContinuityFinding[] = [];
  const lower = text.toLowerCase();

  if (
    compact.pulse === "fragile" &&
    /\bpulse\b.{0,40}\b(strong|bounding|absent)\b/i.test(text)
  ) {
    findings.push({
      ruleId: "narration-pulse-contradiction",
      severity: "error",
      message: "Narration contradicts engine pulse (fragile).",
      path,
    });
  }
  if (
    compact.pulse === "absent" &&
    /\bpulse\b.{0,40}\b(present|strong|stable)\b/i.test(text) &&
    !/provisional/i.test(text)
  ) {
    findings.push({
      ruleId: "narration-pulse-absent-contradiction",
      severity: "error",
      message: "Narration contradicts engine pulse (absent).",
      path,
    });
  }
  if (
    !compact.defibrillatorReady &&
    /\b(shock(ed|ing)?|deliver(ed|ing)?\s+(a\s+)?shock)\b/i.test(text)
  ) {
    findings.push({
      ruleId: "narration-shock-without-readiness-claim",
      severity: "error",
      message:
        "Narration must not deliver a shock narrative; readiness is not indication and no energies are shown.",
      path,
    });
  }
  if (
    compact.aacInstruction === "WAIT" &&
    /\b(ignored?\s+wait|wait\s+means?\s+yes|silence\s+is\s+consent)\b/i.test(
      text,
    )
  ) {
    findings.push({
      ruleId: "narration-wait-violation",
      severity: "error",
      message: "Narration must not reinterpret WAIT as consent or ignore it.",
      path,
    });
  }

  // Soft check: if narration invents numeric joules/mg anywhere
  if (DOSE_OR_ENERGY.test(text) || lower.includes("joule")) {
    if (DOSE_OR_ENERGY.test(text)) {
      findings.push({
        ruleId: "narration-dose-or-energy",
        severity: "error",
        message: "Narration must not include medication doses or shock energy.",
        path,
        excerpt: text.match(DOSE_OR_ENERGY)?.[0],
      });
    }
  }

  if (VENT_SETTINGS.test(text)) {
    findings.push({
      ruleId: "narration-vent-settings",
      severity: "error",
      message: "Narration must not include ventilator setting numbers.",
      path,
    });
  }

  if (GESTURE_CPR.test(text)) {
    findings.push({
      ruleId: "narration-gesture-cpr",
      severity: "error",
      message: "Narration must not include gesture CPR.",
      path,
    });
  }

  if (FAMILY_CLINICAL.test(text)) {
    findings.push({
      ruleId: "narration-family-clinical",
      severity: "error",
      message: "Narration must not assign family to clinical tasks.",
      path,
    });
  }

  return findings;
}

export function lintNarrationViewModel(
  view: NarrationViewModel,
  compact: StoryDirectorCompactSnapshot,
  path = "narration",
): NarrationLockResult {
  const text = collectNarrationText(view);
  const findings: ContinuityFinding[] = [
    ...lintContinuityText({ path, text, meta: { mentionsAac: /\baac\b/i.test(text) } }),
    ...lintNarrationAgainstCompact(text, compact, path),
  ];

  if (view.clinicalTruthUnchanged !== true) {
    findings.push({
      ruleId: "narration-clinical-truth-flag",
      severity: "error",
      message: "NarrationViewModel must keep clinicalTruthUnchanged === true.",
      path,
    });
  }

  return { ok: findings.length === 0, findings };
}
