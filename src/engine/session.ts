import type { ChoiceHistoryEntry } from "@/types/debrief";
import type {
  EpisodeManifest,
  SimulationChoice,
  SimulationNode,
} from "@/types/node";
import {
  createInitialSimulationState,
  type SimulationState,
  type SimulationStateDelta,
} from "@/types/simulation";

import type { StationActionRecord } from "./action-stations";
import { domainDeltasForStationCommit } from "./action-stations";
import { applyDomainDeltas } from "./state";

export const SESSION_STORAGE_KEY = "breathing-room-episode-session";

export interface AppliedChoiceRecord extends ChoiceHistoryEntry {
  nodeTitle: string;
  immediateConsequence: string;
  delayedConsequence: string;
  domainDeltas: SimulationStateDelta;
  debriefNotes: string[];
  disabilityRightsNotes: string[];
  rohanAacLine?: string;
}

export interface SimulationSession {
  episodeId: string;
  episodeTitle: string;
  currentNodeId: string;
  initialState: SimulationState;
  state: SimulationState;
  history: AppliedChoiceRecord[];
  /** Instrumental Action Stations workup on pressure-rise and related beats. */
  stationHistory: StationActionRecord[];
  /** Last choice consequence awaiting learner acknowledgement before advance. */
  pendingConsequence: AppliedChoiceRecord | null;
  completed: boolean;
  updatedAtIso: string;
}

export function createSession(
  manifest: EpisodeManifest,
  initialOverrides?: SimulationStateDelta,
): SimulationSession {
  const initialState = createInitialSimulationState(initialOverrides);
  return {
    episodeId: manifest.id,
    episodeTitle: manifest.title,
    currentNodeId: manifest.startNodeId,
    initialState,
    state: initialState,
    history: [],
    stationHistory: [],
    pendingConsequence: null,
    completed: false,
    updatedAtIso: new Date().toISOString(),
  };
}

export function applyStationActionToSession(
  session: SimulationSession,
  record: StationActionRecord,
): SimulationSession {
  let nextState = session.state;
  if (record.workflowStep === "committed") {
    nextState = applyDomainDeltas(
      nextState,
      domainDeltasForStationCommit(record.assetNumber),
    );
  }

  return {
    ...session,
    state: nextState,
    stationHistory: [...session.stationHistory, record],
    updatedAtIso: new Date().toISOString(),
  };
}

export function applyChoiceToSession(
  session: SimulationSession,
  node: SimulationNode,
  choice: SimulationChoice,
): SimulationSession {
  const record: AppliedChoiceRecord = {
    nodeId: node.id,
    nodeTitle: node.title,
    choiceId: choice.id,
    label: choice.label,
    timestampIso: new Date().toISOString(),
    immediateConsequence: choice.immediateConsequence,
    delayedConsequence: choice.delayedConsequence,
    domainDeltas: choice.domainDeltas,
    debriefNotes: [...node.debriefNotes],
    disabilityRightsNotes: [...node.disabilityRightsNotes],
    rohanAacLine: choice.rohanAacLine,
  };

  return {
    ...session,
    state: applyDomainDeltas(session.state, choice.domainDeltas),
    history: [...session.history, record],
    pendingConsequence: record,
    updatedAtIso: new Date().toISOString(),
  };
}

export function advanceAfterConsequence(
  session: SimulationSession,
  choice: SimulationChoice,
  node: SimulationNode,
): SimulationSession {
  const episodeComplete =
    choice.nextNodeId === null || node.isEpisodeEnd === true;

  if (episodeComplete) {
    return {
      ...session,
      pendingConsequence: null,
      completed: true,
      updatedAtIso: new Date().toISOString(),
    };
  }

  return {
    ...session,
    currentNodeId: choice.nextNodeId as string,
    pendingConsequence: null,
    completed: false,
    updatedAtIso: new Date().toISOString(),
  };
}

export function toChoiceHistory(
  history: AppliedChoiceRecord[],
): ChoiceHistoryEntry[] {
  return history.map(
    ({
      nodeId,
      choiceId,
      label,
      timestampIso,
    }): ChoiceHistoryEntry => ({
      nodeId,
      choiceId,
      label,
      timestampIso,
    }),
  );
}

export function saveSession(session: SimulationSession): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function loadSession(): SimulationSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SimulationSession;
    return {
      ...parsed,
      stationHistory: parsed.stationHistory ?? [],
    };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}
