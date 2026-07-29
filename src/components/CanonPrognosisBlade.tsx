"use client";

import { useEffect, useId, useMemo, useState } from "react";

import {
  buildCanonHeldChecklist,
  evaluateCanonContext,
} from "@/engine/canon";
import {
  buildPrognosisReport,
  outlookBandLabel,
} from "@/engine/prognosis";
import { computeNetDeltas } from "@/engine/state";
import type { SimulationNode } from "@/types/node";
import type { OutlookBand } from "@/types/prognosis";
import type { SimulationState } from "@/types/simulation";
import { createInitialSimulationState } from "@/types/simulation";

const BLADE_OPEN_KEY = "rohan-icu-canon-prognosis-blade-open";

function bandClass(band: OutlookBand): string {
  switch (band) {
    case "improving":
      return "border-[var(--color-accent)]/50 bg-[var(--color-accent-soft)]/40 text-[var(--color-accent)]";
    case "stable":
      return "border-[var(--color-line)] bg-[var(--color-wash)] text-[var(--color-ink)]";
    case "fragile":
      return "border-[var(--color-warning)]/60 bg-[var(--color-warning)]/10 text-[var(--color-ink)]";
    case "worsening":
      return "border-[var(--color-warning)] bg-[var(--color-warning)]/15 text-[var(--color-ink)]";
    default: {
      const _exhaustive: never = band;
      return _exhaustive;
    }
  }
}

export function CanonPrognosisBlade({
  node,
  state,
  previousState,
  mode = "play",
  historyNodeIds = [],
  announcePrognosis = false,
}: {
  node?: SimulationNode;
  state: SimulationState;
  previousState?: SimulationState;
  mode?: "play" | "debrief";
  historyNodeIds?: string[];
  /** When true, politely announce prognosis summary (after a choice). */
  announcePrognosis?: boolean;
}) {
  const reactId = useId();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(BLADE_OPEN_KEY);
      if (stored === "0") setOpen(false);
      if (stored === "1") setOpen(true);
    } catch {
      // ignore
    }
  }, []);

  function toggleOpen() {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(BLADE_OPEN_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  const canon = useMemo(() => {
    if (!node) {
      return evaluateCanonContext({
        nodeId: "debrief",
        phaseId: "debrief",
        title: "Debrief",
        openingNarrative: "Beyond ROSC personalised debrief.",
        clinicalState: "Pathway complete.",
        communicationMethod: "voice-output",
      });
    }
    return evaluateCanonContext({
      nodeId: node.id,
      phaseId: node.phaseId,
      title: node.title,
      openingNarrative: node.openingNarrative,
      clinicalState: node.clinicalState,
      communicationMethod: node.communicationMethod,
      disabilityRightsNotes: node.disabilityRightsNotes,
    });
  }, [node]);

  const net = useMemo(() => {
    if (previousState) return computeNetDeltas(previousState, state);
    if (mode === "debrief") {
      return computeNetDeltas(createInitialSimulationState(), state);
    }
    return undefined;
  }, [previousState, state, mode]);

  const prognosis = useMemo(
    () => buildPrognosisReport(state, net),
    [state, net],
  );

  const canonHeld =
    mode === "debrief" ? buildCanonHeldChecklist(historyNodeIds) : null;

  return (
    <aside
      className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)]"
      aria-labelledby={`${reactId}-blade-heading`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-line)] p-4">
        <div>
          <h2
            id={`${reactId}-blade-heading`}
            className="text-sm font-semibold uppercase tracking-wide text-[var(--color-accent)]"
          >
            Canon &amp; prognosis
          </h2>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Multi-domain outlook — not a survival score.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={open}
          aria-controls={`${reactId}-blade-body`}
          className="shrink-0 rounded-sm border border-[var(--color-line)] px-2 py-1 text-xs text-[var(--color-ink)] hover:bg-[var(--color-wash)]"
        >
          {open ? "Collapse" : "Expand"}
        </button>
      </div>

      {open ? (
        <div id={`${reactId}-blade-body`} className="flex flex-col gap-5 p-4">
          <section aria-labelledby={`${reactId}-canon-heading`}>
            <h3
              id={`${reactId}-canon-heading`}
              className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink)]"
            >
              Canon
            </h3>
            <p className="mt-2 text-xs font-medium text-[var(--color-muted)]">
              Locked chronology
            </p>
            <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-[var(--color-muted)]">
              {canon.chronologyLock.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
            {canon.activePrinciples.length > 0 ? (
              <>
                <p className="mt-3 text-xs font-medium text-[var(--color-muted)]">
                  Active principles
                </p>
                <ul className="mt-1 flex flex-col gap-2">
                  {canon.activePrinciples.map((principle) => (
                    <li
                      key={principle.id}
                      className="rounded-sm bg-[var(--color-wash)]/80 px-2 py-1.5 text-xs leading-relaxed text-[var(--color-ink)]"
                    >
                      {principle.text}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {canon.consentReminders.length > 0 ? (
              <>
                <p className="mt-3 text-xs font-medium text-[var(--color-muted)]">
                  Consent reminder
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[var(--color-muted)]">
                  {canon.consentReminders.map((item) => (
                    <li key={item.id}>{item.rule}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          <section aria-labelledby={`${reactId}-prognosis-heading`}>
            <h3
              id={`${reactId}-prognosis-heading`}
              className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink)]"
            >
              Prognosis outlook
            </h3>
            <p
              className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]"
              aria-live={announcePrognosis ? "polite" : undefined}
            >
              {prognosis.summaryLines.join(" ")}
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {prognosis.groups.map((group) => (
                <li
                  key={group.id}
                  className="rounded-sm border border-[var(--color-line)] p-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[var(--color-ink)]">
                      {group.title}
                    </span>
                    <span
                      className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${bandClass(group.band)}`}
                    >
                      {outlookBandLabel(group.band)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-[var(--color-muted)]">
                    {group.summary}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[10px] leading-relaxed text-[var(--color-muted)]">
              {prognosis.disclaimer}
            </p>
          </section>

          {canonHeld ? (
            <section aria-labelledby={`${reactId}-held-heading`}>
              <h3
                id={`${reactId}-held-heading`}
                className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink)]"
              >
                Canon held
              </h3>
              <ul className="mt-2 flex flex-col gap-2">
                {canonHeld.map((item) => (
                  <li
                    key={item.id}
                    className="flex gap-2 text-xs leading-relaxed text-[var(--color-muted)]"
                  >
                    <span aria-hidden="true">{item.held ? "✓" : "○"}</span>
                    <span>
                      <span className="sr-only">
                        {item.held ? "Held: " : "Not confirmed: "}
                      </span>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
