import type { ActionStationsParsed } from "@/schemas/action-stations";
import type { SimulationStateDelta } from "@/types/simulation";

export interface StationActionRecord {
  nodeId: string;
  assetNumber: number;
  inventoryId: string;
  title: string;
  stationId: string;
  workflowStep: "relevant" | "assigned" | "committed";
  evidenceGateOpen: boolean;
  timestampIso: string;
}

/** Soft domain nudge when a station asset is committed — never a magic-object win. */
export function domainDeltasForStationCommit(
  assetNumber: number,
): SimulationStateDelta {
  switch (assetNumber) {
    case 4:
      return { communicationAccess: 1, publicTrust: 1 };
    case 7:
    case 8:
      return { airwayObstructionRisk: -1, respiratoryStability: 1 };
    case 9:
    case 10:
    case 14:
      return { respiratoryStability: 1 };
    case 15:
    case 16:
      return { homeReadiness: 1, respiratoryStability: 1 };
    case 17:
      return { respiratoryStability: 1, communicationAccess: 1 };
    case 19:
    case 20:
      return { arrhythmiaBurden: -1, cardiacReserve: 1 };
    default:
      if (assetNumber >= 1 && assetNumber <= 3) {
        return { airwayObstructionRisk: -2, cardiacReserve: -1 };
      }
      return { communicationAccess: 1 };
  }
}

export function stationsVisibleForNode(
  reference: ActionStationsParsed,
  nodeId: string,
): boolean {
  return reference.episodeNodeIds.includes(nodeId);
}

/**
 * Doc worked sequence: verify plan (04) before committing same-size spare (01).
 * Returns a coaching note when 01 is committed without 04 having been made relevant+.
 */
export function workedSequenceNote(
  history: StationActionRecord[],
  committedAssetNumber: number,
): string | null {
  if (committedAssetNumber !== 1) return null;
  const sawPlan = history.some(
    (entry) =>
      entry.assetNumber === 4 &&
      (entry.workflowStep === "relevant" ||
        entry.workflowStep === "assigned" ||
        entry.workflowStep === "committed"),
  );
  if (sawPlan) return null;
  return "Worked airway sequence reminder: Asset 04 (Airway Plan Card) normally verifies approved routes and responder requirements before committing Asset 01. Committing without that check leaves uncertainty unresolved — not automatically wrong, but incomplete.";
}

export function summarizeStationHistory(
  history: StationActionRecord[],
): string[] {
  if (history.length === 0) {
    return [
      "Action Stations were available on the pressure-rise beat, but no station assets were marked relevant, assigned, or committed.",
    ];
  }

  const committed = history.filter((entry) => entry.workflowStep === "committed");
  const lines: string[] = [
    `Action Stations workup recorded ${history.length} step(s) across ${
      new Set(history.map((entry) => entry.stationId)).size
    } station workstream(s).`,
  ];

  if (committed.length > 0) {
    lines.push(
      `Committed assets: ${committed
        .map(
          (entry) =>
            `${String(entry.assetNumber).padStart(2, "0")} ${entry.title}`,
        )
        .join("; ")}. Availability is not indication — branch consequence remains uncertain.`,
    );
  } else {
    lines.push(
      "Station assets were interpreted or assigned without a commit — investigation without assuming a cure.",
    );
  }

  if (history.some((entry) => !entry.evidenceGateOpen && entry.assetNumber <= 3)) {
    lines.push(
      "An airway-route asset was advanced while the evidence gate was still incomplete — early selection should stay explanatory, not decisive.",
    );
  }

  return lines;
}
