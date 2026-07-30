/**
 * Story / narration view models (Phase 5–6).
 * Display-only — never written into RichSimulationState.
 */

export type NarrationSource = "authored" | "deterministic" | "llm-enriched";

export interface NarrationDialogueLine {
  speaker: string;
  line: string;
  aac?: boolean;
}

export interface NarrationViewModel {
  source: NarrationSource;
  summary: string;
  dialogue: NarrationDialogueLine[];
  captions: string[];
  framingNotes: string[];
  /** Always true — clinicalTruth is never produced by the director. */
  clinicalTruthUnchanged: true;
  /** Optional model/provider note when source is llm-enriched. */
  providerNote?: string;
  /** Why LLM enrichment was skipped or rejected. */
  fallbackReason?: string;
}

export interface StoryDirectorCompactSnapshot {
  playPhase: string;
  pulse: string;
  rhythm: string;
  airwayRoute: string;
  chestMovement: string;
  defibrillatorReady: boolean;
  aacInstruction: string | null;
  aacVisible: boolean;
  crisisDebtLevel: string;
  provisionalRoscNeedsConfirm: boolean;
  postRoscReassessmentDue: boolean;
}

export interface StoryDirectorInput {
  nodeId: string;
  phase: string;
  title: string;
  scene: {
    location: string;
    summary: string;
    lens: string;
    dialogue?: NarrationDialogueLine[];
    captions?: string[];
  };
  communicationBeat?: {
    instruction?: "WAIT" | "STOP" | null;
    questionActive: boolean;
    note: string;
  };
  familyBeat?: {
    clinicalAssignmentForbidden: true;
    note: string;
  };
  educationalBoundary: string;
  chronologyLock: string[];
  compact: StoryDirectorCompactSnapshot;
  /** When true, emergency override framing is emphasized. */
  emergencyOverride: boolean;
}

export interface LlmNarrationRequest {
  input: StoryDirectorInput;
  deterministic: NarrationViewModel;
}

export interface LlmNarrationResponse {
  summary: string;
  dialogue?: NarrationDialogueLine[];
  captions?: string[];
  framingNotes?: string[];
}
