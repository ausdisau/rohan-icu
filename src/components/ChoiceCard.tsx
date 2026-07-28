"use client";

import { DOMAIN_LABELS, formatDelta } from "@/engine/state";
import type { SimulationChoice } from "@/types/node";
import {
  SIMULATION_STATE_KEYS,
  type SimulationStateKey,
} from "@/types/simulation";

function deltaEntries(choice: SimulationChoice) {
  return SIMULATION_STATE_KEYS.filter(
    (key) => typeof choice.domainDeltas[key] === "number",
  ).map((key) => ({
    key: key as SimulationStateKey,
    value: choice.domainDeltas[key] as number,
  }));
}

export function ChoiceCard({
  choice,
  index,
  disabled,
  onSelect,
}: {
  choice: SimulationChoice;
  index: number;
  disabled?: boolean;
  onSelect: (choice: SimulationChoice) => void;
}) {
  const deltas = deltaEntries(choice);
  const letter = String.fromCharCode(65 + index);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(choice)}
      className="group w-full rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-left transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-wash)]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-60"
      aria-describedby={`choice-${choice.id}-deltas`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[var(--color-accent)] text-sm font-semibold text-white"
        >
          {letter}
        </span>
        <div className="min-w-0 flex-1">
          <span className="block text-base font-medium text-[var(--color-ink)]">
            {choice.label}
          </span>
          {choice.rohanAacLine ? (
            <span className="mt-2 block text-sm text-[var(--color-accent)]">
              Rohan may answer: {choice.rohanAacLine}
            </span>
          ) : null}
          <ul
            id={`choice-${choice.id}-deltas`}
            className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-muted)]"
          >
            {deltas.map(({ key, value }) => (
              <li
                key={key}
                className="rounded-sm bg-[var(--color-wash)] px-2 py-1"
              >
                {DOMAIN_LABELS[key]} {formatDelta(value)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </button>
  );
}
