import { z } from "zod";

import type { ContinuityFinding } from "./continuity";

export const actionStationStateSchema = z.enum([
  "available",
  "relevant",
  "locked-by-evidence",
  "assigned",
  "committed",
]);

const actionStationIdSchema = z.enum([
  "airway",
  "breathing-equipment",
  "circulation",
]);

export const actionStationAssetSchema = z.object({
  number: z.number().int().min(1).max(20),
  inventoryId: z.string().min(1),
  stationId: actionStationIdSchema,
  title: z.string().min(1),
  purpose: z.string().min(1),
  contextGate: z.object({
    requiredEvidence: z.array(z.string().min(1)).min(1),
    warning: z.string().min(1),
  }),
  initialState: actionStationStateSchema,
  altText: z.string().min(8),
  visualNumberMayRead: z.string().optional(),
});

export const actionStationsSchema = z.object({
  id: z.literal("action-stations"),
  version: z.string().min(1),
  title: z.string().min(1),
  framing: z.string().min(1),
  educationalBoundary: z.string().min(1),
  episodeNodeIds: z.array(z.string().min(1)).min(1),
  states: z.array(
    z.object({
      id: actionStationStateSchema,
      label: z.string().min(1),
      meaning: z.string().min(1),
    }),
  ).length(5),
  workflow: z.array(z.string().min(1)).length(6),
  evidenceGate: z.object({
    assetNumbers: z.array(z.number().int()).length(3),
    evidenceToConsider: z.array(z.string().min(1)).length(3),
    earlySelectionWarning: z.string().min(1),
  }),
  decisionPrompts: z.array(z.string().min(1)).length(7),
  accessibilityRequirements: z.array(z.string().min(1)).min(7),
  workedSequence: z.string().min(1).optional(),
  centralScene: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    indicators: z.array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        detail: z.string().min(1),
      }),
    ).min(3),
  }),
  stations: z.array(
    z.object({
      id: actionStationIdSchema,
      label: z.string().min(1),
      numberRange: z.tuple([z.number().int(), z.number().int()]),
      assetNumbers: z.array(z.number().int()).min(1),
    }),
  ).length(3),
  assets: z.array(actionStationAssetSchema).length(20),
});

export type ActionStationsParsed = z.infer<typeof actionStationsSchema>;

export function lintActionStations(
  data: unknown,
  filePath: string,
): ContinuityFinding[] {
  const parsed = actionStationsSchema.safeParse(data);
  if (!parsed.success) {
    return [{
      ruleId: "action-stations-schema",
      severity: "error",
      message: `action-stations failed Zod validation: ${parsed.error.message}`,
      path: filePath,
    }];
  }

  const findings: ContinuityFinding[] = [];
  const reference = parsed.data;
  const numbers = reference.assets.map((asset) => asset.number).sort((a, b) => a - b);

  for (let expected = 1; expected <= 20; expected += 1) {
    if (numbers[expected - 1] !== expected) {
      findings.push({
        ruleId: "action-stations-contiguous",
        severity: "error",
        message: `Action Station assets must be contiguous 01–20; expected ${expected}, found ${numbers[expected - 1] ?? "none"}.`,
        path: filePath,
      });
      break;
    }
  }

  for (const station of reference.stations) {
    const [start, end] = station.numberRange;
    const expected = Array.from(
      { length: end - start + 1 },
      (_, index) => start + index,
    );
    if (station.assetNumbers.join(",") !== expected.join(",")) {
      findings.push({
        ruleId: "action-stations-range",
        severity: "error",
        message: `${station.label} assetNumbers must match its declared range ${start}–${end}.`,
        path: `${filePath}#${station.id}`,
      });
    }
  }

  for (const asset of reference.assets) {
    const expectedPrefix = `kit-${String(asset.number).padStart(2, "0")}-`;
    if (!asset.inventoryId.startsWith(expectedPrefix)) {
      findings.push({
        ruleId: "action-stations-inventory-alignment",
        severity: "error",
        message: `Asset ${asset.number} inventoryId must align with emergency-kit item ${expectedPrefix}*.`,
        path: `${filePath}#asset-${asset.number}`,
      });
    }
    if (
      asset.number <= 3 &&
      asset.initialState !== "locked-by-evidence"
    ) {
      findings.push({
        ruleId: "action-stations-evidence-lock",
        severity: "error",
        message: `Asset ${asset.number} must begin locked by evidence.`,
        path: `${filePath}#asset-${asset.number}`,
      });
    }
  }

  const asset19 = reference.assets.find((asset) => asset.number === 19);
  if (asset19?.visualNumberMayRead !== "10") {
    findings.push({
      ruleId: "action-stations-asset-19",
      severity: "error",
      message: "Asset 19 must record that its source image may visually read “10”; canonical UI and assistive output remain 19.",
      path: `${filePath}#asset-19`,
    });
  }

  return findings;
}
