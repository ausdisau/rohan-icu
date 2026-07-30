import {
  SIMULATION_ENGINE_REVISION,
  type RichSimulationState,
} from "./types";

export class SimulationPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimulationPersistenceError";
  }
}

export function serializeRichState(state: RichSimulationState): string {
  return JSON.stringify(state);
}

export function parseRichState(raw: string): RichSimulationState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SimulationPersistenceError("Invalid JSON for rich simulation state.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new SimulationPersistenceError("Rich simulation state must be an object.");
  }

  const state = parsed as RichSimulationState;
  if (state.engineRevision !== SIMULATION_ENGINE_REVISION) {
    throw new SimulationPersistenceError(
      `Unsupported simulation engineRevision ${String(state.engineRevision)}; expected ${SIMULATION_ENGINE_REVISION}.`,
    );
  }
  if (typeof state.revision !== "number" || !Array.isArray(state.eventLog)) {
    throw new SimulationPersistenceError(
      "Rich simulation state missing revision or eventLog.",
    );
  }
  return state;
}

/** Round-trip helper for deterministic save/reload tests. */
export function roundTripRichState(
  state: RichSimulationState,
): RichSimulationState {
  return parseRichState(serializeRichState(state));
}
