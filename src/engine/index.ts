export {
  buildCanonHeldChecklist,
  evaluateCanonContext,
  getCanonPhrases,
  getConsentPrinciples,
  getLockedChronology,
} from "./canon";
export {
  COMMUNICATION_STATUS_COPY,
  capacityStatusForCommunication,
  communicationStatusFromMethod,
  methodDisplayLabel,
  type CommunicationStatus,
  type DecisionCapacityStatus,
} from "./communication";
export {
  generateDebrief,
  type DebriefHighlights,
  type EnrichedDebriefPayload,
} from "./debrief";
export {
  buildPrognosisReport,
  buildPrognosisSummary,
  domainLabel,
  outlookBandForDomain,
  outlookBandLabel,
} from "./prognosis";
export {
  SESSION_STORAGE_KEY,
  advanceAfterConsequence,
  applyChoiceToSession,
  clearSession,
  createSession,
  loadSession,
  saveSession,
  toChoiceHistory,
  type AppliedChoiceRecord,
  type SimulationSession,
} from "./session";
export {
  DOMAIN_LABELS,
  HIGHER_IS_WORSE,
  applyDomainDeltas,
  clampDomain,
  computeNetDeltas,
  formatDelta,
} from "./state";
