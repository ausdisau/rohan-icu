/**
 * Phase 7 — Code Blue six-dimension debrief scoring + pathway tags.
 * Engine-owned; story/LLM never author clinical scores.
 */

import type { CodeBlueDebriefFile } from "@/schemas/code-blue";

import type { CodeBluePlaySession } from "./code-blue-session";
import type { ScoreState, SimulationEvent } from "./types";

export type CodeBlueDimensionId =
  | "clinical-reasoning"
  | "timing-coordination"
  | "equipment-reasoning"
  | "communication-access"
  | "authority-dignity"
  | "system-sustainability";

export interface CodeBlueDimensionScore {
  id: CodeBlueDimensionId;
  label: string;
  score: number;
  max: number;
  notes: string[];
}

export interface CodeBlueDebriefResult {
  episodeId: string;
  completed: boolean;
  noSinglePerfectPath: true;
  dimensions: CodeBlueDimensionScore[];
  score: ScoreState;
  debriefTags: string[];
  reflectionPrompts: string[];
  whatNoticed: string[];
  whatMissed: string[];
  pathwaySummary: string;
  eventLog: SimulationEvent[];
  committedActionIds: string[];
  firedEvents: string[];
}

const DIMENSION_LABELS: Record<CodeBlueDimensionId, string> = {
  "clinical-reasoning": "Clinical reasoning",
  "timing-coordination": "Timing & coordination",
  "equipment-reasoning": "Equipment reasoning",
  "communication-access": "Communication access",
  "authority-dignity": "Authority & dignity",
  "system-sustainability": "System sustainability",
};

const G1_ACTIONS = [
  "assess-borrowed-circuit",
  "assign-suction-bedside-reserve",
  "assign-paid-support-continuity",
] as const;

const SCORE_MAX = 12;

function clampScore(value: number): number {
  return Math.max(0, Math.min(SCORE_MAX, value));
}

function hasAction(session: CodeBluePlaySession, id: string): boolean {
  return session.committedActionIds.includes(id);
}

function g1Count(session: CodeBluePlaySession): number {
  return G1_ACTIONS.filter((id) => hasAction(session, id)).length;
}

function fired(session: CodeBluePlaySession, id: string): boolean {
  return session.firedEvents.includes(id);
}

/**
 * Derive six-dimension scores from committed pathway + authority/crisis flags.
 * Partial G1, H5 path, and AAC restore each move different axes — no perfect badge.
 */
export function scoreCodeBlueSession(session: CodeBluePlaySession): ScoreState {
  const authority = session.richState.authority;
  const aac = session.richState.domains.communicationAccess;
  const g1 = g1Count(session);
  const h5 = fired(session, "h5-emergency-override") ||
    session.richState.playPhase === "emergency-override" ||
    session.firedEvents.some((id) => id.includes("h5"));
  const aacRestored =
    Boolean(session.richState.flags.aacRestoredAfterRescue) ||
    session.richState.eventLog.some((e) => e.kind === "aac-restored");
  const roscConfirmed =
    session.richState.domains.circulation.rosCConfirmedIndependently;
  const reassessDone = Boolean(session.richState.flags.postRoscReassessmentDone);
  const protectAac = hasAction(session, "protect-aac");
  const prepareDefib = hasAction(session, "prepare-defibrillator");
  const assessChest = hasAction(session, "assess-chest-movement");
  const correctCircuit = hasAction(session, "correct-external-circuit-load");
  const paidSupport = hasAction(session, "assign-paid-support-continuity");

  let clinical = 2;
  let timing = 2;
  let equipment = 2;
  let communication = 2;
  let dignity = 4;
  let system = 2;

  if (assessChest) clinical += 2;
  if (correctCircuit) clinical += 2;
  if (g1 >= 1) clinical += 1;
  if (g1 >= 2) clinical += 1;
  if (g1 === 3) clinical += 1;
  if (roscConfirmed) clinical += 2;
  if (reassessDone) clinical += 1;

  if (fired(session, "intermittent-monitor-alarm")) timing += 2;
  if (h5) timing += 2;
  if (prepareDefib) timing += 1;
  if (roscConfirmed && reassessDone) timing += 2;
  if (session.completed) timing += 1;

  if (hasAction(session, "assess-borrowed-circuit")) equipment += 3;
  if (hasAction(session, "assign-suction-bedside-reserve")) equipment += 3;
  if (prepareDefib) equipment += 2;
  if (correctCircuit) equipment += 1;
  // Partial G1 still scores — no perfect-path bonus for completing all three.
  if (g1 > 0 && g1 < 3) equipment += 1;

  if (protectAac) communication += 3;
  if (aacRestored) communication += 3;
  if (aac.currentInstruction === "WAIT" || aac.currentInstruction === "STOP") {
    communication += 1;
  }
  if (paidSupport) communication += 1;
  if (authority.labelledSlowAsIncapacity) communication -= 3;
  if (authority.ignoredWaitOrStop) communication -= 3;

  if (authority.treatedSilenceAsConsent) dignity -= 3;
  if (authority.ignoredWaitOrStop) dignity -= 2;
  if (authority.usedFamilyAsClinicalWorkforce) dignity -= 4;
  if (authority.labelledSlowAsIncapacity) dignity -= 2;
  if (protectAac) dignity += 2;
  if (aacRestored) dignity += 2;
  if (paidSupport) dignity += 1;
  if (!authority.usedFamilyAsClinicalWorkforce) dignity += 1;

  if (paidSupport) system += 4;
  if (hasAction(session, "assign-suction-bedside-reserve")) system += 2;
  if (g1 >= 2) system += 2;
  if (!authority.usedFamilyAsClinicalWorkforce) system += 2;
  if (session.richState.crisisDebt.level === "extreme") system -= 2;
  if (session.richState.crisisDebt.level === "critical") system -= 1;

  // Blend any live engine score increments (authority hits already applied).
  const live = session.richState.score;
  return {
    clinicalReasoning: clampScore(Math.max(clinical, live.clinicalReasoning)),
    timingCoordination: clampScore(Math.max(timing, live.timingCoordination)),
    equipmentReasoning: clampScore(Math.max(equipment, live.equipmentReasoning)),
    communicationAccess: clampScore(
      Math.max(communication, live.communicationAccess),
    ),
    authorityDignity: clampScore(
      Math.max(0, Math.min(SCORE_MAX, dignity + live.authorityDignity)),
    ),
    systemSustainability: clampScore(
      Math.max(system, live.systemSustainability),
    ),
  };
}

export function collectCodeBlueDebriefTags(
  session: CodeBluePlaySession,
  catalogTags: string[],
): string[] {
  const tags = new Set<string>();
  tags.add("no-single-perfect-path");
  tags.add("alarm-as-question");
  tags.add("readiness-not-indication");

  const g1 = g1Count(session);
  if (g1 > 0) tags.add("G1-partial-bundles");
  if (
    fired(session, "h5-emergency-override") ||
    session.richState.eventLog.some((e) => e.kind === "emergency-override")
  ) {
    tags.add("H5-emergency-override");
  }
  if (session.richState.domains.circulation.provisionalRosc) {
    tags.add("provisional-rosc");
  }
  if (
    session.richState.eventLog.some((e) => e.kind === "aac-restored") ||
    session.richState.flags.aacRestoredAfterRescue
  ) {
    tags.add("aac-restore");
  }
  if (!session.richState.authority.usedFamilyAsClinicalWorkforce) {
    tags.add("family-non-clinical");
  }
  if (hasAction(session, "assign-paid-support-continuity")) {
    tags.add("paid-support-sustainability");
    tags.add("save-our-sons");
  }

  return catalogTags.filter((tag) => tags.has(tag) || tag === "no-single-perfect-path");
}

function dimensionNotes(
  id: CodeBlueDimensionId,
  session: CodeBluePlaySession,
  score: number,
): string[] {
  const notes: string[] = [];
  const g1 = g1Count(session);
  switch (id) {
    case "clinical-reasoning":
      if (g1 > 0) {
        notes.push(
          `G1 pathway committed ${g1}/3 bundle actions — partial bundles are valid.`,
        );
      }
      if (session.richState.domains.circulation.rosCConfirmedIndependently) {
        notes.push("Independent ROSC confirmation recorded.");
      } else if (session.richState.domains.circulation.provisionalRosc) {
        notes.push("Provisional ROSC still needs independent confirmation.");
      }
      break;
    case "timing-coordination":
      if (fired(session, "intermittent-monitor-alarm")) {
        notes.push("Intermittent alarm treated as an open question, not a settled fact.");
      }
      if (fired(session, "h5-emergency-override")) {
        notes.push("H5 emergency override path entered when pressure rose.");
      }
      break;
    case "equipment-reasoning":
      if (hasAction(session, "assess-borrowed-circuit")) {
        notes.push("Borrowed circuit assessed as conditional backup — readiness ≠ indication.");
      }
      if (hasAction(session, "assign-suction-bedside-reserve")) {
        notes.push("Degraded suction assigned to bedside reserve (not dual-assigned).");
      }
      if (g1 > 0 && g1 < 3) {
        notes.push("Partial equipment bundle — no perfect-path penalty or badge.");
      }
      break;
    case "communication-access":
      if (hasAction(session, "protect-aac")) {
        notes.push("AAC protection committed before / during pressure.");
      }
      if (session.richState.eventLog.some((e) => e.kind === "aac-restored")) {
        notes.push("AAC restored after rescue — silence still is not consent.");
      } else if (session.completed) {
        notes.push("AAC restore was not recorded on this pathway.");
      }
      break;
    case "authority-dignity":
      if (session.richState.authority.integrity < 3) {
        notes.push("Authority integrity was reduced by dignity hits on this run.");
      } else {
        notes.push("Authority integrity held — family kept non-clinical.");
      }
      notes.push(`Score ${score}/${SCORE_MAX} — dignity is never a survival badge.`);
      break;
    case "system-sustainability":
      if (hasAction(session, "assign-paid-support-continuity")) {
        notes.push(
          "Paid support continuity assigned within non-medical boundaries (Save Our Sons framing).",
        );
      } else {
        notes.push("Paid-support continuity was not committed — sustainability gap.");
      }
      break;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
  return notes;
}

export function generateCodeBlueDebrief(
  session: CodeBluePlaySession,
  debrief: CodeBlueDebriefFile,
): CodeBlueDebriefResult {
  const score = scoreCodeBlueSession(session);
  const debriefTags = collectCodeBlueDebriefTags(session, debrief.tags);
  const g1 = g1Count(session);

  const dimensionIds = debrief.dimensions as CodeBlueDimensionId[];
  const dimensions: CodeBlueDimensionScore[] = dimensionIds.map((id) => {
    const value =
      id === "clinical-reasoning"
        ? score.clinicalReasoning
        : id === "timing-coordination"
          ? score.timingCoordination
          : id === "equipment-reasoning"
            ? score.equipmentReasoning
            : id === "communication-access"
              ? score.communicationAccess
              : id === "authority-dignity"
                ? score.authorityDignity
                : score.systemSustainability;
    return {
      id,
      label: DIMENSION_LABELS[id],
      score: value,
      max: SCORE_MAX,
      notes: dimensionNotes(id, session, value),
    };
  });

  const whatNoticed: string[] = [];
  if (g1 > 0) {
    whatNoticed.push(
      `Resource allocation touched ${g1} of 3 G1 actions without inventing indication.`,
    );
  }
  if (hasAction(session, "protect-aac")) {
    whatNoticed.push("AAC protection stayed on the board through pressure.");
  }
  if (fired(session, "h5-emergency-override")) {
    whatNoticed.push("H5 override path protected rescue focus over planning.");
  }
  if (session.richState.eventLog.some((e) => e.kind === "aac-restored")) {
    whatNoticed.push("Post-rescue AAC restore kept authorship in play after pulse return.");
  }
  if (!session.richState.authority.usedFamilyAsClinicalWorkforce) {
    whatNoticed.push("Family remained outside clinical task assignment.");
  }

  const whatMissed: string[] = [];
  if (g1 === 0) {
    whatMissed.push("G1 resource bundle was never committed.");
  } else if (g1 < 3) {
    whatMissed.push(
      `G1 incomplete (${g1}/3) — a valid partial path, not a failure badge.`,
    );
  }
  if (!hasAction(session, "protect-aac")) {
    whatMissed.push("protect-aac was not committed.");
  }
  if (!session.richState.eventLog.some((e) => e.kind === "aac-restored")) {
    whatMissed.push("AAC restore after rescue was skipped.");
  }
  if (!session.richState.domains.circulation.rosCConfirmedIndependently) {
    whatMissed.push("Independent ROSC confirmation was not recorded.");
  }
  if (!hasAction(session, "assign-paid-support-continuity")) {
    whatMissed.push("Paid-support continuity (system sustainability) was not assigned.");
  }
  if (whatMissed.length === 0) {
    whatMissed.push(
      "Trade-offs remain: no single perfect path closes every dimension at once.",
    );
  }

  const pathwaySummary = [
    `Committed ${session.committedActionIds.length} action(s); fired ${session.firedEvents.length} event(s).`,
    g1 > 0 ? `G1 coverage ${g1}/3.` : "No G1 actions.",
    fired(session, "h5-emergency-override") ? "H5 path taken." : "H5 path not taken.",
    "Scores are pathway-aware reflections — not a win/lose grade.",
  ].join(" ");

  return {
    episodeId: session.richState.scenarioId,
    completed: session.completed,
    noSinglePerfectPath: true,
    dimensions,
    score,
    debriefTags,
    reflectionPrompts: debrief.reflectionPrompts,
    whatNoticed:
      whatNoticed.length > 0
        ? whatNoticed
        : ["Pathway recorded — open reflection prompts below."],
    whatMissed,
    pathwaySummary,
    eventLog: session.richState.eventLog,
    committedActionIds: session.committedActionIds,
    firedEvents: session.firedEvents,
  };
}

/** JSON payload for download / export. */
export function exportCodeBlueDebriefJson(
  result: CodeBlueDebriefResult,
): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      episodeId: result.episodeId,
      completed: result.completed,
      noSinglePerfectPath: result.noSinglePerfectPath,
      score: result.score,
      debriefTags: result.debriefTags,
      dimensions: result.dimensions,
      pathwaySummary: result.pathwaySummary,
      whatNoticed: result.whatNoticed,
      whatMissed: result.whatMissed,
      committedActionIds: result.committedActionIds,
      firedEvents: result.firedEvents,
      eventLog: result.eventLog,
    },
    null,
    2,
  );
}
