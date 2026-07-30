import type {
  CrisisDebtLevel,
  RichSimulationState,
  ScoreState,
} from "./types";

function levelFromReasonCount(count: number): CrisisDebtLevel {
  if (count <= 1) return "low";
  if (count === 2) return "moderate";
  if (count === 3) return "high";
  if (count === 4) return "critical";
  return "extreme";
}

function bump(
  score: ScoreState,
  key: keyof ScoreState,
  amount: number,
): ScoreState {
  return {
    ...score,
    [key]: Math.max(0, Math.min(12, score[key] + amount)),
  };
}

/** Live score nudges when an action is accepted — debrief recomputes full pathway. */
export function scoreForCommittedAction(
  state: RichSimulationState,
  actionId: string,
): RichSimulationState {
  let score = state.score;
  switch (actionId) {
    case "protect-aac":
      score = bump(score, "communicationAccess", 2);
      score = bump(score, "authorityDignity", 1);
      break;
    case "prepare-defibrillator":
      score = bump(score, "timingCoordination", 1);
      score = bump(score, "equipmentReasoning", 1);
      break;
    case "assess-chest-movement":
    case "correct-external-circuit-load":
      score = bump(score, "clinicalReasoning", 1);
      break;
    case "assess-borrowed-circuit":
    case "assign-suction-bedside-reserve":
      score = bump(score, "equipmentReasoning", 2);
      score = bump(score, "clinicalReasoning", 1);
      break;
    case "assign-paid-support-continuity":
      score = bump(score, "systemSustainability", 2);
      score = bump(score, "communicationAccess", 1);
      break;
    case "replace-airway":
      score = bump(score, "clinicalReasoning", 1);
      break;
    default:
      break;
  }
  return { ...state, score };
}

export function raiseCrisisDebt(
  state: RichSimulationState,
  reasons: string[],
): RichSimulationState {
  const merged = [...new Set([...state.crisisDebt.reasons, ...reasons])];
  return {
    ...state,
    crisisDebt: {
      level: levelFromReasonCount(merged.length),
      reasons: merged,
    },
  };
}

export function scoreAuthorityHit(
  state: RichSimulationState,
  reason:
    | "silence-as-consent"
    | "ignored-wait-stop"
    | "family-as-workforce"
    | "slow-as-incapacity"
    | "ambiguous-activation",
): RichSimulationState {
  const integrity = Math.max(0, state.authority.integrity - 1);
  const authority = { ...state.authority, integrity };
  switch (reason) {
    case "silence-as-consent":
      authority.treatedSilenceAsConsent = true;
      break;
    case "ignored-wait-stop":
      authority.ignoredWaitOrStop = true;
      break;
    case "family-as-workforce":
      authority.usedFamilyAsClinicalWorkforce = true;
      break;
    case "slow-as-incapacity":
      authority.labelledSlowAsIncapacity = true;
      break;
    case "ambiguous-activation":
      break;
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
  return {
    ...state,
    authority,
    score: {
      ...state.score,
      authorityDignity: Math.max(0, state.score.authorityDignity - 1),
    },
  };
}

export function provisionalRoscRequiresIndependentConfirmation(
  state: RichSimulationState,
): boolean {
  return (
    state.domains.circulation.provisionalRosc &&
    !state.domains.circulation.rosCConfirmedIndependently
  );
}

export function postRoscReassessmentRequired(
  state: RichSimulationState,
): boolean {
  return (
    Boolean(state.flags.postRoscReassessmentRequired) &&
    !state.flags.postRoscReassessmentDone
  );
}
