import { z } from "zod";

import { SIMULATION_STATE_KEYS } from "@/types/simulation";

const domainNumber = z.number().finite();

export const simulationStateSchema = z.object({
  respiratoryStability: domainNumber,
  rightLungAeration: domainNumber,
  airwayObstructionRisk: domainNumber,
  cardiacReserve: domainNumber,
  arrhythmiaBurden: domainNumber,
  infectionControl: domainNumber,
  antibioticResistance: domainNumber,
  renalReserve: domainNumber,
  sedationDepth: domainNumber,
  deliriumBurden: domainNumber,
  painControl: domainNumber,
  communicationAccess: domainNumber,
  restraintExposure: domainNumber,
  privacyProtection: domainNumber,
  familyBurden: domainNumber,
  homeReadiness: domainNumber,
  schoolAccess: domainNumber,
  authorshipControl: domainNumber,
  publicTrust: domainNumber,
});

export const simulationStateDeltaSchema = z
  .object(
    Object.fromEntries(
      SIMULATION_STATE_KEYS.map((key) => [key, domainNumber.optional()]),
    ) as Record<(typeof SIMULATION_STATE_KEYS)[number], z.ZodOptional<z.ZodNumber>>,
  )
  .strict();

export type SimulationStateParsed = z.infer<typeof simulationStateSchema>;
export type SimulationStateDeltaParsed = z.infer<typeof simulationStateDeltaSchema>;
