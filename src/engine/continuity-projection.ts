/**
 * Cross-slice continuity projections (Code Blue → Episode 02, etc.).
 * Projections nudge opening domain state / flags for the next pack.
 * They never rewrite locked chronology or invent clinical indication.
 */

import type { SimulationStateDelta } from "@/types/simulation";

import type { CodeBluePlaySession } from "./simulation/code-blue-session";

export interface ContinuityProjection {
  source: "code-blue" | "episode-01" | "none";
  domainOverrides: SimulationStateDelta;
  flags: {
    aacWaitHonoured: boolean;
    familyNonClinical: boolean;
    postRoscReassessmentDone: boolean;
    aacRestoredAfterRescue: boolean;
  };
  notes: string[];
}

export const CONTINUITY_STORAGE_KEY = "breathing-room-continuity-projection";

export function projectFromCodeBlueSession(
  session: CodeBluePlaySession | null,
): ContinuityProjection {
  if (!session) {
    return {
      source: "none",
      domainOverrides: {},
      flags: {
        aacWaitHonoured: false,
        familyNonClinical: true,
        postRoscReassessmentDone: false,
        aacRestoredAfterRescue: false,
      },
      notes: ["No Code Blue session — Episode 02 opens without carry-forward."],
    };
  }

  const aacRestored =
    Boolean(session.richState.flags.aacRestoredAfterRescue) ||
    session.richState.eventLog.some((e) => e.kind === "aac-restored");
  const waitHonoured =
    session.committedActionIds.includes("protect-aac") &&
    !session.richState.authority.ignoredWaitOrStop &&
    !session.richState.authority.treatedSilenceAsConsent;
  const familyNonClinical =
    !session.richState.authority.usedFamilyAsClinicalWorkforce;
  const reassessDone = Boolean(
    session.richState.flags.postRoscReassessmentDone ||
      session.richState.domains.circulation.rosCConfirmedIndependently,
  );

  const domainOverrides: SimulationStateDelta = {};
  if (waitHonoured || aacRestored) {
    domainOverrides.communicationAccess = aacRestored ? 6 : 3;
    domainOverrides.authorshipControl = 3;
  }
  if (familyNonClinical) {
    domainOverrides.familyBurden = -2;
    domainOverrides.publicTrust = 2;
  }
  if (
    session.committedActionIds.includes("assign-paid-support-continuity")
  ) {
    domainOverrides.homeReadiness = 2;
  }

  const notes: string[] = [
    "Carry-forward from Code Blue is a projection — chronology stays locked.",
  ];
  if (waitHonoured) notes.push("AAC/WAIT honouring projected forward.");
  if (aacRestored) notes.push("Post-rescue AAC restore projected forward.");
  if (familyNonClinical) notes.push("Family non-clinical boundary projected.");
  if (reassessDone) notes.push("Post-ROSC reassessment completion projected.");

  return {
    source: "code-blue",
    domainOverrides,
    flags: {
      aacWaitHonoured: waitHonoured,
      familyNonClinical,
      postRoscReassessmentDone: reassessDone,
      aacRestoredAfterRescue: aacRestored,
    },
    notes,
  };
}

export function saveContinuityProjection(projection: ContinuityProjection): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(CONTINUITY_STORAGE_KEY, JSON.stringify(projection));
}

export function loadContinuityProjection(): ContinuityProjection | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(CONTINUITY_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ContinuityProjection;
  } catch {
    return null;
  }
}
