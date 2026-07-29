"use client";

import { useEffect, useRef } from "react";

import { AccessibleMediaPlayer } from "@/components/AccessibleMediaPlayer";
import { CanonPrognosisBlade } from "@/components/CanonPrognosisBlade";
import { ChoiceCard } from "@/components/ChoiceCard";
import { CommunicationStatusPanel } from "@/components/CommunicationStatusPanel";
import { DomainMeters } from "@/components/DomainMeters";
import {
  KitGallery,
  shouldUseKitGallery,
} from "@/components/KitGallery";
import { RohanAacPanel } from "@/components/RohanAacPanel";
import { methodDisplayLabel } from "@/engine/communication";
import type { AppliedChoiceRecord } from "@/engine/session";
import type { SimulationChoice, SimulationNode } from "@/types/node";
import type { SimulationState } from "@/types/simulation";

export function DecisionNodeView({
  node,
  state,
  previousState,
  pendingConsequence,
  addressLine,
  onSelectChoice,
  onContinue,
}: {
  node: SimulationNode;
  state: SimulationState;
  previousState?: SimulationState;
  pendingConsequence: AppliedChoiceRecord | null;
  addressLine?: string;
  onSelectChoice: (choice: SimulationChoice) => void;
  onContinue: () => void;
}) {
  const choosing = !pendingConsequence;
  const consequenceHeadingRef = useRef<HTMLHeadingElement>(null);
  // Only surface Rohan's line after a choice — do not preview another branch's AAC.
  const aacLine = pendingConsequence?.rohanAacLine;

  useEffect(() => {
    if (!pendingConsequence) return;
    consequenceHeadingRef.current?.focus();
  }, [pendingConsequence]);

  return (
    <div className="flex flex-col gap-8">
      <header className="border-b border-[var(--color-line)] pb-6">
        <p className="text-sm uppercase tracking-wide text-[var(--color-accent)]">
          Decision with Rohan
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)]">
          {node.title}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-[var(--color-muted)]">
          {addressLine ??
            "Rohan, we are deciding with you — not about you in your absence. Staff will wait for your access method."}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="narrative-heading" className="prose-clinical">
            <h2
              id="narrative-heading"
              className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]"
            >
              Opening
            </h2>
            <p className="mt-3">{node.openingNarrative}</p>
          </section>

          <section aria-labelledby="clinical-heading">
            <h2
              id="clinical-heading"
              className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]"
            >
              Clinical state
            </h2>
            <p className="mt-3 max-w-3xl text-[var(--color-muted)] leading-relaxed">
              {node.clinicalState}
            </p>
          </section>

          {node.media && node.media.length > 0 ? (
            <section aria-labelledby="media-heading" className="flex flex-col gap-4">
              <h2
                id="media-heading"
                className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]"
              >
                {shouldUseKitGallery(node.media)
                  ? "Emergency kit"
                  : "Media"}
              </h2>
              {shouldUseKitGallery(node.media) ? (
                <KitGallery media={node.media} />
              ) : (
                node.media.map((item) => (
                  <AccessibleMediaPlayer key={item.id} media={item} />
                ))
              )}
            </section>
          ) : null}

          {pendingConsequence ? (
            <section
              aria-labelledby="consequence-heading"
              className="rounded-sm border border-[var(--color-accent)] bg-[var(--color-surface)] p-5"
              aria-live="polite"
            >
              <h2
                id="consequence-heading"
                ref={consequenceHeadingRef}
                tabIndex={-1}
                className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                What followed
              </h2>
              <p className="mt-2 text-sm font-medium text-[var(--color-accent)]">
                You chose: {pendingConsequence.label}
              </p>
              <p className="mt-3 text-[var(--color-muted)] leading-relaxed">
                <span className="font-medium text-[var(--color-ink)]">
                  Immediate:{" "}
                </span>
                {pendingConsequence.immediateConsequence}
              </p>
              <p className="mt-2 text-[var(--color-muted)] leading-relaxed">
                <span className="font-medium text-[var(--color-ink)]">
                  Delayed:{" "}
                </span>
                {pendingConsequence.delayedConsequence}
              </p>
              <button
                type="button"
                onClick={onContinue}
                className="mt-5 inline-flex items-center justify-center rounded-sm bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-focus)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                Continue
              </button>
            </section>
          ) : (
            <section aria-labelledby="choices-heading">
              <h2
                id="choices-heading"
                className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]"
              >
                Choices
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">
                There is no single correct answer. Each option moves domains in
                tension. Address Rohan first; do not default to family as
                answerers.
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {node.choices.map((choice, index) => (
                  <li key={choice.id}>
                    <ChoiceCard
                      choice={choice}
                      index={index}
                      disabled={!choosing}
                      onSelect={onSelectChoice}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <CommunicationStatusPanel method={node.communicationMethod} />
          <RohanAacPanel
            line={aacLine}
            methodLabel={methodDisplayLabel(node.communicationMethod)}
          />
          <CanonPrognosisBlade
            node={node}
            state={state}
            previousState={previousState}
            mode="play"
            announcePrognosis={Boolean(pendingConsequence)}
          />
          <DomainMeters state={state} previousState={previousState} />
        </div>
      </div>
    </div>
  );
}
