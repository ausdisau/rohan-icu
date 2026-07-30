"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import {
  actionMeta,
  advanceViaExit,
  applySpecialCommand,
  commitDraftBundle,
  createCodeBlueSession,
  fireEvent,
  listAdvanceOptions,
  loadCodeBlueSession,
  saveCodeBlueSession,
  selectEmergencyCompactView,
  type CodeBluePlaySession,
} from "@/engine/simulation";
import type {
  CodeBlueActionsFile,
  CodeBlueDebriefFile,
  CodeBlueEventsFile,
  CodeBlueManifest,
  CodeBlueScenarioNode,
} from "@/schemas/code-blue";
import {
  buildDirectorInputFromPlayShell,
  directSceneDeterministic,
  type NarrationViewModel,
} from "@/story";

import { KitEvidenceBoard } from "./KitEvidenceBoard";
import {
  ACTION_KIT_REQUIREMENTS,
  DEFAULT_SELECTED_KIT_ASSETS,
  formatKitAssetIds,
  missingKitAssetsForActions,
} from "./kitEvidence";

function persist(session: CodeBluePlaySession) {
  saveCodeBlueSession(session);
}

function subscribeNoop() {
  return () => {};
}

export function PlayShell({
  manifest,
  nodes,
  actions,
  events,
  debrief,
  llmNarrationConfigured = false,
}: {
  manifest: CodeBlueManifest;
  nodes: CodeBlueScenarioNode[];
  actions: CodeBlueActionsFile;
  events: CodeBlueEventsFile;
  debrief: CodeBlueDebriefFile;
  llmNarrationConfigured?: boolean;
}) {
  const nodeMap = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );

  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [session, setSession] = useState<CodeBluePlaySession>(() =>
    createCodeBlueSession(manifest),
  );
  const [storageHydrated, setStorageHydrated] = useState(false);
  const [showChronology, setShowChronology] = useState(true);
  const [draft, setDraft] = useState<string[]>([]);
  const [liveMessage, setLiveMessage] = useState("");
  const [enrichedByNode, setEnrichedByNode] = useState<
    Record<string, NarrationViewModel>
  >({});
  const [enrichBusy, setEnrichBusy] = useState(false);
  const [enrichError, setEnrichError] = useState("");
  const [selectedKitAssets, setSelectedKitAssets] = useState<number[]>(
    DEFAULT_SELECTED_KIT_ASSETS,
  );

  // Restore sessionStorage on the client during render (React-approved adjust pattern).
  if (isClient && !storageHydrated) {
    setStorageHydrated(true);
    const existing = loadCodeBlueSession();
    if (existing && existing.richState.scenarioId === manifest.id) {
      setSession(existing);
      setShowChronology(false);
    }
  }

  const currentNode = nodeMap.get(session.currentNodeId);
  const compact = selectEmergencyCompactView(session.richState);
  const emergency =
    session.richState.playPhase === "emergency-override" ||
    currentNode?.phase === "emergency-override";
  const advanceOptions = currentNode
    ? listAdvanceOptions(currentNode, session, events)
    : [];

  const directorInput = currentNode
    ? buildDirectorInputFromPlayShell({
        node: currentNode,
        educationalBoundary: manifest.educationalBoundary,
        chronologyLock: manifest.chronologyLock,
        compact: {
          playPhase: compact.playPhase,
          pulse: compact.pulse,
          rhythm: compact.rhythm,
          airwayRoute: compact.airwayRoute,
          chestMovement: compact.chestMovement,
          defibrillatorReady: compact.defibrillatorReady,
          aacInstruction: compact.aac.instruction,
          aacVisible: compact.aac.visible,
          crisisDebtLevel: compact.crisisDebt.level,
          provisionalRoscNeedsConfirm: compact.provisionalRoscNeedsConfirm,
          postRoscReassessmentDue: compact.postRoscReassessmentDue,
        },
        emergencyOverride: emergency,
      })
    : null;

  const deterministicNarration = directorInput
    ? directSceneDeterministic(directorInput)
    : null;

  const narration =
    (currentNode && enrichedByNode[currentNode.id]) || deterministicNarration;

  function update(next: CodeBluePlaySession, announce?: string) {
    setSession(next);
    persist(next);
    if (announce) setLiveMessage(announce);
  }

  function toggleDraft(actionId: string) {
    if (emergency) return;
    setDraft((prev) =>
      prev.includes(actionId)
        ? prev.filter((id) => id !== actionId)
        : [...prev, actionId],
    );
  }

  function handleCommit() {
    if (draft.length === 0 || emergency) return;
    const missing = missingKitAssetsForActions(draft, selectedKitAssets);
    if (missing.length > 0) {
      setLiveMessage(
        `Commit blocked. Select or verify kit assets ${formatKitAssetIds(missing)}. Readiness still does not create indication.`,
      );
      return;
    }
    const { session: next } = commitDraftBundle(session, draft);
    setDraft([]);
    update(next, next.statusMessage);
  }

  function handleRestart() {
    const fresh = createCodeBlueSession(manifest);
    setDraft([]);
    setEnrichedByNode({});
    setEnrichError("");
    setSelectedKitAssets(DEFAULT_SELECTED_KIT_ASSETS);
    setShowChronology(true);
    update(fresh, "Session restarted.");
  }

  function toggleKitAsset(assetNumber: number) {
    setSelectedKitAssets((current) =>
      current.includes(assetNumber)
        ? current.filter((item) => item !== assetNumber)
        : [...current, assetNumber],
    );
  }

  async function handleEnrichNarration() {
    if (!directorInput || !currentNode || enrichBusy) return;
    setEnrichBusy(true);
    setEnrichError("");
    try {
      const response = await fetch("/api/narration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(directorInput),
      });
      if (!response.ok) {
        throw new Error(`Narration API ${response.status}`);
      }
      const payload = (await response.json()) as {
        narration: NarrationViewModel;
      };
      setEnrichedByNode((prev) => ({
        ...prev,
        [currentNode.id]: payload.narration,
      }));
      setLiveMessage(
        payload.narration.source === "llm-enriched"
          ? "LLM narration applied for display only. Clinical truth unchanged."
          : payload.narration.fallbackReason ??
              "Deterministic narration in use.",
      );
    } catch (err) {
      setEnrichError((err as Error).message);
    } finally {
      setEnrichBusy(false);
    }
  }

  if (!currentNode) {
    return (
      <div className="rounded-sm border border-[var(--color-warning)] bg-[var(--color-surface)] p-5">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">
          Node not found
        </h1>
        <p className="mt-2 text-[var(--color-muted)]">
          Missing <code>{session.currentNodeId}</code> in the Code Blue pack.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-[var(--color-accent)]">
            {manifest.subtitle ?? "Code Blue"}
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)] sm:text-3xl">
            {manifest.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Engine r{manifest.simulationEngineRevision} · v{manifest.version} ·
            revision {session.richState.revision}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRestart}
          className="rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-wash)]"
        >
          Restart slice
        </button>
      </div>

      {showChronology ? (
        <section
          aria-labelledby="cb-chronology-heading"
          className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
        >
          <h2
            id="cb-chronology-heading"
            className="font-[family-name:var(--font-display)] text-xl"
          >
            Locked chronology
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-[var(--color-muted)]">
            {manifest.chronologyLock.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-[var(--color-muted)]">
            {manifest.educationalBoundary}
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Control contract: draft does not mutate · commit advances revision ·
            duplicates are confirmation.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowChronology(false)}
              className="inline-flex rounded-sm bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-focus)]"
            >
              Enter The Alarm After ROSC
            </button>
            <Link
              href="/code-blue/interactive"
              className="inline-flex rounded-sm border border-[var(--color-line)] px-5 py-2.5 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-wash)]"
            >
              Open ChatGPT kit drill
            </Link>
          </div>
        </section>
      ) : (
        <>
          {emergency ? (
            <div
              role="status"
              className="rounded-sm border border-[var(--color-warning)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-ink)]"
            >
              <strong className="font-semibold">Emergency override.</strong>{" "}
              Non-urgent planning is hidden. No clinical questions. Protect AAC
              in place. No airway replacement. No doses or shock energies.
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section
              aria-labelledby="cb-scene-heading"
              className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-accent)]">
                    {currentNode.phase} · {currentNode.scene.lens}
                  </p>
                  <h2
                    id="cb-scene-heading"
                    className="mt-1 font-[family-name:var(--font-display)] text-xl"
                  >
                    {currentNode.title}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {currentNode.scene.location}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-sm bg-[var(--color-wash)] px-2 py-1 text-xs text-[var(--color-muted)]">
                    Narration: {narration?.source ?? "authored"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void handleEnrichNarration();
                    }}
                    disabled={enrichBusy || !directorInput}
                    className="rounded-sm border border-[var(--color-line)] px-3 py-1.5 text-xs hover:bg-[var(--color-wash)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {enrichBusy
                      ? "Directing…"
                      : llmNarrationConfigured
                        ? "Enrich narration (LLM)"
                        : "Refresh director framing"}
                  </button>
                </div>
              </div>
              <p className="mt-4 leading-relaxed text-[var(--color-ink)]">
                {narration?.summary ?? currentNode.scene.summary}
              </p>
              {(narration?.dialogue.length
                ? narration.dialogue
                : currentNode.scene.dialogue
              )?.length ? (
                <ul className="mt-4 space-y-2">
                  {(narration?.dialogue.length
                    ? narration.dialogue
                    : (currentNode.scene.dialogue ?? [])
                  ).map((line) => (
                    <li
                      key={`${line.speaker}-${line.line}`}
                      className="border-l-2 border-[var(--color-accent-soft)] pl-3 text-sm"
                    >
                      <span className="font-medium text-[var(--color-ink)]">
                        {line.speaker}
                        {line.aac ? " (AAC)" : ""}:
                      </span>{" "}
                      <span className="text-[var(--color-muted)]">
                        {line.line}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {(narration?.captions.length
                ? narration.captions
                : currentNode.scene.captions
              )?.length ? (
                <p className="mt-4 text-sm italic text-[var(--color-muted)]">
                  {(narration?.captions.length
                    ? narration.captions
                    : (currentNode.scene.captions ?? [])
                  ).join(" ")}
                </p>
              ) : null}

              {narration?.framingNotes.length ? (
                <div className="mt-4 rounded-sm border border-[var(--color-line)] bg-[var(--color-wash)]/50 px-3 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                    Story director framing
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--color-muted)]">
                    {narration.framingNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-[var(--color-muted)]">
                    {narration.providerNote}
                    {narration.fallbackReason
                      ? ` · ${narration.fallbackReason}`
                      : ""}{" "}
                    Clinical truth panels below stay engine/content owned.
                  </p>
                </div>
              ) : null}
              {enrichError ? (
                <p className="mt-2 text-sm text-[var(--color-warning)]" role="alert">
                  Narration request failed: {enrichError}
                </p>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["Airway", currentNode.clinicalTruth.airway],
                    ["Breathing", currentNode.clinicalTruth.breathing],
                    ["Circulation", currentNode.clinicalTruth.circulation],
                    [
                      "Communication access",
                      currentNode.clinicalTruth.communicationAccess,
                    ],
                  ] as const
                ).map(([label, text]) => (
                  <div key={label}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                      {label}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <aside className="flex flex-col gap-4">
              <section
                aria-labelledby="cb-monitor-heading"
                className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
              >
                <h2
                  id="cb-monitor-heading"
                  className="text-sm font-semibold uppercase tracking-wide text-[var(--color-accent)]"
                >
                  Compact monitor
                </h2>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <div>
                    <dt className="text-[var(--color-muted)]">Phase</dt>
                    <dd className="font-medium">{compact.playPhase}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-muted)]">Pulse</dt>
                    <dd className="font-medium">{compact.pulse}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-muted)]">Rhythm</dt>
                    <dd className="font-medium">{compact.rhythm}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-muted)]">Chest</dt>
                    <dd className="font-medium">{compact.chestMovement}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[var(--color-muted)]">Airway route</dt>
                    <dd className="font-medium">{compact.airwayRoute}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-muted)]">Defib ready</dt>
                    <dd className="font-medium">
                      {compact.defibrillatorReady ? "yes" : "no"}
                      <span className="block text-xs font-normal text-[var(--color-muted)]">
                        Readiness ≠ indication
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-muted)]">Crisis debt</dt>
                    <dd className="font-medium">{compact.crisisDebt.level}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[var(--color-muted)]">AAC</dt>
                    <dd className="font-medium">
                      {compact.aac.visible ? "visible" : "not visible"} ·{" "}
                      {compact.aac.powered ? "powered" : "unpowered"} ·{" "}
                      instruction {compact.aac.instruction ?? "none"}
                    </dd>
                  </div>
                </dl>
              </section>

              {currentNode.communicationBeat ? (
                <section
                  aria-labelledby="cb-comm-heading"
                  className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
                >
                  <h2
                    id="cb-comm-heading"
                    className="text-sm font-semibold uppercase tracking-wide text-[var(--color-accent)]"
                  >
                    Communication beat
                  </h2>
                  <p className="mt-2 text-sm text-[var(--color-ink)]">
                    Instruction:{" "}
                    <strong>
                      {currentNode.communicationBeat.instruction ?? "none"}
                    </strong>
                    {currentNode.communicationBeat.questionActive
                      ? " · question active"
                      : " · no open question"}
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {currentNode.communicationBeat.note}
                  </p>
                </section>
              ) : null}

              {currentNode.familyBeat ? (
                <section
                  aria-labelledby="cb-family-heading"
                  className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
                >
                  <h2
                    id="cb-family-heading"
                    className="text-sm font-semibold uppercase tracking-wide text-[var(--color-accent)]"
                  >
                    Family / support (non-clinical)
                  </h2>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {currentNode.familyBeat.members.join(", ")} —{" "}
                    {currentNode.familyBeat.roles.join("; ")}
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--color-ink)]">
                    Clinical assignment forbidden.
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {currentNode.familyBeat.note}
                  </p>
                </section>
              ) : null}
            </aside>
          </div>

          <section
            aria-labelledby="cb-evidence-heading"
            className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
          >
            <h2
              id="cb-evidence-heading"
              className="font-[family-name:var(--font-display)] text-lg"
            >
              Visible evidence
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {currentNode.visibleEvidence.map((item) => (
                <li key={item.id} className="text-sm">
                  <p className="font-medium text-[var(--color-ink)]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-[var(--color-muted)]">{item.detail}</p>
                </li>
              ))}
            </ul>
            {currentNode.hiddenState ? (
              <p className="mt-4 text-xs text-[var(--color-muted)]">
                Cause remains unproven in this window — hidden state is not shown
                as clinical truth.
              </p>
            ) : null}
          </section>

          {!emergency ? (
            <KitEvidenceBoard
              selectedAssets={selectedKitAssets}
              onToggle={toggleKitAsset}
              draftActionIds={draft}
            />
          ) : null}

          {!emergency ? (
            <section
              aria-labelledby="cb-actions-heading"
              className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2
                    id="cb-actions-heading"
                    className="font-[family-name:var(--font-display)] text-lg"
                  >
                    Action draft board
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    Select to draft. Commit applies a partial bundle through the
                    engine. Roles auto-assign to the catalog clinical role —
                    family is never offered.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={draft.length === 0}
                  className="rounded-sm bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Commit draft ({draft.length})
                </button>
              </div>

              {currentNode.availableActions.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--color-muted)]">
                  No commitable actions on this node — use advance / reflection
                  controls.
                </p>
              ) : (
                <ul className="mt-4 grid gap-2">
                  {currentNode.availableActions.map((actionId) => {
                    const meta = actionMeta(actions, actionId);
                    const selected = draft.includes(actionId);
                    const committed =
                      session.committedActionIds.includes(actionId);
                    const kitNeeds = ACTION_KIT_REQUIREMENTS[actionId] ?? [];
                    const kitMissing = missingKitAssetsForActions(
                      [actionId],
                      selectedKitAssets,
                    );
                    return (
                      <li key={actionId}>
                        <button
                          type="button"
                          onClick={() => toggleDraft(actionId)}
                          aria-pressed={selected}
                          className={`flex w-full flex-col rounded-sm border px-3 py-3 text-left text-sm transition-colors ${
                            selected
                              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                              : "border-[var(--color-line)] hover:bg-[var(--color-wash)]"
                          }`}
                        >
                          <span className="font-medium text-[var(--color-ink)]">
                            {meta?.label ?? actionId}
                            {committed ? " · previously committed" : ""}
                          </span>
                          <span className="mt-1 text-[var(--color-muted)]">
                            {meta?.domain ?? "catalog"}
                            {meta?.bundleTags?.length
                              ? ` · ${meta.bundleTags.join(", ")}`
                              : ""}
                          </span>
                          {kitNeeds.length > 0 ? (
                            <span className="mt-1 text-xs text-[var(--color-muted)]">
                              Kit evidence: {formatKitAssetIds(kitNeeds)}
                              {kitMissing.length > 0
                                ? ` · missing ${formatKitAssetIds(kitMissing)}`
                                : " · selected"}
                            </span>
                          ) : null}
                          {meta?.notes ? (
                            <span className="mt-1 text-xs text-[var(--color-muted)]">
                              {meta.notes}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {actions.bundles?.map((bundle) => (
                <div key={bundle.id} className="mt-4 text-sm">
                  <p className="font-medium text-[var(--color-ink)]">
                    Bundle: {bundle.label}
                  </p>
                  <p className="mt-1 text-[var(--color-muted)]">
                    {bundle.notes}
                  </p>
                  <button
                    type="button"
                    className="mt-2 rounded-sm border border-[var(--color-line)] px-3 py-1.5 text-xs hover:bg-[var(--color-wash)]"
                    onClick={() => {
                      const offered = bundle.actionIds.filter((id) =>
                        currentNode.availableActions.includes(id),
                      );
                      setDraft((prev) => [
                        ...new Set([...prev, ...offered]),
                      ]);
                    }}
                  >
                    Add G1 actions to draft
                  </button>
                </div>
              ))}

              {session.lastCommit ? (
                <div className="mt-5 border-t border-[var(--color-line)] pt-4 text-sm">
                  <p className="font-medium">Last commit</p>
                  <p className="mt-1 text-[var(--color-muted)]">
                    Accepted:{" "}
                    {session.lastCommit.accepted.length
                      ? session.lastCommit.accepted.join(", ")
                      : "none"}
                  </p>
                  {session.lastCommit.blocked.length ? (
                    <ul className="mt-2 space-y-1 text-[var(--color-warning)]">
                      {session.lastCommit.blocked.map((item) => (
                        <li key={item.actionId}>
                          Blocked {item.actionId}: {item.reasons.join("; ")}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : (
            <section className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
              <h2 className="font-[family-name:var(--font-display)] text-lg">
                Rescue focus
              </h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Planning board hidden. AAC protection and defibrillator readiness
                remain conceptual only — no energy values, no gesture CPR.
              </p>
            </section>
          )}

          <section
            aria-labelledby="cb-advance-heading"
            className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
          >
            <h2
              id="cb-advance-heading"
              className="font-[family-name:var(--font-display)] text-lg"
            >
              Advance / interrupts
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Content exit conditions drive the node graph. Events fire first when
              required; commits satisfy action gates.
            </p>

            <ul className="mt-4 space-y-3">
              {advanceOptions.map(({ exit, eventLabel, ready, missing }) => (
                <li
                  key={exit.id}
                  className="flex flex-col gap-2 rounded-sm border border-[var(--color-line)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="text-sm">
                    <p className="font-medium text-[var(--color-ink)]">
                      {exit.description}
                    </p>
                    <p className="mt-1 text-[var(--color-muted)]">
                      → {exit.nextNodeId ?? "end slice"}
                      {eventLabel ? ` · ${eventLabel}` : ""}
                      {exit.emergencyOverride ? " · H5 override" : ""}
                    </p>
                    {!ready ? (
                      <p className="mt-1 text-xs text-[var(--color-warning)]">
                        Waiting on: {missing.join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {exit.requiresEvent &&
                    !session.firedEvents.includes(exit.requiresEvent) ? (
                      <button
                        type="button"
                        onClick={() =>
                          update(
                            fireEvent(session, currentNode, exit.requiresEvent!),
                            `Fired ${exit.requiresEvent}`,
                          )
                        }
                        className="rounded-sm bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-focus)]"
                      >
                        Fire {eventLabel ?? exit.requiresEvent}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!ready}
                        onClick={() =>
                          update(
                            advanceViaExit(session, exit),
                            `Advanced via ${exit.id}`,
                          )
                        }
                        className="rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm hover:bg-[var(--color-wash)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Advance
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2">
              {currentNode.id === "cb-provisional-rosc" ||
              currentNode.id === "cb-post-rosc-reassess" ? (
                <button
                  type="button"
                  onClick={() =>
                    update(
                      applySpecialCommand(session, {
                        type: "CONFIRM_ROSC_INDEPENDENTLY",
                      }),
                    )
                  }
                  className="rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm hover:bg-[var(--color-wash)]"
                >
                  Confirm ROSC independently
                </button>
              ) : null}
              {currentNode.id === "cb-aac-restore-family" ||
              currentNode.id === "cb-post-rosc-reassess" ? (
                <button
                  type="button"
                  onClick={() =>
                    update(
                      applySpecialCommand(session, {
                        type: "RESTORE_AAC_AFTER_RESCUE",
                      }),
                    )
                  }
                  className="rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm hover:bg-[var(--color-wash)]"
                >
                  Restore AAC after rescue
                </button>
              ) : null}
            </div>

            <p className="mt-4 text-sm text-[var(--color-muted)]" role="status">
              {session.statusMessage}
            </p>
          </section>

          <section
            aria-labelledby="cb-log-heading"
            className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
          >
            <h2
              id="cb-log-heading"
              className="font-[family-name:var(--font-display)] text-lg"
            >
              Event log (tail)
            </h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[var(--color-muted)]">
              {compact.eventLogTail.length === 0 ? (
                <li>No engine events yet.</li>
              ) : (
                compact.eventLogTail.map((event) => (
                  <li key={event.id}>
                    [{event.kind}] {event.summary}
                  </li>
                ))
              )}
            </ol>
          </section>

          {session.completed || currentNode.phase === "reflect" ? (
            <section
              aria-labelledby="cb-debrief-heading"
              className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
            >
              <h2
                id="cb-debrief-heading"
                className="font-[family-name:var(--font-display)] text-xl"
              >
                Reflection ({debrief.id})
              </h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Dimensions: {debrief.dimensions.join(" · ")}. No single perfect
                path.
              </p>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-[var(--color-ink)]">
                {debrief.reflectionPrompts.map((prompt) => (
                  <li key={prompt} className="leading-relaxed">
                    {prompt}
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/debrief"
                  className="rounded-sm bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-focus)]"
                >
                  Open episode debrief shell
                </Link>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="rounded-sm border border-[var(--color-line)] px-4 py-2 text-sm hover:bg-[var(--color-wash)]"
                >
                  Run slice again
                </button>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
