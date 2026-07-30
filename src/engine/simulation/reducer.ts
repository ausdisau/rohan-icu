import { withRestoredAacAfterRescue } from "./communication";
import { withEvidenceSatisfied } from "./evidence";
import { raiseCrisisDebt, scoreAuthorityHit } from "./scoring";
import type {
  BundleCommitResult,
  RichSimulationState,
  SimulationActionDefinition,
  SimulationCommand,
  SimulationEvent,
} from "./types";
import { partitionBundle, validateActionAssignment } from "./validation";

function appendEvent(
  state: RichSimulationState,
  partial: Omit<SimulationEvent, "id" | "revision" | "timestampIso">,
): RichSimulationState {
  const revision = state.revision + 1;
  const event: SimulationEvent = {
    id: `evt-${revision}`,
    revision,
    timestampIso: new Date(0).toISOString(),
    ...partial,
  };
  return {
    ...state,
    revision,
    eventLog: [...state.eventLog, event],
  };
}

function applyActionEffects(
  state: RichSimulationState,
  action: SimulationActionDefinition,
): RichSimulationState {
  let next = state;
  for (const effect of action.effects) {
    const patch = effect.patch;
    next = {
      ...next,
      domains: {
        airway: { ...next.domains.airway, ...patch.airway },
        breathing: { ...next.domains.breathing, ...patch.breathing },
        circulation: { ...next.domains.circulation, ...patch.circulation },
        communicationAccess: {
          ...next.domains.communicationAccess,
          ...patch.communicationAccess,
        },
      },
      flags: { ...next.flags, ...patch.flags },
    };
    if (patch.crisisDebtReasons?.length) {
      next = raiseCrisisDebt(next, patch.crisisDebtReasons);
    }
    if (patch.authorityDelta) {
      next = {
        ...next,
        authority: { ...next.authority, ...patch.authorityDelta },
      };
    }
  }
  return next;
}

export function reduceSimulation(
  state: RichSimulationState,
  command: SimulationCommand,
  catalog: Record<string, SimulationActionDefinition>,
): RichSimulationState {
  switch (command.type) {
    case "SATISFY_EVIDENCE": {
      const action = catalog[command.actionId ?? "replace-airway"];
      if (!action) return state;
      catalog[action.id] = withEvidenceSatisfied(action, command.evidenceId);
      if (command.actionId === "replace-airway" || !command.actionId) {
        const evidence = [
          ...new Set([
            ...state.domains.airway.evidenceForReplacement,
            command.evidenceId,
          ]),
        ];
        let next: RichSimulationState = {
          ...state,
          domains: {
            ...state.domains,
            airway: {
              ...state.domains.airway,
              evidenceForReplacement: evidence,
              replacementIndicated:
                evidence.length >= 3
                  ? true
                  : state.domains.airway.replacementIndicated,
            },
          },
        };
        next = appendEvent(next, {
          kind: "evidence-satisfied",
          summary: `Evidence considered: ${command.evidenceId}`,
          visibleEvidenceIds: [command.evidenceId],
          clinicalTruthChanged: false,
          remainingUnknown: ["Cause of alarm still unproven"],
        });
        return next;
      }
      return appendEvent(state, {
        kind: "evidence-satisfied",
        summary: `Evidence considered: ${command.evidenceId}`,
        visibleEvidenceIds: [command.evidenceId],
        clinicalTruthChanged: false,
        remainingUnknown: [],
      });
    }
    case "QUEUE_ACTION": {
      const action = catalog[command.actionId];
      if (!action) return state;
      const reasons = validateActionAssignment(
        state,
        action,
        command.assignedRole,
        command.equipmentIds ?? [],
      );
      const lifecycle =
        reasons.length > 0 ? "locked-by-evidence" : "assigned";
      const queued = [
        ...state.queuedActions.filter((item) => item.actionId !== action.id),
        {
          actionId: action.id,
          lifecycle: lifecycle as "locked-by-evidence" | "assigned",
          assignedRole: command.assignedRole,
          equipmentIds: command.equipmentIds ?? [],
          blockedReasons: reasons,
        },
      ];
      return appendEvent(
        { ...state, queuedActions: queued, playPhase: "plan" },
        {
          kind: "action-queued",
          summary: `Queued ${action.label}`,
          visibleEvidenceIds: [],
          actionId: action.id,
          clinicalTruthChanged: false,
          remainingUnknown: reasons,
        },
      );
    }
    case "COMMIT_BUNDLE": {
      const result = commitActionBundle(state, catalog, command.actionIds);
      return result.state;
    }
    case "SET_COMMUNICATION_INSTRUCTION": {
      return appendEvent(
        {
          ...state,
          domains: {
            ...state.domains,
            communicationAccess: {
              ...state.domains.communicationAccess,
              currentInstruction: command.instruction,
              questionActive:
                command.instruction === null
                  ? state.domains.communicationAccess.questionActive
                  : false,
            },
          },
        },
        {
          kind: "communication-instruction",
          summary: `Instruction set to ${command.instruction ?? "none"}`,
          visibleEvidenceIds: [],
          clinicalTruthChanged: false,
          remainingUnknown: [],
        },
      );
    }
    case "SET_QUESTION_ACTIVE": {
      if (
        command.active &&
        state.domains.communicationAccess.currentInstruction === "WAIT"
      ) {
        return appendEvent(state, {
          kind: "question-blocked",
          summary: "WAIT blocks non-emergency questioning.",
          visibleEvidenceIds: [],
          clinicalTruthChanged: false,
          remainingUnknown: [],
        });
      }
      return {
        ...state,
        revision: state.revision + 1,
        domains: {
          ...state.domains,
          communicationAccess: {
            ...state.domains.communicationAccess,
            questionActive: command.active,
          },
        },
      };
    }
    case "RECORD_ACTIVATION": {
      const access = state.domains.communicationAccess;
      let interpreted: typeof command.activation | "unknown" = command.activation;
      if (!access.questionActive) interpreted = "unknown";
      if (access.currentInstruction === "WAIT") interpreted = "unknown";
      if (access.currentInstruction === "STOP") interpreted = "unknown";

      let next: RichSimulationState = {
        ...state,
        domains: {
          ...state.domains,
          communicationAccess: {
            ...access,
            latestActivation: interpreted === "unknown" ? "unknown" : command.activation,
          },
        },
      };
      if (interpreted === "unknown" && command.activation === "yes") {
        // Attempting to treat unconstrained activation as yes is an authority hit
        // only when the learner marks silence/activation as consent — tracked by flag.
        next = scoreAuthorityHit(next, "ambiguous-activation");
      }
      return appendEvent(next, {
        kind: "activation-recorded",
        summary: `Activation interpreted as ${interpreted}`,
        visibleEvidenceIds: [],
        clinicalTruthChanged: false,
        remainingUnknown:
          interpreted === "unknown"
            ? ["Activation meaning remains unknown"]
            : [],
      });
    }
    case "ASSIGN_ROLE": {
      const person = state.personnel[command.role];
      if (!person) return state;
      if (person.status === "assigned" && person.assignedActionId !== command.actionId) {
        return appendEvent(state, {
          kind: "role-conflict",
          summary: `Role ${command.role} cannot occupy two stations`,
          visibleEvidenceIds: [],
          clinicalTruthChanged: false,
          remainingUnknown: [],
        });
      }
      return {
        ...state,
        revision: state.revision + 1,
        personnel: {
          ...state.personnel,
          [command.role]: {
            ...person,
            status: "assigned",
            assignedActionId: command.actionId,
          },
        },
      };
    }
    case "ENTER_EMERGENCY_OVERRIDE": {
      return appendEvent(
        { ...state, playPhase: "emergency-override" },
        {
          kind: "emergency-override",
          summary: "Emergency override — non-urgent planning paused",
          visibleEvidenceIds: [],
          clinicalTruthChanged: false,
          remainingUnknown: [],
        },
      );
    }
    case "EXIT_EMERGENCY_OVERRIDE": {
      return { ...state, revision: state.revision + 1, playPhase: command.resumePhase };
    }
    case "PROVISIONAL_ROSC": {
      return appendEvent(
        {
          ...state,
          domains: {
            ...state.domains,
            circulation: {
              ...state.domains.circulation,
              provisionalRosc: true,
              pulse: "fragile",
              rosCConfirmedIndependently: false,
            },
          },
          flags: {
            ...state.flags,
            postRoscReassessmentRequired: true,
            postRoscReassessmentDone: false,
          },
        },
        {
          kind: "provisional-rosc",
          summary: "Provisional ROSC — independent confirmation required",
          visibleEvidenceIds: ["pulse-return-unconfirmed"],
          clinicalTruthChanged: true,
          remainingUnknown: ["Independent confirmation pending"],
        },
      );
    }
    case "CONFIRM_ROSC_INDEPENDENTLY": {
      if (!state.domains.circulation.provisionalRosc) return state;
      return appendEvent(
        {
          ...state,
          domains: {
            ...state.domains,
            circulation: {
              ...state.domains.circulation,
              rosCConfirmedIndependently: true,
              pulse: "present",
            },
          },
          flags: {
            ...state.flags,
            postRoscReassessmentDone: true,
          },
        },
        {
          kind: "rosc-confirmed",
          summary: "ROSC independently confirmed; reassessment due",
          visibleEvidenceIds: ["independent-pulse-check"],
          clinicalTruthChanged: true,
          remainingUnknown: [],
        },
      );
    }
    case "RESTORE_AAC_AFTER_RESCUE": {
      return appendEvent(withRestoredAacAfterRescue(state), {
        kind: "aac-restored",
        summary: "AAC restored after immediate rescue permitted",
        visibleEvidenceIds: [],
        clinicalTruthChanged: false,
        remainingUnknown: [],
      });
    }
    case "ACKNOWLEDGE_DUPLICATE": {
      return appendEvent(state, {
        kind: "duplicate-acknowledged",
        summary: `Duplicate ${command.actionId} handled as ${command.mode}`,
        visibleEvidenceIds: [],
        actionId: command.actionId,
        clinicalTruthChanged: false,
        remainingUnknown: [],
      });
    }
    default: {
      const _exhaustive: never = command;
      return _exhaustive;
    }
  }
}

export function commitActionBundle(
  state: RichSimulationState,
  catalog: Record<string, SimulationActionDefinition>,
  actionIds: string[],
  assignments: Record<
    string,
    { role?: import("./types").RoleId; equipmentIds?: string[] }
  > = {},
): BundleCommitResult {
  // Prefer queued assignment metadata when present.
  const fromQueue: typeof assignments = { ...assignments };
  for (const queued of state.queuedActions) {
    if (!fromQueue[queued.actionId]) {
      fromQueue[queued.actionId] = {
        role: queued.assignedRole,
        equipmentIds: queued.equipmentIds,
      };
    }
  }

  const { accepted, blocked } = partitionBundle(
    state,
    catalog,
    actionIds,
    fromQueue,
  );

  let next = state;
  next = {
    ...next,
    playPhase: "commit",
  };

  for (const actionId of accepted) {
    const action = catalog[actionId];
    const assignment = fromQueue[actionId];
    if (assignment?.role) {
      next = {
        ...next,
        personnel: {
          ...next.personnel,
          [assignment.role]: {
            ...next.personnel[assignment.role],
            status: "assigned",
            assignedActionId: actionId,
          },
        },
      };
    }
    next = applyActionEffects(next, action);
    next = appendEvent(next, {
      kind: "action-committed",
      summary: `Committed ${action.label}`,
      visibleEvidenceIds: action.requiredEvidence
        .filter((item) => item.satisfied)
        .map((item) => item.id),
      actionId,
      clinicalTruthChanged: action.effects.length > 0,
      remainingUnknown: ["Branch consequence not assumed successful"],
    });
  }

  for (const item of blocked) {
    next = appendEvent(next, {
      kind: "action-blocked",
      summary: `Blocked ${item.actionId}: ${item.reasons.join("; ")}`,
      visibleEvidenceIds: [],
      actionId: item.actionId,
      clinicalTruthChanged: false,
      remainingUnknown: item.reasons,
    });
  }

  next = {
    ...next,
    playPhase: "resolve",
    queuedActions: next.queuedActions.map((queued) =>
      accepted.includes(queued.actionId)
        ? { ...queued, lifecycle: "committed", blockedReasons: [] }
        : blocked.some((item) => item.actionId === queued.actionId)
          ? {
              ...queued,
              lifecycle: "locked-by-evidence",
              blockedReasons:
                blocked.find((item) => item.actionId === queued.actionId)
                  ?.reasons ?? queued.blockedReasons,
            }
          : queued,
    ),
  };

  return { accepted, blocked, state: next };
}
