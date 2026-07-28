/**
 * Multi-domain clinical / rights state. No single health score.
 * Domain values are typically 0–100; decisions apply delta patches.
 */
export interface SimulationState {
  respiratoryStability: number;
  rightLungAeration: number;
  airwayObstructionRisk: number;
  cardiacReserve: number;
  arrhythmiaBurden: number;
  infectionControl: number;
  antibioticResistance: number;
  renalReserve: number;
  sedationDepth: number;
  deliriumBurden: number;
  painControl: number;
  communicationAccess: number;
  restraintExposure: number;
  privacyProtection: number;
  familyBurden: number;
  homeReadiness: number;
  schoolAccess: number;
  authorshipControl: number;
  publicTrust: number;
}

/** Partial patch applied by a choice (improve one domain, harm another). */
export type SimulationStateDelta = Partial<SimulationState>;

export const SIMULATION_STATE_KEYS = [
  "respiratoryStability",
  "rightLungAeration",
  "airwayObstructionRisk",
  "cardiacReserve",
  "arrhythmiaBurden",
  "infectionControl",
  "antibioticResistance",
  "renalReserve",
  "sedationDepth",
  "deliriumBurden",
  "painControl",
  "communicationAccess",
  "restraintExposure",
  "privacyProtection",
  "familyBurden",
  "homeReadiness",
  "schoolAccess",
  "authorshipControl",
  "publicTrust",
] as const satisfies ReadonlyArray<keyof SimulationState>;

export type SimulationStateKey = (typeof SIMULATION_STATE_KEYS)[number];

export function createInitialSimulationState(
  overrides: SimulationStateDelta = {},
): SimulationState {
  return {
    respiratoryStability: 55,
    rightLungAeration: 45,
    airwayObstructionRisk: 40,
    cardiacReserve: 50,
    arrhythmiaBurden: 35,
    infectionControl: 40,
    antibioticResistance: 55,
    renalReserve: 60,
    sedationDepth: 80,
    deliriumBurden: 25,
    painControl: 50,
    communicationAccess: 20,
    restraintExposure: 15,
    privacyProtection: 70,
    familyBurden: 45,
    homeReadiness: 25,
    schoolAccess: 40,
    authorshipControl: 50,
    publicTrust: 65,
    ...overrides,
  };
}
