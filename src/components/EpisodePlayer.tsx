"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ActionStations } from "@/components/ActionStations";
import { DecisionNodeView } from "@/components/DecisionNodeView";
import {
  stationsVisibleForNode,
  type StationActionRecord,
} from "@/engine/action-stations";
import {
  advanceAfterConsequence,
  applyChoiceToSession,
  applyStationActionToSession,
  createSession,
  saveSession,
  type SimulationSession,
} from "@/engine/session";
import type { ActionStationsParsed } from "@/schemas/action-stations";
import type { EpisodeManifest, SimulationChoice, SimulationNode } from "@/types/node";

export function EpisodePlayer({
  manifest,
  nodes,
  actionStations,
}: {
  manifest: EpisodeManifest;
  nodes: SimulationNode[];
  actionStations: ActionStationsParsed;
}) {
  const router = useRouter();
  const nodeMap = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );

  const [session, setSession] = useState<SimulationSession>(() =>
    createSession(manifest),
  );
  const [showChronology, setShowChronology] = useState(true);
  const [stateBeforeChoice, setStateBeforeChoice] = useState(
    () => createSession(manifest).state,
  );

  const currentNode = nodeMap.get(session.currentNodeId);
  const showActionStations =
    Boolean(currentNode) &&
    stationsVisibleForNode(actionStations, session.currentNodeId);

  function persist(next: SimulationSession) {
    setSession(next);
    saveSession(next);
  }

  function handleSelect(choice: SimulationChoice) {
    if (!currentNode || session.pendingConsequence) return;
    setStateBeforeChoice(session.state);
    const next = applyChoiceToSession(session, currentNode, choice);
    persist(next);
  }

  function handleContinue() {
    if (!currentNode || !session.pendingConsequence) return;
    const choice = currentNode.choices.find(
      (c) => c.id === session.pendingConsequence?.choiceId,
    );
    if (!choice) return;

    const next = advanceAfterConsequence(session, choice, currentNode);
    persist(next);

    if (next.completed) {
      router.push("/debrief");
    }
  }

  function handleStationAction(record: StationActionRecord) {
    persist(applyStationActionToSession(session, record));
  }

  if (!currentNode) {
    return (
      <div className="rounded-sm border border-[var(--color-warning)] bg-[var(--color-surface)] p-5">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)]">
          Node not found
        </h1>
        <p className="mt-2 text-[var(--color-muted)]">
          Missing content for <code>{session.currentNodeId}</code>. Check{" "}
          <code>content/episodes/breathing-room/nodes/</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-[var(--color-accent)]">
            {manifest.subtitle ?? "Episode"}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {manifest.title} · v{manifest.version}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const fresh = createSession(manifest);
            setStateBeforeChoice(fresh.state);
            setShowChronology(true);
            persist(fresh);
          }}
          className="rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-wash)]"
        >
          Restart episode
        </button>
      </div>

      {showChronology ? (
        <section
          aria-labelledby="chronology-heading"
          className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
        >
          <h2
            id="chronology-heading"
            className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]"
          >
            Locked chronology
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-[var(--color-muted)]">
            {manifest.chronologyLock.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setShowChronology(false)}
            className="mt-5 inline-flex rounded-sm bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-focus)]"
          >
            Enter ICU with Rohan
          </button>
        </section>
      ) : (
        <>
          {showActionStations ? (
            <ActionStations
              reference={actionStations}
              nodeId={currentNode.id}
              onStationAction={handleStationAction}
            />
          ) : null}
          <DecisionNodeView
            node={currentNode}
            state={session.state}
            previousState={
              session.pendingConsequence ? stateBeforeChoice : undefined
            }
            pendingConsequence={session.pendingConsequence}
            onSelectChoice={handleSelect}
            onContinue={handleContinue}
          />
        </>
      )}
    </div>
  );
}
