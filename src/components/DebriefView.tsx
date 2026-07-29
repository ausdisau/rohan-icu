"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CanonPrognosisBlade } from "@/components/CanonPrognosisBlade";
import { DomainMeters } from "@/components/DomainMeters";
import {
  generateDebrief,
  type EnrichedDebriefPayload,
} from "@/engine/debrief";
import { DOMAIN_LABELS, formatDelta } from "@/engine/state";
import { loadSession, type SimulationSession } from "@/engine/session";
import { SIMULATION_STATE_KEYS } from "@/types/simulation";

function EmptyDebrief() {
  return (
    <div className="flex flex-col gap-6">
      <header className="border-b border-[var(--color-line)] pb-6">
        <p className="text-sm uppercase tracking-wide text-[var(--color-accent)]">
          Debrief
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)]">
          No completed pathway yet
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--color-muted)]">
          Play through the episode first. Debrief is built from your choice
          history and domain deltas — not from survival alone.
        </p>
      </header>
      <Link
        href="/episode"
        className="self-start rounded-sm bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-focus)]"
      >
        Open episode player
      </Link>
    </div>
  );
}

export function DebriefView() {
  const [session, setSession] = useState<SimulationSession | null | undefined>(
    undefined,
  );

  useEffect(() => {
    setSession(loadSession());
  }, []);

  const payload: EnrichedDebriefPayload | null = useMemo(() => {
    if (!session || session.history.length === 0) return null;
    return generateDebrief(session);
  }, [session]);

  if (session === undefined) {
    return (
      <p className="text-[var(--color-muted)]" aria-live="polite">
        Loading debrief…
      </p>
    );
  }

  if (!payload) {
    return <EmptyDebrief />;
  }

  const movedKeys = SIMULATION_STATE_KEYS.filter(
    (key) => typeof payload.netDeltas[key] === "number",
  );

  return (
    <div className="flex flex-col gap-10">
      <header className="border-b border-[var(--color-line)] pb-6">
        <p className="text-sm uppercase tracking-wide text-[var(--color-accent)]">
          Personalised debrief
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)]">
          Beyond ROSC
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--color-muted)]">
          This debrief reads your pathway through clinical trade-offs,
          communication access, and rights — not a single physiology or survival
          score. The story continues.
        </p>
      </header>

      <CanonPrognosisBlade
        mode="debrief"
        state={payload.finalState}
        historyNodeIds={
          session?.history.map((entry) => entry.nodeId) ?? []
        }
      />

      <section aria-labelledby="highlights-heading">
        <h2
          id="highlights-heading"
          className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)]"
        >
          Pathway highlights
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["Clinically strong decision", payload.highlights.clinicallyStrong],
              ["Rights-preserving decision", payload.highlights.rightsPreserving],
              ["Delayed harm risk", payload.highlights.delayedHarm],
              [
                "Legitimate uncertainty",
                payload.highlights.legitimateUncertainty,
              ],
              ["Rohan’s question", payload.highlights.rohanQuestion],
            ] as const
          ).map(([title, body]) => (
            <div
              key={title}
              className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
            >
              <dt className="text-sm font-semibold text-[var(--color-accent)]">
                {title}
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                {body}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="noticed-heading">
          <h2
            id="noticed-heading"
            className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]"
          >
            What you noticed
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[var(--color-muted)]">
            {payload.whatNoticed.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="missed-heading">
          <h2
            id="missed-heading"
            className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]"
          >
            What you may have missed
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[var(--color-muted)]">
            {payload.whatMissed.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="categories-heading" className="flex flex-col gap-4">
        <h2
          id="categories-heading"
          className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)]"
        >
          Structured categories
        </h2>
        {payload.categories.map((category) => (
          <article
            key={category.id}
            className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
            aria-labelledby={`cat-${category.id}`}
          >
            <h3
              id={`cat-${category.id}`}
              className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]"
            >
              {category.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
              {category.summary}
            </p>
            {category.relatedChoices.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {category.relatedChoices.map((label) => (
                  <li
                    key={`${category.id}-${label}`}
                    className="rounded-sm bg-[var(--color-wash)] px-2 py-1 text-xs text-[var(--color-ink)]"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </section>

      <section aria-labelledby="history-heading">
        <h2
          id="history-heading"
          className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]"
        >
          Choice history
        </h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-[var(--color-muted)]">
          {session?.history.map((entry) => (
            <li key={`${entry.nodeId}-${entry.choiceId}-${entry.timestampIso}`}>
              <span className="font-medium text-[var(--color-ink)]">
                {entry.label}
              </span>
              <span className="mt-1 block text-sm">
                {entry.immediateConsequence}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="net-heading" className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2
            id="net-heading"
            className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]"
          >
            Net domain deltas
          </h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Improvements and harms coexist. None of these collapse into one
            health score.
          </p>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {movedKeys.length === 0 ? (
              <li className="text-[var(--color-muted)]">No domain movement.</li>
            ) : (
              movedKeys.map((key) => (
                <li
                  key={key}
                  className="flex justify-between gap-4 border-b border-[var(--color-line)] py-2"
                >
                  <span>{DOMAIN_LABELS[key]}</span>
                  <span className="tabular-nums text-[var(--color-accent)]">
                    {formatDelta(payload.netDeltas[key] as number)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
        <DomainMeters state={payload.finalState} />
      </section>

      <section
        aria-labelledby="hook-heading"
        className="rounded-sm border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)]/40 p-5"
      >
        <h2
          id="hook-heading"
          className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]"
        >
          Next episode hook
        </h2>
        <p className="mt-3 leading-relaxed text-[var(--color-muted)]">
          {payload.nextEpisodeHook}
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/episode"
          className="rounded-sm border border-[var(--color-line)] px-5 py-2.5 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-wash)]"
        >
          Replay episode
        </Link>
        <Link
          href="/"
          className="rounded-sm bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-focus)]"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
