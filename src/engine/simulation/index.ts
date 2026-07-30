/**
 * Shared deterministic simulation engine (Phase 2).
 * Clinical truth lives here — story/UI/LLM must not mutate it directly.
 */

export { SIMULATION_ENGINE_REVISION } from "./types";
export type {
  ActionLifecycleState,
  BundleCommitResult,
  CommunicationAccessState,
  DomainId,
  EvidenceRequirement,
  PlayPhase,
  RichSimulationState,
  RoleId,
  SimulationActionDefinition,
  SimulationCommand,
  SimulationEvent,
} from "./types";

export { createInitialRichState } from "./create-initial";
export {
  canAskNonEmergencyQuestion,
  emergencyRescueWaitsForAac,
  interpretActivation,
  waitBlocksNonEmergencyQuestion,
  withRestoredAacAfterRescue,
} from "./communication";
export {
  airwayReplacementLocked,
  equipmentReadyCreatesIndication,
  evidenceSatisfied,
  withEvidenceSatisfied,
} from "./evidence";
export {
  isFamilyRoleAttempt,
  partitionBundle,
  validateActionAssignment,
  type ValidationIssue,
} from "./validation";
export { PHASE2_ACTION_CATALOG, cloneCatalog } from "./catalog";
export { commitActionBundle, reduceSimulation } from "./reducer";
export {
  postRoscReassessmentRequired,
  provisionalRoscRequiresIndependentConfirmation,
  raiseCrisisDebt,
  scoreAuthorityHit,
} from "./scoring";
export {
  parseRichState,
  roundTripRichState,
  serializeRichState,
  SimulationPersistenceError,
} from "./persistence";
export { projectToLegacyDomains } from "./project-domains";
export {
  selectAacProtection,
  selectAuthorityIntegrity,
  selectCrisisDebt,
  selectEmergencyCompactView,
  selectPulse,
  selectRhythm,
} from "./selectors";
export {
  CODE_BLUE_STORAGE_KEY,
  actionMeta,
  advanceViaExit,
  applySpecialCommand,
  buildAssignments,
  commitDraftBundle,
  createCodeBlueSession,
  defaultRoleForAction,
  exitConditionReady,
  fireEvent,
  listAdvanceOptions,
  loadCodeBlueSession,
  saveCodeBlueSession,
  type CodeBluePlaySession,
} from "./code-blue-session";
