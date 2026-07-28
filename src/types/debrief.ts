import type { SimulationState, SimulationStateDelta } from "./simulation";

export type DebriefCategoryId =
  | "clinical-tradeoffs"
  | "communication-access"
  | "disability-rights"
  | "family-and-labour"
  | "home-and-school"
  | "authorship-and-trust"
  | "next-episode";

export interface DebriefCategory {
  id: DebriefCategoryId;
  title: string;
  summary: string;
  relatedChoices: string[];
  domainHighlights: SimulationStateDelta;
}

export interface ChoiceHistoryEntry {
  nodeId: string;
  choiceId: string;
  label: string;
  timestampIso: string;
}

/** Prompt 13 identify-items — not survival/physiology scores. */
export interface DebriefHighlights {
  clinicallyStrong: string;
  rightsPreserving: string;
  delayedHarm: string;
  legitimateUncertainty: string;
  rohanQuestion: string;
}

export interface DebriefPayload {
  episodeId: string;
  finalState: SimulationState;
  initialState: SimulationState;
  netDeltas: SimulationStateDelta;
  choiceHistory: ChoiceHistoryEntry[];
  categories: DebriefCategory[];
  nextEpisodeHook: string;
  highlights?: DebriefHighlights;
  whatNoticed?: string[];
  whatMissed?: string[];
}
