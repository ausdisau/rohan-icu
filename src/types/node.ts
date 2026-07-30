import type { MediaRef } from "./media";
import type { SimulationStateDelta } from "./simulation";

export type CommunicationMethod =
  | "deep-sedation"
  | "cheek-switch"
  | "auditory-scanning"
  | "aac-board"
  | "partner-assisted"
  | "voice-output"
  | "mixed";

export interface SimulationChoice {
  id: string;
  label: string;
  /** Immediate clinical / systems consequence shown after selection. */
  immediateConsequence: string;
  /** Delayed or downstream consequence (may surface in debrief). */
  delayedConsequence: string;
  domainDeltas: SimulationStateDelta;
  nextNodeId: string | null;
  /** Rohan AAC line for this branch — use canon phrases when applicable. */
  rohanAacLine?: string;
}

export interface SimulationNode {
  id: string;
  phaseId: string;
  title: string;
  openingNarrative: string;
  clinicalState: string;
  communicationMethod: CommunicationMethod;
  choices: SimulationChoice[];
  disabilityRightsNotes: string[];
  debriefNotes: string[];
  media?: MediaRef[];
  /** When true, reaching this node ends the playable episode (debrief follows). */
  isEpisodeEnd?: boolean;
}

export interface EpisodeManifest {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  /** Locked chronology recap shown at episode start. */
  chronologyLock: string[];
  startNodeId: string;
  nodeIds: string[];
  estimatedMinutes?: { min: number; max: number };
  version: string;
  /** Shared simulation engine revision (Phase 2+). */
  simulationEngineRevision?: number;
}
