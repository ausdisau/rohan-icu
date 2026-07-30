import {
  createInitialSimulationState,
  type SimulationState,
} from "@/types/simulation";

import type { RichSimulationState } from "./types";

/**
 * Project categorical rich state onto the Episode 01 18-domain scalar model
 * used by DomainMeters, prognosis, and existing debrief.
 */
export function projectToLegacyDomains(
  rich: RichSimulationState,
): SimulationState {
  const base = createInitialSimulationState(rich.legacyDomainSeed);
  const airway = rich.domains.airway;
  const breathing = rich.domains.breathing;
  const circulation = rich.domains.circulation;
  const access = rich.domains.communicationAccess;

  let airwayObstructionRisk = base.airwayObstructionRisk;
  if (airway.patency === "dependable") airwayObstructionRisk = 25;
  if (airway.patency === "questionable") airwayObstructionRisk = 45;
  if (airway.patency === "obstructed") airwayObstructionRisk = 75;
  if (airway.patency === "displaced") airwayObstructionRisk = 85;

  let rightLungAeration = base.rightLungAeration;
  let respiratoryStability = base.respiratoryStability;
  if (breathing.chestMovement === "stable") {
    rightLungAeration = 60;
    respiratoryStability = 65;
  } else if (breathing.chestMovement === "reduced") {
    rightLungAeration = 40;
    respiratoryStability = 45;
  } else if (breathing.chestMovement === "absent") {
    rightLungAeration = 15;
    respiratoryStability = 20;
  } else {
    rightLungAeration = 35;
    respiratoryStability = 40;
  }

  let cardiacReserve = base.cardiacReserve;
  let arrhythmiaBurden = base.arrhythmiaBurden;
  if (circulation.pulse === "absent") {
    cardiacReserve = 10;
    arrhythmiaBurden = 90;
  } else if (circulation.pulse === "fragile") {
    cardiacReserve = 35;
    arrhythmiaBurden = 55;
  } else if (circulation.pulse === "uncertain") {
    cardiacReserve = 40;
    arrhythmiaBurden = 50;
  } else {
    cardiacReserve = 55;
    arrhythmiaBurden = 30;
  }
  if (circulation.rhythm === "frequent-ectopy") arrhythmiaBurden = Math.max(arrhythmiaBurden, 55);
  if (circulation.rhythm === "shockable-pulseless") arrhythmiaBurden = 95;
  if (circulation.rhythm === "unstable-ventricular") arrhythmiaBurden = 80;

  let communicationAccess = base.communicationAccess;
  if (access.responseReliability === "reproducible" && access.deviceVisible) {
    communicationAccess = 70;
  } else if (access.responseReliability === "fragile") {
    communicationAccess = 45;
  } else if (access.responseReliability === "unavailable") {
    communicationAccess = 15;
  } else {
    communicationAccess = 30;
  }
  if (access.currentInstruction === "WAIT") {
    communicationAccess = Math.max(communicationAccess, 50);
  }

  let authorshipControl = base.authorshipControl;
  authorshipControl = Math.min(
    100,
    Math.max(0, authorshipControl - (5 - rich.authority.integrity) * 8),
  );

  let homeReadiness = base.homeReadiness;
  if (rich.flags.transportHeld) homeReadiness = Math.max(0, homeReadiness - 5);
  if (rich.flags.suctionAssignedBedsideReserve) {
    homeReadiness = Math.min(100, homeReadiness + 5);
  }

  return {
    ...base,
    airwayObstructionRisk,
    rightLungAeration,
    respiratoryStability,
    cardiacReserve,
    arrhythmiaBurden,
    communicationAccess,
    authorshipControl,
    homeReadiness,
    publicTrust: Math.min(
      100,
      Math.max(0, base.publicTrust - rich.crisisDebt.reasons.length * 3),
    ),
    familyBurden: rich.authority.usedFamilyAsClinicalWorkforce
      ? Math.min(100, base.familyBurden + 20)
      : base.familyBurden,
  };
}
