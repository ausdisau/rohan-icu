import type { CommunicationMethod } from "@/types/node";

/**
 * Access / channel status for Rohan's communication systems.
 * Distinct from decision-making capacity — unavailable access is never incapacity.
 */
export type CommunicationStatus =
  | "unavailable"
  | "preparing"
  | "available"
  | "active"
  | "interrupted";

/**
 * Capacity / supported decision-making — never inferred from AAC silence alone.
 */
export type DecisionCapacityStatus =
  | "not-assessed-via-motor"
  | "supported-decision-making"
  | "deferred-until-access";

export const COMMUNICATION_STATUS_COPY: Record<
  CommunicationStatus,
  { label: string; detail: string }
> = {
  unavailable: {
    label: "Communication unavailable",
    detail:
      "Systems are offline or sedation blocks use right now. That is an access gap — not incapacity.",
  },
  preparing: {
    label: "Communication preparing",
    detail:
      "Cheek switch, auditory scanning, and AAC are being set up for wake. Silence is expected until access is online.",
  },
  available: {
    label: "Communication available",
    detail:
      "Access methods are ready. Address Rohan directly; do not default to family as answerers.",
  },
  active: {
    label: "Communication active",
    detail:
      "Rohan is using an access method. Wait for his pace — slow answer is still an answer.",
  },
  interrupted: {
    label: "Communication interrupted",
    detail:
      "Access was working and is temporarily disrupted. Restore the channel before treating silence as refusal or incapacity.",
  },
};

export function communicationStatusFromMethod(
  method: CommunicationMethod,
): CommunicationStatus {
  switch (method) {
    case "deep-sedation":
      return "preparing";
    case "cheek-switch":
    case "auditory-scanning":
    case "aac-board":
    case "partner-assisted":
    case "voice-output":
    case "mixed":
      return "available";
    default: {
      const _exhaustive: never = method;
      return _exhaustive;
    }
  }
}

export function capacityStatusForCommunication(
  status: CommunicationStatus,
): DecisionCapacityStatus {
  switch (status) {
    case "unavailable":
    case "preparing":
    case "interrupted":
      return "deferred-until-access";
    case "available":
    case "active":
      return "supported-decision-making";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function methodDisplayLabel(method: CommunicationMethod): string {
  switch (method) {
    case "deep-sedation":
      return "Deep sedation (access prepared for wake)";
    case "cheek-switch":
      return "Cheek switch";
    case "auditory-scanning":
      return "Auditory scanning";
    case "aac-board":
      return "AAC board";
    case "partner-assisted":
      return "Partner-assisted scanning";
    case "voice-output":
      return "Voice output";
    case "mixed":
      return "Mixed access methods";
    default: {
      const _exhaustive: never = method;
      return _exhaustive;
    }
  }
}
