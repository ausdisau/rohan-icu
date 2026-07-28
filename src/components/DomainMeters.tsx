"use client";

import {
  DOMAIN_LABELS,
  HIGHER_IS_WORSE,
  formatDelta,
} from "@/engine/state";
import type { SimulationState, SimulationStateKey } from "@/types/simulation";
import { SIMULATION_STATE_KEYS } from "@/types/simulation";

const PRIORITY_KEYS: SimulationStateKey[] = [
  "infectionControl",
  "renalReserve",
  "communicationAccess",
  "respiratoryStability",
  "cardiacReserve",
  "sedationDepth",
  "restraintExposure",
  "familyBurden",
  "homeReadiness",
  "schoolAccess",
  "authorshipControl",
];

function keysToShow(
  highlightKeys?: SimulationStateKey[],
): SimulationStateKey[] {
  if (highlightKeys && highlightKeys.length > 0) {
    return highlightKeys.filter((k) => SIMULATION_STATE_KEYS.includes(k));
  }
  return PRIORITY_KEYS;
}

export function DomainMeters({
  state,
  previousState,
  highlightKeys,
}: {
  state: SimulationState;
  previousState?: SimulationState;
  highlightKeys?: SimulationStateKey[];
}) {
  const keys = keysToShow(highlightKeys);

  return (
    <section
      aria-labelledby="domain-meters-heading"
      className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="domain-meters-heading"
          className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]"
        >
          Domain status
        </h2>
        <p className="text-xs text-[var(--color-muted)]">
          Multi-domain view — not a score
        </p>
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {keys.map((key) => {
          const value = state[key];
          const prev = previousState?.[key];
          const delta =
            typeof prev === "number" ? value - prev : undefined;
          const worseHigh = HIGHER_IS_WORSE.has(key);
          return (
            <li key={key}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-[var(--color-ink)]">
                  {DOMAIN_LABELS[key]}
                </span>
                <span className="tabular-nums text-[var(--color-muted)]">
                  {Math.round(value)}
                  {typeof delta === "number" && delta !== 0 ? (
                    <span
                      className={`ml-2 ${
                        (delta > 0 && !worseHigh) || (delta < 0 && worseHigh)
                          ? "text-[var(--color-accent)]"
                          : "text-[var(--color-warning)]"
                      }`}
                    >
                      ({formatDelta(delta)})
                    </span>
                  ) : null}
                </span>
              </div>
              <div
                className="mt-1 h-2 overflow-hidden rounded-sm bg-[var(--color-wash)]"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(value)}
                aria-label={DOMAIN_LABELS[key]}
              >
                <div
                  className="h-full bg-[var(--color-accent)] transition-[width] duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
