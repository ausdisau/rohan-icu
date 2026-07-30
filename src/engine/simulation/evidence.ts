import type {
  EvidenceRequirement,
  RichSimulationState,
  SimulationActionDefinition,
} from "./types";

export function evidenceSatisfied(
  requirements: EvidenceRequirement[],
): boolean {
  return requirements.every((requirement) => requirement.satisfied);
}

/** Equipment readiness never creates clinical indication by itself. */
export function equipmentReadyCreatesIndication(
  state: RichSimulationState,
  equipmentId: string,
): boolean {
  const item = state.equipment[equipmentId];
  if (!item) return false;
  return false;
}

export function isAirwayReplacementAction(
  action: SimulationActionDefinition,
): boolean {
  return action.id === "replace-airway" || action.id.includes("replace-airway");
}

export function airwayReplacementLocked(
  state: RichSimulationState,
  action: SimulationActionDefinition,
): boolean {
  if (!isAirwayReplacementAction(action)) return false;
  return (
    !state.domains.airway.replacementIndicated ||
    state.domains.airway.evidenceForReplacement.length === 0 ||
    !evidenceSatisfied(action.requiredEvidence)
  );
}

export function withEvidenceSatisfied(
  action: SimulationActionDefinition,
  evidenceId: string,
): SimulationActionDefinition {
  return {
    ...action,
    requiredEvidence: action.requiredEvidence.map((requirement) =>
      requirement.id === evidenceId
        ? { ...requirement, satisfied: true }
        : requirement,
    ),
  };
}
