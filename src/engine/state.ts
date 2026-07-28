import {
  SIMULATION_STATE_KEYS,
  type SimulationState,
  type SimulationStateDelta,
  type SimulationStateKey,
} from "@/types/simulation";

const DOMAIN_MIN = 0;
const DOMAIN_MAX = 100;

export function clampDomain(value: number): number {
  if (Number.isNaN(value)) return DOMAIN_MIN;
  return Math.min(DOMAIN_MAX, Math.max(DOMAIN_MIN, value));
}

/** Apply a choice's domain delta patch. No single health score is computed. */
export function applyDomainDeltas(
  state: SimulationState,
  deltas: SimulationStateDelta,
): SimulationState {
  const next: SimulationState = { ...state };
  for (const key of SIMULATION_STATE_KEYS) {
    const delta = deltas[key];
    if (typeof delta === "number") {
      next[key] = clampDomain(state[key] + delta);
    }
  }
  return next;
}

/** Net change from initial → final for domains that moved. */
export function computeNetDeltas(
  initial: SimulationState,
  final: SimulationState,
): SimulationStateDelta {
  const net: SimulationStateDelta = {};
  for (const key of SIMULATION_STATE_KEYS) {
    const diff = final[key] - initial[key];
    if (diff !== 0) {
      net[key] = diff;
    }
  }
  return net;
}

export const DOMAIN_LABELS: Record<SimulationStateKey, string> = {
  respiratoryStability: "Respiratory stability",
  rightLungAeration: "Right lung aeration",
  airwayObstructionRisk: "Airway obstruction risk",
  cardiacReserve: "Cardiac reserve",
  arrhythmiaBurden: "Arrhythmia burden",
  infectionControl: "Infection control",
  antibioticResistance: "Antibiotic resistance pressure",
  renalReserve: "Renal reserve",
  sedationDepth: "Sedation depth",
  deliriumBurden: "Delirium burden",
  painControl: "Pain control",
  communicationAccess: "Communication access",
  restraintExposure: "Restraint exposure",
  privacyProtection: "Privacy protection",
  familyBurden: "Family labour burden",
  homeReadiness: "Home readiness",
  schoolAccess: "School membership",
  authorshipControl: "Authorship control",
  publicTrust: "Public trust",
};

/** Domains where higher values usually mean more harm / load. */
export const HIGHER_IS_WORSE: ReadonlySet<SimulationStateKey> = new Set([
  "airwayObstructionRisk",
  "arrhythmiaBurden",
  "antibioticResistance",
  "sedationDepth",
  "deliriumBurden",
  "restraintExposure",
  "familyBurden",
]);

export function formatDelta(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}
