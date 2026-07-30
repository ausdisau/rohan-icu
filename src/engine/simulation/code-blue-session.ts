/**
 * Code Blue PlayShell session — content graph + rich engine state.
 * Draft selection stays local; only commits / emergency commands mutate clinical truth.
 */

import type {
  CodeBlueActionsFile,
  CodeBlueEventsFile,
  CodeBlueManifest,
  CodeBlueScenarioNode,
} from "@/schemas/code-blue";

import { cloneCatalog } from "./catalog";
import { createInitialRichState } from "./create-initial";
import {
  parseRichState,
  serializeRichState,
  SimulationPersistenceError,
} from "./persistence";
import { commitActionBundle, reduceSimulation } from "./reducer";
import type {
  BundleCommitResult,
  RichSimulationState,
  RoleId,
  SimulationActionDefinition,
} from "./types";

export const CODE_BLUE_STORAGE_KEY = "breathing-room-code-blue-session";

export interface CodeBluePlaySession {
  version: 1;
  currentNodeId: string;
  richState: RichSimulationState;
  /** Events the player has fired (content interrupt / pressure triggers). */
  firedEvents: string[];
  /** Actions successfully committed this run (for exitConditions). */
  committedActionIds: string[];
  completed: boolean;
  statusMessage: string;
  lastCommit?: {
    accepted: string[];
    blocked: Array<{ actionId: string; reasons: string[] }>;
  };
}

export function createCodeBlueSession(
  manifest: CodeBlueManifest,
): CodeBluePlaySession {
  return {
    version: 1,
    currentNodeId: manifest.startNodeId,
    richState: createInitialRichState(manifest.id),
    firedEvents: [],
    committedActionIds: [],
    completed: false,
    statusMessage: "Draft actions do not change clinical state until you commit.",
  };
}

export function saveCodeBlueSession(session: CodeBluePlaySession): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(
    CODE_BLUE_STORAGE_KEY,
    JSON.stringify({
      ...session,
      richStateJson: serializeRichState(session.richState),
      richState: undefined,
    }),
  );
}

export function loadCodeBlueSession(): CodeBluePlaySession | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(CODE_BLUE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      version: 1;
      currentNodeId: string;
      richStateJson?: string;
      richState?: RichSimulationState;
      firedEvents: string[];
      committedActionIds: string[];
      completed: boolean;
      statusMessage: string;
      lastCommit?: CodeBluePlaySession["lastCommit"];
    };
    if (parsed.version !== 1 || !parsed.currentNodeId) return null;
    const richState = parsed.richStateJson
      ? parseRichState(parsed.richStateJson)
      : parsed.richState
        ? parseRichState(serializeRichState(parsed.richState))
        : null;
    if (!richState) return null;
    return {
      version: 1,
      currentNodeId: parsed.currentNodeId,
      richState,
      firedEvents: parsed.firedEvents ?? [],
      committedActionIds: parsed.committedActionIds ?? [],
      completed: Boolean(parsed.completed),
      statusMessage: parsed.statusMessage ?? "",
      lastCommit: parsed.lastCommit,
    };
  } catch (err) {
    if (err instanceof SimulationPersistenceError) return null;
    return null;
  }
}

export function defaultRoleForAction(
  action: SimulationActionDefinition,
): RoleId | undefined {
  return action.requiredRoles[0]?.role;
}

export function buildAssignments(
  actionIds: string[],
  catalog: Record<string, SimulationActionDefinition>,
): Record<string, { role?: RoleId; equipmentIds?: string[] }> {
  const assignments: Record<
    string,
    { role?: RoleId; equipmentIds?: string[] }
  > = {};
  for (const actionId of actionIds) {
    const action = catalog[actionId];
    if (!action) continue;
    const role = defaultRoleForAction(action);
    const equipmentIds = action.requiredEquipment.map(
      (item) => item.equipmentId,
    );
    assignments[actionId] = { role, equipmentIds };
  }
  return assignments;
}

export function commitDraftBundle(
  session: CodeBluePlaySession,
  draftActionIds: string[],
): { session: CodeBluePlaySession; result: BundleCommitResult } {
  const catalog = cloneCatalog();
  const assignments = buildAssignments(draftActionIds, catalog);
  const result = commitActionBundle(
    session.richState,
    catalog,
    draftActionIds,
    assignments,
  );
  const newlyAccepted = result.accepted.filter(
    (id) => !session.committedActionIds.includes(id),
  );
  const next: CodeBluePlaySession = {
    ...session,
    richState: result.state,
    committedActionIds: [...session.committedActionIds, ...newlyAccepted],
    lastCommit: {
      accepted: result.accepted,
      blocked: result.blocked,
    },
    statusMessage:
      result.accepted.length === 0 && result.blocked.length > 0
        ? "Commit blocked — see reasons. Draft never mutated clinical truth until accept."
        : `Committed ${result.accepted.length}; blocked ${result.blocked.length}. Duplicates confirm, they do not repeat.`,
  };
  return { session: next, result };
}

export function exitConditionReady(
  exit: CodeBlueScenarioNode["exitConditions"][number],
  session: CodeBluePlaySession,
): boolean {
  if (exit.requiresEvent && !session.firedEvents.includes(exit.requiresEvent)) {
    return false;
  }
  if (exit.requiresActions?.length) {
    const allCommitted = exit.requiresActions.every((id) =>
      session.committedActionIds.includes(id),
    );
    if (!allCommitted) return false;
  }
  return true;
}

/** Exits that need only a player-triggered event (or are already ready). */
export function listAdvanceOptions(
  node: CodeBlueScenarioNode,
  session: CodeBluePlaySession,
  events: CodeBlueEventsFile,
): Array<{
  exit: CodeBlueScenarioNode["exitConditions"][number];
  eventLabel?: string;
  ready: boolean;
  missing: string[];
}> {
  const eventMap = new Map(events.events.map((event) => [event.id, event]));
  return node.exitConditions.map((exit) => {
    const missing: string[] = [];
    if (exit.requiresEvent && !session.firedEvents.includes(exit.requiresEvent)) {
      missing.push(`event:${exit.requiresEvent}`);
    }
    if (exit.requiresActions?.length) {
      for (const actionId of exit.requiresActions) {
        if (!session.committedActionIds.includes(actionId)) {
          missing.push(`action:${actionId}`);
        }
      }
    }
    const event = exit.requiresEvent
      ? eventMap.get(exit.requiresEvent)
      : undefined;
    return {
      exit,
      eventLabel: event?.label,
      ready: missing.length === 0,
      missing,
    };
  });
}

export function advanceViaExit(
  session: CodeBluePlaySession,
  exit: CodeBlueScenarioNode["exitConditions"][number],
): CodeBluePlaySession {
  if (!exitConditionReady(exit, session)) {
    return {
      ...session,
      statusMessage: "Exit conditions not met yet.",
    };
  }

  let richState = session.richState;
  const catalog = cloneCatalog();
  const firedEvents = [...session.firedEvents];

  if (exit.requiresEvent && !firedEvents.includes(exit.requiresEvent)) {
    firedEvents.push(exit.requiresEvent);
  }

  if (exit.emergencyOverride && richState.playPhase !== "emergency-override") {
    richState = reduceSimulation(
      richState,
      { type: "ENTER_EMERGENCY_OVERRIDE" },
      catalog,
    );
  }

  if (exit.nextNodeId === "cb-provisional-rosc") {
    richState = reduceSimulation(richState, { type: "PROVISIONAL_ROSC" }, catalog);
  }

  if (exit.nextNodeId === null) {
    return {
      ...session,
      richState: {
        ...richState,
        playPhase: "reflect",
      },
      firedEvents,
      completed: true,
      statusMessage: "Slice complete — open debrief reflection prompts below.",
      currentNodeId: session.currentNodeId,
    };
  }

  return {
    ...session,
    richState,
    firedEvents,
    currentNodeId: exit.nextNodeId,
    statusMessage: `Advanced to ${exit.nextNodeId}.`,
    completed: false,
  };
}

/** Fire a content event then advance if a matching exit becomes ready. */
export function fireEvent(
  session: CodeBluePlaySession,
  node: CodeBlueScenarioNode,
  eventId: string,
): CodeBluePlaySession {
  if (session.firedEvents.includes(eventId)) {
    return { ...session, statusMessage: `Event ${eventId} already acknowledged.` };
  }

  const withEvent: CodeBluePlaySession = {
    ...session,
    firedEvents: [...session.firedEvents, eventId],
    statusMessage: `Event fired: ${eventId}`,
  };

  const matching = node.exitConditions.find(
    (exit) => exit.requiresEvent === eventId && exitConditionReady(exit, withEvent),
  );
  if (matching) {
    return advanceViaExit(withEvent, matching);
  }
  return withEvent;
}

export function applySpecialCommand(
  session: CodeBluePlaySession,
  command:
    | { type: "CONFIRM_ROSC_INDEPENDENTLY" }
    | { type: "RESTORE_AAC_AFTER_RESCUE" },
): CodeBluePlaySession {
  const catalog = cloneCatalog();
  const richState = reduceSimulation(session.richState, command, catalog);
  return {
    ...session,
    richState,
    statusMessage:
      command.type === "CONFIRM_ROSC_INDEPENDENTLY"
        ? "Independent confirmation recorded. Reassessment remains in focus."
        : "AAC restored after rescue. Address Rohan directly; silence is not consent.",
  };
}

export function actionMeta(
  actions: CodeBlueActionsFile,
  actionId: string,
): CodeBlueActionsFile["actions"][number] | undefined {
  return actions.actions.find((action) => action.id === actionId);
}
