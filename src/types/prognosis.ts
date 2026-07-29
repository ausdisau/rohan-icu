import type { CommunicationMethod } from "./node";
import type { SimulationStateKey } from "./simulation";

/** Outlook band for a single domain or grouped card. */
export type OutlookBand =
  | "improving"
  | "stable"
  | "fragile"
  | "worsening";

export type PrognosisGroupId =
  | "respiratory-airway"
  | "cardiac"
  | "infection-renal"
  | "communication-sedation"
  | "rights-continuity";

export interface CanonPhrase {
  id: string;
  text: string;
}

export interface ConsentPrinciple {
  id: string;
  rule: string;
}

export interface CanonPrinciple {
  id: string;
  text: string;
}

/** Active canon reminders for the current beat. */
export interface CanonContext {
  chronologyLock: string[];
  activePrinciples: CanonPrinciple[];
  consentReminders: ConsentPrinciple[];
  phrases: CanonPhrase[];
}

export interface DomainOutlook {
  key: SimulationStateKey;
  band: OutlookBand;
  value: number;
  delta?: number;
}

export interface PrognosisGroup {
  id: PrognosisGroupId;
  title: string;
  band: OutlookBand;
  summary: string;
  domains: DomainOutlook[];
}

/**
 * Multi-domain prognosis report.
 * Non-goals: no survival %, no miraculous recovery, no walking/extubation victory.
 */
export interface PrognosisReport {
  groups: PrognosisGroup[];
  /** One or more plain-language lines — never a single health score. */
  summaryLines: string[];
  /** Explicit disclaimer for UI. */
  disclaimer: string;
}

export interface EvaluateCanonInput {
  nodeId: string;
  phaseId: string;
  title: string;
  openingNarrative: string;
  clinicalState: string;
  communicationMethod: CommunicationMethod;
  disabilityRightsNotes?: string[];
}
