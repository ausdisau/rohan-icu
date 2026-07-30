"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { ActionStations } from "@/components/ActionStations";
import { DecisionNodeView } from "@/components/DecisionNodeView";
import {
  createStationEngineState,
  stationEngineCompact,
  stationsVisibleForNode,
  type StationActionRecord,
} from "@/engine/action-stations";
import {
  loadContinuityProjection,
  projectFromCodeBlueSession,
  saveContinuityProjection,
  type ContinuityProjection,
} from "@/engine/continuity-projection";
import {
  advanceAfterConsequence,
  applyChoiceToSession,
  applyStationActionToSession,
  createSession,
  loadSession,
  saveSession,
  type SimulationSession,
} from "@/engine/session";
import { loadCodeBlueSession } from "@/engine/simulation";
import type { ActionStationsParsed } from "@/schemas/action-stations";
import type { DirectorCuesFile } from "@/schemas/director-cues";
import {
  buildDirectorInputFromEpisodeNode,
  directSceneDeterministic,
  type NarrationViewModel,
  type StoryLlmMode,
} from "@/story";
import type { EpisodeManifest, SimulationChoice, SimulationNode } from "@/types/node";

function subscribeNoop() {
  return () => {};
}

function buildInitialSession(
  manifest: EpisodeManifest,
  enableCodeBlueCarryForward: boolean,
): { session: SimulationSession; projection: ContinuityProjection | null } {
  const stored = loadSession();
  if (stored && stored.episodeId === manifest.id) {
    return { session: stored, projection: loadContinuityProjection() };
  }

  let projection: ContinuityProjection | null = null;
  if (enableCodeBlueCarryForward) {
    projection =
      loadContinuityProjection() ??
      projectFromCodeBlueSession(loadCodeBlueSession());
    if (projection.source !== "none") {
      saveContinuityProjection(projection);
    }
  }

  const session = createSession(
    manifest,
    projection?.domainOverrides,
  );
  return { session, projection };
}

const EPISODE_EDUCATIONAL_BOUNDARY =
  "Supports simulation design and facilitated learning. Not a procedure manual. No medication doses, ventilator settings, or shock energies as trainable facts. Story/LLM never owns clinical truth.";

export function EpisodePlayer({
  manifest,
  nodes,
  actionStations,
  enableCodeBlueCarryForward = false,
  debriefHref = "/debrief",
  directorCues = null,
  llmNarrationConfigured = false,
  storyLlmMode = "off",
}: {
  manifest: EpisodeManifest;
  nodes: SimulationNode[];
  actionStations: ActionStationsParsed;
  enableCodeBlueCarryForward?: boolean;
  debriefHref?: string;
  directorCues?: DirectorCuesFile | null;
  llmNarrationConfigured?: boolean;
  storyLlmMode?: StoryLlmMode;
}) {
  const router = useRouter();
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const nodeMap = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );
  const stationEngine = useMemo(
    () => createStationEngineState("pressure-rise-action-stations"),
    [],
  );
  const stationCompact = useMemo(
    () => stationEngineCompact(stationEngine),
    [stationEngine],
  );

  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<SimulationSession>(() =>
    createSession(manifest),
  );
  const [projection, setProjection] = useState<ContinuityProjection | null>(
    null,
  );
  const [showChronology, setShowChronology] = useState(true);
  const [stateBeforeChoice, setStateBeforeChoice] = useState(
    () => createSession(manifest).state,
  );
  const [enrichedByNode, setEnrichedByNode] = useState<
    Record<string, NarrationViewModel>
  >({});

  if (isClient && !hydrated) {
    setHydrated(true);
    const boot = buildInitialSession(manifest, enableCodeBlueCarryForward);
    setSession(boot.session);
    setProjection(boot.projection);
    setStateBeforeChoice(boot.session.state);
    const stored = loadSession();
    setShowChronology(!(stored && stored.episodeId === manifest.id));
  }

  const currentNode = nodeMap.get(session.currentNodeId);
  const showActionStations =
    Boolean(currentNode) &&
    stationsVisibleForNode(actionStations, session.currentNodeId);

  const directorInput = currentNode
    ? buildDirectorInputFromEpisodeNode({
        node: currentNode,
        educationalBoundary: EPISODE_EDUCATIONAL_BOUNDARY,
        chronologyLock: manifest.chronologyLock,
        compact: showActionStations
          ? {
              playPhase: stationCompact.playPhase,
              pulse: stationCompact.pulse,
              rhythm: stationCompact.rhythm,
              airwayRoute: stationCompact.airwayRoute,
              chestMovement: stationCompact.chestMovement,
              defibrillatorReady: stationCompact.defibrillatorReady,
              aacInstruction: stationCompact.aac.instruction,
              aacVisible: stationCompact.aac.visible,
              crisisDebtLevel: stationCompact.crisisDebt.level,
              provisionalRoscNeedsConfirm:
                stationCompact.provisionalRoscNeedsConfirm,
              postRoscReassessmentDue: stationCompact.postRoscReassessmentDue,
            }
          : undefined,
      })
    : null;

  const deterministicNarration = directorInput
    ? directSceneDeterministic(directorInput, { cues: directorCues })
    : null;
  const narration =
    (currentNode && enrichedByNode[currentNode.id]) || deterministicNarration;

  const currentNodeId = currentNode?.id;
  useEffect(() => {
    if (
      !directorInput ||
      !currentNodeId ||
      !llmNarrationConfigured ||
      storyLlmMode !== "openai"
    ) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/narration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...directorInput, cuePack: "episode-01" }),
        });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as {
          narration: NarrationViewModel;
        };
        if (cancelled) return;
        setEnrichedByNode((prev) => {
          if (prev[currentNodeId]) return prev;
          return { ...prev, [currentNodeId]: payload.narration };
        });
      } catch {
        // Display-only; keep deterministic framing on failure.
      }
    })();
    return () => {
      cancelled = true;
    };
    // Auto-enrich once per node enter when OpenAI mode is on.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- node id drives refresh
  }, [currentNodeId, llmNarrationConfigured, storyLlmMode]);

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
      router.push(debriefHref);
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
          Missing content for <code>{session.currentNodeId}</code>.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-8 ${
        showActionStations && !showChronology ? "max-w-none" : ""
      }`}
    >
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
            const boot = buildInitialSession(
              manifest,
              enableCodeBlueCarryForward,
            );
            const fresh = createSession(
              manifest,
              boot.projection?.domainOverrides,
            );
            setProjection(boot.projection);
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
          {projection && projection.source !== "none" ? (
            <div className="mt-4 rounded-sm border border-[var(--color-line)] bg-[var(--color-wash)] px-3 py-3 text-sm text-[var(--color-muted)]">
              <p className="font-medium text-[var(--color-ink)]">
                Carry-forward from {projection.source}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {projection.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
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
              engineCompact={stationCompact}
              equipment={stationEngine.equipment}
            />
          ) : null}
          <DecisionNodeView
            node={currentNode}
            state={session.state}
            previousState={
              session.pendingConsequence ? stateBeforeChoice : undefined
            }
            pendingConsequence={session.pendingConsequence}
            directorSummary={narration?.summary}
            directorFramingNotes={narration?.framingNotes}
            onSelectChoice={handleSelect}
            onContinue={handleContinue}
          />
        </>
      )}
    </div>
  );
}
