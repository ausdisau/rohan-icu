/**
 * Shared deterministic simulation types (Phase 2).
 * Clinical truth lives here — not in story/UI/LLM layers.
 */

export const SIMULATION_ENGINE_REVISION = 2 as const;

export type DomainId =
  | "airway"
  | "breathing"
  | "circulation"
  | "communication-access";

export type PlayPhase =
  | "observe"
  | "plan"
  | "commit"
  | "resolve"
  | "reflect"
  | "emergency-override";

export type ActionLifecycleState =
  | "available"
  | "relevant"
  | "locked-by-evidence"
  | "assigned"
  | "committed"
  | "resolved";

export type AirwayPatency =
  | "dependable"
  | "questionable"
  | "obstructed"
  | "displaced"
  | "unknown";

export type ChestMovement =
  | "stable"
  | "reduced"
  | "absent"
  | "unconfirmed";

export type PulseStatus = "present" | "fragile" | "uncertain" | "absent";

export type RhythmCategory =
  | "organised"
  | "frequent-ectopy"
  | "unstable-ventricular"
  | "shockable-pulseless"
  | "non-shockable-pulseless";

export type ResponseReliability =
  | "reproducible"
  | "fragile"
  | "unavailable"
  | "unknown";

export type CommunicationActivation =
  | "yes"
  | "no"
  | "wait"
  | "stop"
  | "unknown"
  | null;

export type CrisisDebtLevel =
  | "low"
  | "moderate"
  | "high"
  | "critical"
  | "extreme";

export type RoleId =
  | "icu-circulation"
  | "cardiology"
  | "respiratory"
  | "ent-airway"
  | "bedside-nursing"
  | "aac-disability-access"
  | "iicrt-coordinator"
  | "biomedical-engineering"
  | "family-liaison"
  | "paid-support-worker";

/** Family roles are never clinical responders. */
export type FamilyRoleId =
  | "comfort-presence"
  | "values-witness"
  | "baseline-communication-informant"
  | "privacy-dignity-observer"
  | "logistics"
  | "equipment-continuity-nonclinical"
  | "approved-contact-coordination"
  | "question-tracking"
  | "transport-property-continuity";

export type PersonnelStatus =
  | "available"
  | "assigned"
  | "diverted"
  | "remote"
  | "exhausted"
  | "unavailable";

export type EquipmentWarning =
  | "battery-uncertain"
  | "degraded-battery"
  | "outside-room"
  | "incompatible-connector"
  | "unverified-adapter"
  | "plan-revision-unverified"
  | "second-responder-required"
  | "authorised-responder-unavailable"
  | "may-displace-aac"
  | "conditional-backup-only";

export interface AirwayState {
  patency: AirwayPatency;
  routeLabel: string;
  replacementIndicated: boolean;
  evidenceForReplacement: string[];
}

export interface BreathingState {
  chestMovement: ChestMovement;
  ventilationPathway: string;
  circuitVerified: boolean;
  conditionalBackupAvailable: boolean;
}

export interface CirculationState {
  pulse: PulseStatus;
  rhythm: RhythmCategory;
  defibrillatorReady: boolean;
  provisionalRosc: boolean;
  rosCConfirmedIndependently: boolean;
}

export interface CommunicationAccessState {
  devicePowered: boolean;
  deviceVisible: boolean;
  switchReachable: boolean;
  lowTechBackupAvailable: boolean;
  emergencyVocabularyAvailable: boolean;
  currentInstruction: "WAIT" | "STOP" | null;
  questionActive: boolean;
  latestActivation: CommunicationActivation;
  responseReliability: ResponseReliability;
  specialistSupport: "bedside" | "remote" | "unavailable";
}

export interface EquipmentState {
  id: string;
  inventoryId?: string;
  title: string;
  available: boolean;
  quantity: number;
  verified: boolean;
  battery: "unknown" | "degraded" | "adequate" | "full";
  location: "bedside" | "outside-room" | "transport" | "store";
  ownership: "personal-kit" | "ward" | "shared";
  role: "primary" | "backup" | "conditional-backup";
  assignedTeam?: RoleId;
  warnings: EquipmentWarning[];
  /** Ready ≠ indicated */
  readinessDoesNotIndicate: true;
}

export interface PersonnelState {
  role: RoleId;
  status: PersonnelStatus;
  assignedActionId?: string;
  returnDelaySeconds?: number;
}

export interface FamilyMemberState {
  id: "samira" | "arvind" | "leela";
  name: string;
  roles: FamilyRoleId[];
  clinicalAssignmentForbidden: true;
}

export interface ResourceLedger {
  verifiedCircuits: number;
  conditionalBackupCircuits: number;
  suctionBattery: "degraded" | "adequate" | "unknown";
  manualBreathingBackupReady: boolean;
}

export interface EnvironmentState {
  location: string;
  cardiacPreAlert: "none" | "raised" | "maximum";
  option5bPreferred: boolean;
  option5bAuthorised: boolean;
}

export interface AuthorityState {
  integrity: number;
  addressedRohanDirectly: boolean;
  treatedSilenceAsConsent: boolean;
  ignoredWaitOrStop: boolean;
  usedFamilyAsClinicalWorkforce: boolean;
  labelledSlowAsIncapacity: boolean;
}

export interface CrisisDebtState {
  level: CrisisDebtLevel;
  reasons: string[];
}

export interface ScoreState {
  clinicalReasoning: number;
  timingCoordination: number;
  equipmentReasoning: number;
  communicationAccess: number;
  authorityDignity: number;
  systemSustainability: number;
}

export interface ScenarioTimer {
  id: string;
  label: string;
  remainingSeconds: number;
  actionId?: string;
  paused: boolean;
}

export interface QueuedAction {
  actionId: string;
  lifecycle: ActionLifecycleState;
  assignedRole?: RoleId;
  equipmentIds: string[];
  blockedReasons: string[];
}

export interface PendingEvent {
  id: string;
  kind: string;
  revealAtRevision: number;
  payload: Record<string, unknown>;
}

export interface SimulationEvent {
  id: string;
  revision: number;
  timestampIso: string;
  kind: string;
  summary: string;
  visibleEvidenceIds: string[];
  actionId?: string;
  clinicalTruthChanged: boolean;
  remainingUnknown: string[];
}

export interface RichSimulationState {
  revision: number;
  engineRevision: typeof SIMULATION_ENGINE_REVISION;
  scenarioId: string;
  playPhase: PlayPhase;
  domains: {
    airway: AirwayState;
    breathing: BreathingState;
    circulation: CirculationState;
    communicationAccess: CommunicationAccessState;
  };
  equipment: Record<string, EquipmentState>;
  personnel: Record<string, PersonnelState>;
  resources: ResourceLedger;
  environment: EnvironmentState;
  authority: AuthorityState;
  family: Record<string, FamilyMemberState>;
  timers: ScenarioTimer[];
  flags: Record<string, boolean>;
  queuedActions: QueuedAction[];
  pendingEvents: PendingEvent[];
  eventLog: SimulationEvent[];
  crisisDebt: CrisisDebtState;
  score: ScoreState;
  /** Projection target for Episode 01 meters / debrief compatibility */
  legacyDomainSeed?: Partial<
    import("@/types/simulation").SimulationState
  >;
}

export interface EvidenceRequirement {
  id: string;
  description: string;
  satisfied: boolean;
}

export interface RoleRequirement {
  role: RoleId;
  /** Family roles can never satisfy this */
  clinical: true;
}

export interface EquipmentRequirement {
  equipmentId: string;
  mustBeVerified?: boolean;
  allowConditionalBackup?: boolean;
}

export interface ResourceCost {
  key: keyof ResourceLedger | string;
  amount: number;
}

export interface ConditionalEffect {
  when?: string;
  patch: PartialDeepClinical;
}

export interface FailureMode {
  id: string;
  description: string;
}

export interface GovernanceRule {
  id: string;
  description: string;
}

/** Shallow clinical patches applied by reducer after validation. */
export interface PartialDeepClinical {
  airway?: Partial<AirwayState>;
  breathing?: Partial<BreathingState>;
  circulation?: Partial<CirculationState>;
  communicationAccess?: Partial<CommunicationAccessState>;
  flags?: Record<string, boolean>;
  authorityDelta?: Partial<AuthorityState>;
  crisisDebtReasons?: string[];
}

export interface SimulationActionDefinition {
  id: string;
  label: string;
  domain: DomainId;
  description: string;
  requiredEvidence: EvidenceRequirement[];
  requiredRoles: RoleRequirement[];
  requiredEquipment: EquipmentRequirement[];
  conflictsWith: string[];
  durationSeconds?: number;
  interruptible: boolean;
  resourceCosts: ResourceCost[];
  effects: ConditionalEffect[];
  failureModes: FailureMode[];
  governanceChecks: GovernanceRule[];
  educationalBoundary?: string;
  /** Clinical family roles are never allowed */
  forbidFamilyClinicalAssignment: true;
}

export type SimulationCommand =
  | {
      type: "QUEUE_ACTION";
      actionId: string;
      assignedRole?: RoleId;
      equipmentIds?: string[];
    }
  | {
      type: "COMMIT_BUNDLE";
      actionIds: string[];
    }
  | {
      type: "SATISFY_EVIDENCE";
      evidenceId: string;
      actionId?: string;
    }
  | {
      type: "SET_COMMUNICATION_INSTRUCTION";
      instruction: "WAIT" | "STOP" | null;
    }
  | {
      type: "SET_QUESTION_ACTIVE";
      active: boolean;
    }
  | {
      type: "RECORD_ACTIVATION";
      activation: Exclude<CommunicationActivation, null>;
    }
  | {
      type: "ASSIGN_ROLE";
      role: RoleId;
      actionId: string;
    }
  | {
      type: "ENTER_EMERGENCY_OVERRIDE";
    }
  | {
      type: "EXIT_EMERGENCY_OVERRIDE";
      resumePhase: PlayPhase;
    }
  | {
      type: "PROVISIONAL_ROSC";
    }
  | {
      type: "CONFIRM_ROSC_INDEPENDENTLY";
    }
  | {
      type: "RESTORE_AAC_AFTER_RESCUE";
    }
  | {
      type: "ACKNOWLEDGE_DUPLICATE";
      actionId: string;
      mode: "closed-loop" | "independent-verification" | "acknowledgement";
    };

export interface BundleCommitResult {
  accepted: string[];
  blocked: Array<{ actionId: string; reasons: string[] }>;
  state: RichSimulationState;
}
