import type {
  CommunicationAccessState,
  CommunicationActivation,
  RichSimulationState,
} from "./types";

export type ActivationInterpretation =
  | "yes"
  | "no"
  | "wait"
  | "stop"
  | "unknown";

/**
 * No response, and activation without an active question, both mean unknown —
 * never consent, refusal, or incapacity.
 */
export function interpretActivation(
  access: CommunicationAccessState,
  activation: CommunicationActivation,
): ActivationInterpretation {
  if (activation === null) return "unknown";
  if (!access.questionActive) return "unknown";
  if (access.currentInstruction === "STOP") return "stop";
  if (access.currentInstruction === "WAIT") {
    // WAIT suspends non-emergency questioning; activation during WAIT is unknown
    // unless the caller has marked an emergency rescue path separately.
    return "unknown";
  }
  return activation;
}

export function waitBlocksNonEmergencyQuestion(
  access: CommunicationAccessState,
): boolean {
  return access.currentInstruction === "WAIT";
}

export function canAskNonEmergencyQuestion(
  access: CommunicationAccessState,
): boolean {
  if (access.currentInstruction === "STOP") return false;
  if (access.currentInstruction === "WAIT") return false;
  return access.responseReliability !== "unavailable";
}

/**
 * Emergency rescue must not be delayed waiting for AAC.
 * AAC restoration is a separate post-rescue requirement.
 */
export function emergencyRescueWaitsForAac(): boolean {
  return false;
}

export function withRestoredAacAfterRescue(
  state: RichSimulationState,
): RichSimulationState {
  return {
    ...state,
    revision: state.revision + 1,
    domains: {
      ...state.domains,
      communicationAccess: {
        ...state.domains.communicationAccess,
        devicePowered: true,
        deviceVisible: true,
        switchReachable: true,
        responseReliability:
          state.domains.communicationAccess.responseReliability ===
          "unavailable"
            ? "fragile"
            : state.domains.communicationAccess.responseReliability,
        currentInstruction: null,
        questionActive: false,
        latestActivation: null,
      },
    },
    flags: {
      ...state.flags,
      aacRestoredAfterRescue: true,
    },
  };
}

export function authorityPenaltyForSilenceAsConsent(
  state: RichSimulationState,
): RichSimulationState {
  const integrity = Math.max(0, state.authority.integrity - 1);
  return {
    ...state,
    revision: state.revision + 1,
    authority: {
      ...state.authority,
      integrity,
      treatedSilenceAsConsent: true,
    },
  };
}
