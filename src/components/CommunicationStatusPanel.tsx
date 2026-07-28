"use client";

import {
  COMMUNICATION_STATUS_COPY,
  capacityStatusForCommunication,
  communicationStatusFromMethod,
  methodDisplayLabel,
} from "@/engine/communication";
import type { CommunicationMethod } from "@/types/node";

const CAPACITY_COPY = {
  "not-assessed-via-motor":
    "Capacity is not tested by hand-squeeze or motor response.",
  "supported-decision-making":
    "Supported decision-making is available through Rohan’s access method.",
  "deferred-until-access":
    "Decision access is deferred until communication systems are online — not a capacity finding.",
} as const;

export function CommunicationStatusPanel({
  method,
}: {
  method: CommunicationMethod;
}) {
  const status = communicationStatusFromMethod(method);
  const capacity = capacityStatusForCommunication(status);
  const copy = COMMUNICATION_STATUS_COPY[status];

  return (
    <aside
      aria-labelledby="comm-status-heading"
      className="rounded-sm border border-[var(--color-line)] bg-[var(--color-wash)]/40 p-4"
    >
      <h2
        id="comm-status-heading"
        className="text-sm font-semibold uppercase tracking-wide text-[var(--color-accent)]"
      >
        Communication status
      </h2>
      <p className="mt-2 font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
        {copy.label}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
        {copy.detail}
      </p>
      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
          <dt className="shrink-0 font-medium text-[var(--color-ink)]">
            Method
          </dt>
          <dd className="text-[var(--color-muted)]">
            {methodDisplayLabel(method)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
          <dt className="shrink-0 font-medium text-[var(--color-ink)]">
            Capacity
          </dt>
          <dd className="text-[var(--color-muted)]">{CAPACITY_COPY[capacity]}</dd>
        </div>
      </dl>
      <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-xs text-[var(--color-muted)]">
        Communication unavailable ≠ incapacity. Family are not default answerers.
      </p>
    </aside>
  );
}
