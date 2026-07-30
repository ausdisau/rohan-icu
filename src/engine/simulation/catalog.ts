import type { SimulationActionDefinition } from "./types";

/** Minimal catalog for Phase 2 tests and Code Blue scaffolding. */
export const PHASE2_ACTION_CATALOG: Record<string, SimulationActionDefinition> =
  {
    "protect-aac": {
      id: "protect-aac",
      label: "Protect AAC access",
      domain: "communication-access",
      description:
        "Keep Rohan's communication device powered, visible, and reachable during the workup.",
      requiredEvidence: [],
      requiredRoles: [{ role: "aac-disability-access", clinical: true }],
      requiredEquipment: [],
      conflictsWith: [],
      interruptible: true,
      resourceCosts: [],
      effects: [
        {
          patch: {
            communicationAccess: {
              deviceVisible: true,
              switchReachable: true,
            },
            flags: { aacProtected: true },
          },
        },
      ],
      failureModes: [],
      governanceChecks: [],
      forbidFamilyClinicalAssignment: true,
    },
    "prepare-defibrillator": {
      id: "prepare-defibrillator",
      label: "Prepare defibrillator",
      domain: "circulation",
      description:
        "Verify defibrillator readiness. Readiness is not an indication to shock.",
      requiredEvidence: [],
      requiredRoles: [{ role: "icu-circulation", clinical: true }],
      requiredEquipment: [
        { equipmentId: "defibrillator", mustBeVerified: true },
      ],
      conflictsWith: [],
      interruptible: true,
      resourceCosts: [],
      effects: [
        {
          patch: {
            circulation: { defibrillatorReady: true },
          },
        },
      ],
      failureModes: [],
      governanceChecks: [],
      educationalBoundary:
        "Do not enter shock energy. Clinician-controlled defibrillation only.",
      forbidFamilyClinicalAssignment: true,
    },
    "replace-airway": {
      id: "replace-airway",
      label: "Replace airway route",
      domain: "airway",
      description:
        "Plan-authorised airway replacement only when evidence supports current-route failure.",
      requiredEvidence: [
        {
          id: "external-circuit-load-considered",
          description: "External circuit load considered",
          satisfied: false,
        },
        {
          id: "position-considered",
          description: "Position and alignment considered",
          satisfied: false,
        },
        {
          id: "power-continuity-considered",
          description: "Power continuity considered",
          satisfied: false,
        },
      ],
      requiredRoles: [{ role: "ent-airway", clinical: true }],
      requiredEquipment: [
        { equipmentId: "spare-trach-same-size", mustBeVerified: true },
      ],
      conflictsWith: [],
      interruptible: false,
      resourceCosts: [],
      effects: [],
      failureModes: [
        {
          id: "premature-replacement",
          description: "Replacement without evidence harms reserve.",
        },
      ],
      governanceChecks: [],
      educationalBoundary:
        "Not a procedure trainer. Equipment ready does not mean indicated.",
      forbidFamilyClinicalAssignment: true,
    },
    "assess-chest-movement": {
      id: "assess-chest-movement",
      label: "Assess chest movement",
      domain: "breathing",
      description:
        "Confirm whether ventilator cycling corresponds with effective chest movement.",
      requiredEvidence: [],
      requiredRoles: [{ role: "respiratory", clinical: true }],
      requiredEquipment: [],
      conflictsWith: [],
      interruptible: true,
      resourceCosts: [],
      effects: [
        {
          patch: {
            flags: { chestMovementAssessed: true },
          },
        },
      ],
      failureModes: [],
      governanceChecks: [],
      forbidFamilyClinicalAssignment: true,
    },
    /** G1 / F1 — borrowed circuit becomes conditional backup only */
    "assess-borrowed-circuit": {
      id: "assess-borrowed-circuit",
      label: "Assess borrowed circuit and adapter (F1)",
      domain: "breathing",
      description:
        "Bench-assess borrowed circuit/adapter. Without full clinical rehearsal it remains conditional backup, not active replacement.",
      requiredEvidence: [],
      requiredRoles: [{ role: "biomedical-engineering", clinical: true }],
      requiredEquipment: [
        {
          equipmentId: "circuit-backup-conditional",
          allowConditionalBackup: true,
        },
      ],
      conflictsWith: [],
      interruptible: true,
      resourceCosts: [],
      effects: [
        {
          patch: {
            flags: {
              borrowedCircuitAssessed: true,
              borrowedCircuitConditionalBackup: true,
            },
          },
        },
      ],
      failureModes: [],
      governanceChecks: [],
      forbidFamilyClinicalAssignment: true,
    },
    /** G1 / F2 — degraded suction to bedside reserve (not transport) */
    "assign-suction-bedside-reserve": {
      id: "assign-suction-bedside-reserve",
      label: "Assign degraded suction battery to bedside reserve (F2)",
      domain: "breathing",
      description:
        "Degraded endurance supports bedside reserve or transport, not both. Mains suction stays primary; transport remains held.",
      requiredEvidence: [],
      requiredRoles: [{ role: "biomedical-engineering", clinical: true }],
      requiredEquipment: [{ equipmentId: "portable-suction" }],
      conflictsWith: ["assign-suction-transport"],
      interruptible: true,
      resourceCosts: [],
      effects: [
        {
          patch: {
            flags: {
              suctionAssignedBedsideReserve: true,
              suctionBatteryAssignment: true,
              transportHeld: true,
              mainsSuctionPrimary: true,
            },
          },
        },
      ],
      failureModes: [],
      governanceChecks: [],
      forbidFamilyClinicalAssignment: true,
    },
    /** G1 / F6 — paid support worker non-medical only */
    "assign-paid-support-continuity": {
      id: "assign-paid-support-continuity",
      label: "Assign paid support worker within non-medical boundaries (F6)",
      domain: "communication-access",
      description:
        "AAC and personal continuity, familiar routines, low-stimulation support, approved-contact coordination, and alerting staff if access equipment is displaced. Excludes airway, circuit, ventilation, suction, cardiac monitoring, ambiguous AAC interpretation, and second-responder status.",
      requiredEvidence: [],
      requiredRoles: [{ role: "paid-support-worker", clinical: true }],
      requiredEquipment: [],
      conflictsWith: [],
      interruptible: true,
      resourceCosts: [],
      effects: [
        {
          patch: {
            flags: { paidSupportContinuityAssigned: true },
          },
        },
      ],
      failureModes: [],
      governanceChecks: [
        {
          id: "no-clinical-delegation",
          description: "Paid support worker must not replace clinical staff.",
        },
      ],
      forbidFamilyClinicalAssignment: true,
    },
    "correct-external-circuit-load": {
      id: "correct-external-circuit-load",
      label: "Correct external circuit loading",
      domain: "breathing",
      description:
        "Trained staff correct external circuit support/position. Does not manipulate or replace the airway route.",
      requiredEvidence: [],
      requiredRoles: [{ role: "respiratory", clinical: true }],
      requiredEquipment: [],
      conflictsWith: [],
      interruptible: true,
      resourceCosts: [],
      effects: [
        {
          patch: {
            breathing: { chestMovement: "stable", circuitVerified: true },
            flags: {
              externalCircuitLoadCorrected: true,
              workingInterpretationExternalLoad: true,
            },
          },
        },
      ],
      failureModes: [],
      governanceChecks: [],
      forbidFamilyClinicalAssignment: true,
    },
  };

export function cloneCatalog(): Record<string, SimulationActionDefinition> {
  return structuredClone(PHASE2_ACTION_CATALOG);
}
