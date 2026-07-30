/**
 * Phase 9 — Action Stations ↔ Code Blue bridge contract.
 *
 * Station assets are UI evidence / workup cues on Episode 01 pressure-rise.
 * Code Blue `availableActions` remain catalog-backed clinical commits.
 * This adapter maps soft kit/station IDs into suggested Code Blue action IDs
 * for continuity — it never invents a second clinical truth layer.
 */

export interface StationCodeBlueBridgeEntry {
  /** Action Stations asset number (community emergency bag). */
  assetNumber: number;
  /** Station lane id from action-stations.json. */
  stationId: "airway" | "breathing-equipment" | "circulation" | "access" | "family";
  /** Optional Phase 2 equipment id when the asset is mirrored in rich engine. */
  engineEquipmentId?: string;
  /**
   * Code Blue pack action ids this asset soft-gates or suggests.
   * Soft UI gate only — never creates indication.
   */
  codeBlueActionIds: string[];
  note: string;
}

/**
 * Canonical bridge table. Incomplete on purpose — full 01–20 station workup
 * is out of scope for Phase 9; Code Blue keeps its own catalog.
 */
export const STATION_CODE_BLUE_BRIDGE: StationCodeBlueBridgeEntry[] = [
  {
    assetNumber: 3,
    stationId: "airway",
    engineEquipmentId: "spare-trach-same-size",
    codeBlueActionIds: ["replace-airway"],
    note: "Spare airway visible for evidence workup; replace-airway stays gated by indication.",
  },
  {
    assetNumber: 4,
    stationId: "airway",
    codeBlueActionIds: ["replace-airway"],
    note: "Airway plan card is precondition evidence — not an indication to replace.",
  },
  {
    assetNumber: 7,
    stationId: "breathing-equipment",
    codeBlueActionIds: ["assign-suction-bedside-reserve"],
    note: "Suction catheters support F2 bedside reserve assignment.",
  },
  {
    assetNumber: 8,
    stationId: "breathing-equipment",
    engineEquipmentId: "portable-suction",
    codeBlueActionIds: ["assign-suction-bedside-reserve"],
    note: "Portable suction battery may be degraded — readiness ≠ dual assignment.",
  },
  {
    assetNumber: 9,
    stationId: "breathing-equipment",
    engineEquipmentId: "circuit-backup-conditional",
    codeBlueActionIds: ["assess-borrowed-circuit", "correct-external-circuit-load"],
    note: "Borrowed / spare circuit is conditional backup (G1 F1).",
  },
  {
    assetNumber: 10,
    stationId: "breathing-equipment",
    codeBlueActionIds: ["assess-borrowed-circuit", "correct-external-circuit-load"],
    note: "Adapters support circuit assessment, not automatic airway change.",
  },
  {
    assetNumber: 12,
    stationId: "breathing-equipment",
    engineEquipmentId: "manual-resuscitator",
    codeBlueActionIds: ["assess-chest-movement"],
    note: "Manual resuscitator readiness pairs with chest-movement assessment.",
  },
  {
    assetNumber: 17,
    stationId: "breathing-equipment",
    codeBlueActionIds: ["assess-chest-movement", "correct-external-circuit-load"],
    note: "Chest movement indicator is observation evidence.",
  },
  {
    assetNumber: 18,
    stationId: "circulation",
    engineEquipmentId: "defibrillator",
    codeBlueActionIds: ["prepare-defibrillator"],
    note: "Defibrillator prepare is readiness only — no energy values.",
  },
  {
    assetNumber: 19,
    stationId: "circulation",
    codeBlueActionIds: ["prepare-defibrillator", "assess-chest-movement"],
    note: "Portable monitor supports rhythm/pulse verification context.",
  },
  {
    assetNumber: 27,
    stationId: "access",
    codeBlueActionIds: ["protect-aac", "assign-paid-support-continuity"],
    note: "Offline AAC device — protect access; paid support may assist non-clinically.",
  },
  {
    assetNumber: 28,
    stationId: "access",
    codeBlueActionIds: ["protect-aac"],
    note: "Cheek switch spare keeps activation path reachable.",
  },
  {
    assetNumber: 41,
    stationId: "family",
    codeBlueActionIds: ["assign-paid-support-continuity"],
    note: "Roles card — family stay non-clinical; paid support boundaries.",
  },
  {
    assetNumber: 42,
    stationId: "family",
    codeBlueActionIds: ["assign-paid-support-continuity"],
    note: "Privacy/dignity guidelines — system sustainability, not clinical tasking.",
  },
];

export function codeBlueActionsForStationAsset(
  assetNumber: number,
): string[] {
  return (
    STATION_CODE_BLUE_BRIDGE.find((entry) => entry.assetNumber === assetNumber)
      ?.codeBlueActionIds ?? []
  );
}

export function stationAssetsForCodeBlueAction(actionId: string): number[] {
  return STATION_CODE_BLUE_BRIDGE.filter((entry) =>
    entry.codeBlueActionIds.includes(actionId),
  ).map((entry) => entry.assetNumber);
}

/**
 * Suggest Code Blue draft actions from committed station assets.
 * Display / continuity only — does not commit or mutate clinical truth.
 */
export function suggestCodeBlueActionsFromStations(
  committedAssetNumbers: number[],
  availableActions: string[],
): string[] {
  const suggested = new Set<string>();
  for (const assetNumber of committedAssetNumbers) {
    for (const actionId of codeBlueActionsForStationAsset(assetNumber)) {
      if (availableActions.includes(actionId)) suggested.add(actionId);
    }
  }
  return [...suggested];
}
