import type { RichSimulationState } from "./types";
import {
  postRoscReassessmentRequired,
  provisionalRoscRequiresIndependentConfirmation,
} from "./scoring";

export function selectPulse(state: RichSimulationState) {
  return state.domains.circulation.pulse;
}

export function selectRhythm(state: RichSimulationState) {
  return state.domains.circulation.rhythm;
}

export function selectAirwayRoute(state: RichSimulationState) {
  return state.domains.airway.routeLabel;
}

export function selectChestMovement(state: RichSimulationState) {
  return state.domains.breathing.chestMovement;
}

export function selectAacProtection(state: RichSimulationState) {
  const access = state.domains.communicationAccess;
  return {
    powered: access.devicePowered,
    visible: access.deviceVisible,
    switchReachable: access.switchReachable,
    instruction: access.currentInstruction,
    reliability: access.responseReliability,
  };
}

export function selectAuthorityIntegrity(state: RichSimulationState) {
  return state.authority.integrity;
}

export function selectCrisisDebt(state: RichSimulationState) {
  return state.crisisDebt;
}

export function selectEmergencyCompactView(state: RichSimulationState) {
  return {
    playPhase: state.playPhase,
    pulse: selectPulse(state),
    rhythm: selectRhythm(state),
    airwayRoute: selectAirwayRoute(state),
    chestMovement: selectChestMovement(state),
    ventilationPathway: state.domains.breathing.ventilationPathway,
    defibrillatorReady: state.domains.circulation.defibrillatorReady,
    aac: selectAacProtection(state),
    authorityIntegrity: selectAuthorityIntegrity(state),
    crisisDebt: selectCrisisDebt(state),
    provisionalRoscNeedsConfirm:
      provisionalRoscRequiresIndependentConfirmation(state),
    postRoscReassessmentDue: postRoscReassessmentRequired(state),
    eventLogTail: state.eventLog.slice(-8),
  };
}
