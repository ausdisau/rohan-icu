"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import {
  createStationEngineState,
  resolveAssetWarnings,
  stationEngineCompact,
  warningLabel,
  warningMeaning,
  workedSequenceNote,
  type StationActionRecord,
  type StationEngineCompact,
} from "@/engine/action-stations";
import type { ActionStationsParsed } from "@/schemas/action-stations";
import type { EquipmentState } from "@/engine/simulation/types";

type StationState = ActionStationsParsed["states"][number]["id"];
type StationAsset = ActionStationsParsed["assets"][number];
type WorkflowStep = StationActionRecord["workflowStep"];

const stateSymbols: Record<StationState, string> = {
  available: "○",
  relevant: "◇",
  "locked-by-evidence": "▣",
  assigned: "△",
  committed: "●",
};

const stateShapes: Record<StationState, string> = {
  available: "rounded-full border border-current",
  relevant: "rotate-45 border border-current",
  "locked-by-evidence": "rounded-sm border-2 border-current",
  assigned: "rounded-sm border border-current",
  committed: "rounded-full bg-current",
};

function imageSrc(asset: StationAsset): string {
  return `/media/emergency-kit/${asset.inventoryId.replace(/^kit-/, "")}.png`;
}

function nextWorkflowStep(state: StationState): WorkflowStep | null {
  if (state === "available") return "relevant";
  if (state === "relevant") return "assigned";
  if (state === "assigned") return "committed";
  return null;
}

function advanceLabel(state: StationState): string {
  switch (state) {
    case "available":
      return "Mark relevant";
    case "relevant":
      return "Assign workstream";
    case "assigned":
      return "Commit action";
    case "locked-by-evidence":
    case "committed":
      return "Committed";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

function activeWorkflowIndex(
  selectedState: StationState | undefined,
  hasSelection: boolean,
): number {
  if (!hasSelection) return 0;
  if (!selectedState || selectedState === "locked-by-evidence") return 1;
  if (selectedState === "available") return 2;
  if (selectedState === "relevant") return 3;
  if (selectedState === "assigned") return 4;
  return 5;
}

export function ActionStations({
  reference,
  nodeId,
  onStationAction,
  engineCompact: engineCompactProp,
  equipment: equipmentProp,
}: {
  reference: ActionStationsParsed;
  nodeId: string;
  onStationAction?: (record: StationActionRecord) => void;
  engineCompact?: StationEngineCompact;
  equipment?: Record<string, EquipmentState>;
}) {
  const fallbackEngine = useMemo(() => createStationEngineState(), []);
  const engineCompact =
    engineCompactProp ?? stationEngineCompact(fallbackEngine);
  const equipment = equipmentProp ?? fallbackEngine.equipment;

  const [assetStates, setAssetStates] = useState<Record<number, StationState>>(
    () =>
      Object.fromEntries(
        reference.assets.map((asset) => [asset.number, asset.initialState]),
      ),
  );
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [consideredEvidence, setConsideredEvidence] = useState<boolean[]>(
    () => reference.evidenceGate.evidenceToConsider.map(() => false),
  );
  const [localHistory, setLocalHistory] = useState<StationActionRecord[]>([]);
  const [announcement, setAnnouncement] = useState(
    "Action Stations ready. Central PICU evidence is incomplete.",
  );

  const evidenceGateOpen = consideredEvidence.every(Boolean);
  const stateLabels = useMemo(
    () => new Map(reference.states.map((state) => [state.id, state.label])),
    [reference.states],
  );
  const selectedAsset = reference.assets.find(
    (asset) => asset.number === selectedNumber,
  );

  function effectiveState(asset: StationAsset): StationState {
    const current = assetStates[asset.number];
    if (current === "locked-by-evidence" && evidenceGateOpen) {
      return "available";
    }
    return current;
  }

  function describe(asset: StationAsset, state: StationState): string {
    const warnings = resolveAssetWarnings(reference, asset.number, equipment)
      .map((id) => warningLabel(reference, id))
      .join("; ");
    return `Asset ${asset.number}, ${asset.title}, ${reference.stations.find((station) => station.id === asset.stationId)?.label ?? asset.stationId} station, ${stateLabels.get(state) ?? state}.${warnings ? ` Warnings: ${warnings}.` : ""}`;
  }

  function emitAction(asset: StationAsset, workflowStep: WorkflowStep) {
    const record: StationActionRecord = {
      nodeId,
      assetNumber: asset.number,
      inventoryId: asset.inventoryId,
      title: asset.title,
      stationId: asset.stationId,
      workflowStep,
      evidenceGateOpen,
      timestampIso: new Date().toISOString(),
    };
    setLocalHistory((current) => [...current, record]);
    onStationAction?.(record);
    return record;
  }

  function selectAsset(asset: StationAsset) {
    const state = effectiveState(asset);
    setSelectedNumber(asset.number);
    if (state === "locked-by-evidence") {
      setAnnouncement(
        `${describe(asset, state)} Warning: ${reference.evidenceGate.earlySelectionWarning}`,
      );
      return;
    }
    setAnnouncement(
      `${describe(asset, state)} Interpret the image and evidence.`,
    );
  }

  function advanceAsset(asset: StationAsset) {
    const state = effectiveState(asset);
    const nextState = nextWorkflowStep(state);
    if (!nextState) return;

    setAssetStates((current) => ({ ...current, [asset.number]: nextState }));
    const record = emitAction(asset, nextState);
    const sequenceNote =
      nextState === "committed"
        ? workedSequenceNote([...localHistory, record], asset.number)
        : null;
    setAnnouncement(
      `${describe(asset, nextState)} ${
        nextState === "committed"
          ? "Branch consequence applied; success is not assumed."
          : "Scenario time remains paused for Rohan's AAC."
      }${sequenceNote ? ` ${sequenceNote}` : ""}`,
    );
  }

  const selectedState = selectedAsset
    ? effectiveState(selectedAsset)
    : undefined;
  const selectedWarnings = selectedAsset
    ? resolveAssetWarnings(reference, selectedAsset.number, equipment)
    : [];
  const workflowIndex = activeWorkflowIndex(
    selectedState,
    selectedNumber !== null,
  );

  return (
    <section
      aria-labelledby="action-stations-heading"
      className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[0_1px_0_rgba(26,42,51,0.04)]"
    >
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <header className="border-b border-[var(--color-line)] bg-[linear-gradient(135deg,var(--color-wash),var(--color-surface)_55%,#eef4f6)] px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Instrumental reference · Assets 01–20
            </p>
            <h2
              id="action-stations-heading"
              className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-ink)]"
            >
              {reference.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              {reference.framing}
            </p>
          </div>
          <p className="max-w-sm rounded-lg border border-[var(--color-line)] bg-white/80 px-3 py-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {reference.educationalBoundary}
          </p>
        </div>

        <ol
          className="mt-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-6"
          aria-label="Image selection workflow"
        >
          {reference.workflow.map((step, index) => {
            const active = index === workflowIndex;
            const complete = index < workflowIndex;
            return (
              <li
                key={step}
                className={`rounded-lg border px-3 py-2 text-sm transition duration-300 motion-safe:transition-all ${
                  active
                    ? "border-[var(--color-focus)] bg-white text-[var(--color-ink)] shadow-sm"
                    : complete
                      ? "border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)]/40 text-[var(--color-ink)]"
                      : "border-[var(--color-line)] bg-white/50 text-[var(--color-muted)]"
                }`}
              >
                <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
                  Step {index + 1}
                </span>
                <span className="mt-0.5 block font-medium leading-snug">
                  {step}
                </span>
              </li>
            );
          })}
        </ol>
      </header>

      <div className="grid gap-0 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.9fr)]">
        <div className="border-b border-[var(--color-line)] p-4 sm:p-5 xl:border-b-0 xl:border-r">
          <div className="rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-wash)]/70 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]">
                {reference.centralScene.title}
              </h3>
              <span className="inline-flex items-center gap-2 rounded-md border border-[var(--color-warning)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-warning)]">
                <span
                  aria-hidden="true"
                  className="inline-block size-2.5 rotate-45 border-2 border-current"
                />
                Evidence incomplete
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              {reference.centralScene.description}
            </p>

            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              {reference.centralScene.indicators.map((indicator) => (
                <div
                  key={indicator.id}
                  className="rounded-lg border border-[var(--color-line)] bg-white px-3 py-2.5"
                >
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
                    {indicator.label}
                  </dt>
                  <dd className="mt-1 text-sm leading-snug text-[var(--color-muted)]">
                    {indicator.detail}
                  </dd>
                </div>
              ))}
            </dl>

            <div
              className="mt-4 grid gap-2 rounded-lg border border-[var(--color-line)] bg-white/90 p-3 sm:grid-cols-2 lg:grid-cols-4"
              aria-label="Expanded engine compact view"
            >
              <EngineChip
                label="Play phase"
                value={engineCompact.playPhase.replaceAll("-", " ")}
              />
              <EngineChip
                label="Chest movement"
                value={engineCompact.chestMovement}
              />
              <EngineChip
                label="Rhythm"
                value={engineCompact.rhythm.replaceAll("-", " ")}
              />
              <EngineChip
                label="Crisis debt"
                value={engineCompact.crisisDebt.level}
              />
              <EngineChip
                label="AAC visible"
                value={engineCompact.aac.visible ? "yes" : "no"}
              />
              <EngineChip
                label="Switch reach"
                value={engineCompact.aac.switchReachable ? "reachable" : "at risk"}
              />
              <EngineChip
                label="Airway route"
                value={engineCompact.airwayRoute}
              />
              <EngineChip
                label="Defibrillator"
                value={
                  engineCompact.defibrillatorReady
                    ? "ready ≠ indicated"
                    : "not ready"
                }
              />
            </div>

            {reference.workedSequence ? (
              <p className="mt-3 text-sm text-[var(--color-ink)]">
                <span className="font-semibold">Worked airway sequence: </span>
                {reference.workedSequence}
              </p>
            ) : null}
          </div>

          <fieldset className="mt-4 rounded-xl border border-[var(--color-warning)] bg-white p-4">
            <legend className="px-2 text-sm font-semibold text-[var(--color-warning)]">
              Evidence gate for assets 01–03
            </legend>
            <p className="text-sm text-[var(--color-muted)]">
              Airway-route images stay visible but locked until external circuit
              load, positioning, power, and other supported causes are
              considered. Checking records interpretation — not task completion.
            </p>
            <div className="mt-3 grid gap-2">
              {reference.evidenceGate.evidenceToConsider.map(
                (evidence, index) => (
                  <label
                    key={evidence}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-ink)] transition hover:border-[var(--color-accent)]"
                  >
                    <input
                      type="checkbox"
                      checked={consideredEvidence[index]}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setConsideredEvidence((current) =>
                          current.map((value, itemIndex) =>
                            itemIndex === index ? checked : value,
                          ),
                        );
                        setAnnouncement(
                          `${evidence}: ${checked ? "considered" : "not yet considered"}.`,
                        );
                      }}
                      className="mt-0.5 size-5 accent-[var(--color-accent)]"
                    />
                    <span>{evidence}</span>
                  </label>
                ),
              )}
            </div>
            <p className="mt-3 text-sm font-medium text-[var(--color-warning)]">
              Gate status:{" "}
              {evidenceGateOpen
                ? "open for interpretation"
                : "locked by evidence"}
            </p>
          </fieldset>
        </div>

        <aside className="bg-[#fbfcfd] p-4 sm:p-5">
          {selectedAsset && selectedState ? (
            <div className="flex h-full flex-col">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                Asset {String(selectedAsset.number).padStart(2, "0")} ·{" "}
                {stateLabels.get(selectedState)}
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)]">
                {selectedAsset.title}
              </h3>
              <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-xl border border-[var(--color-line)] bg-white">
                <Image
                  src={imageSrc(selectedAsset)}
                  alt={selectedAsset.altText}
                  fill
                  sizes="(min-width: 1280px) 22vw, 80vw"
                  className="object-contain p-3"
                />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
                {selectedAsset.purpose}
              </p>

              {selectedWarnings.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Operational warnings">
                  {selectedWarnings.map((warningId) => (
                    <li
                      key={warningId}
                      title={warningMeaning(reference, warningId)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-warning)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--color-warning)]"
                    >
                      <span
                        aria-hidden="true"
                        className="inline-block size-2 rotate-45 border border-current"
                      />
                      {warningLabel(reference, warningId)}
                    </li>
                  ))}
                </ul>
              ) : null}

              {selectedState === "locked-by-evidence" ? (
                <p
                  role="alert"
                  className="mt-4 border-l-4 border-[var(--color-warning)] bg-[var(--color-wash)] p-3 text-sm text-[var(--color-warning)]"
                >
                  {reference.evidenceGate.earlySelectionWarning}
                </p>
              ) : (
                <>
                  <div className="mt-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--color-ink)]">
                        Preconditions and context gate
                      </h4>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--color-muted)]">
                        {selectedAsset.contextGate.requiredEvidence.map(
                          (item) => (
                            <li key={item}>{item}</li>
                          ),
                        )}
                      </ul>
                      <p className="mt-2 text-sm text-[var(--color-warning)]">
                        Warning: {selectedAsset.contextGate.warning}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--color-ink)]">
                        Decision-support prompts
                      </h4>
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--color-muted)]">
                        {reference.decisionPrompts.map((prompt) => (
                          <li key={prompt}>{prompt}</li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-3 pt-5">
                    {selectedState !== "committed" ? (
                      <button
                        type="button"
                        onClick={() => advanceAsset(selectedAsset)}
                        className="rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-focus)]"
                      >
                        {advanceLabel(selectedState)}
                      </button>
                    ) : (
                      <p className="rounded-lg border border-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)]">
                        Committed · branch consequence remains uncertain
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNumber(null);
                        setAnnouncement(
                          "No response recorded as wait or unknown. Scenario time remains paused for AAC.",
                        );
                      }}
                      className="rounded-lg border border-[var(--color-line)] px-4 py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-wash)]"
                    >
                      Wait / unknown
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-64 flex-col justify-center rounded-xl border border-dashed border-[var(--color-line)] bg-white px-4 py-8 text-center">
              <p className="font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]">
                Select an image to interpret
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                The images must never create a find-the-magic-object puzzle.
                Two visually similar alarms may need different assessment,
                environmental correction, rescue preparation, and parallel
                workstreams.
              </p>
            </div>
          )}
        </aside>
      </div>

      <div className="border-t border-[var(--color-line)] bg-white px-4 py-5 sm:px-6">
        <div className="grid gap-6 xl:grid-cols-3">
          {reference.stations.map((station) => (
            <section
              key={station.id}
              aria-labelledby={`station-${station.id}`}
              className="min-w-0"
            >
              <div className="flex items-end justify-between gap-2 border-b border-[var(--color-accent)] pb-2">
                <h3
                  id={`station-${station.id}`}
                  className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]"
                >
                  {station.label}
                </h3>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                  {String(station.numberRange[0]).padStart(2, "0")}–
                  {String(station.numberRange[1]).padStart(2, "0")}
                </span>
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-3">
                {reference.assets
                  .filter((asset) => asset.stationId === station.id)
                  .map((asset) => {
                    const state = effectiveState(asset);
                    const selected = selectedNumber === asset.number;
                    const warnings = resolveAssetWarnings(
                      reference,
                      asset.number,
                      equipment,
                    );
                    return (
                      <li key={asset.number}>
                        <button
                          type="button"
                          onClick={() => selectAsset(asset)}
                          aria-pressed={selected}
                          aria-label={describe(asset, state)}
                          aria-describedby={`asset-${asset.number}-state`}
                          className={`group flex h-full w-full flex-col overflow-hidden rounded-xl border bg-white text-left transition duration-300 motion-safe:hover:-translate-y-0.5 ${
                            selected
                              ? "border-[var(--color-focus)] shadow-[0_8px_24px_rgba(31,92,102,0.12)]"
                              : state === "locked-by-evidence"
                                ? "border-[var(--color-warning)]/50 opacity-90"
                                : "border-[var(--color-line)] hover:border-[var(--color-accent)] hover:shadow-sm"
                          }`}
                        >
                          <span className="relative block aspect-[5/4] w-full bg-white">
                            <Image
                              src={imageSrc(asset)}
                              alt=""
                              fill
                              sizes="(min-width: 1280px) 12vw, (min-width: 640px) 20vw, 40vw"
                              className="object-contain p-2"
                            />
                            {warnings.length > 0 ? (
                              <span
                                aria-hidden="true"
                                className="absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-md border border-[var(--color-warning)] bg-white text-[0.65rem] font-bold text-[var(--color-warning)]"
                                title={warnings
                                  .map((id) => warningLabel(reference, id))
                                  .join(", ")}
                              >
                                !
                              </span>
                            ) : null}
                          </span>
                          <span className="flex flex-1 flex-col border-t border-[var(--color-line)] px-2.5 py-2.5">
                            <span className="text-sm font-semibold leading-snug text-[var(--color-ink)]">
                              {String(asset.number).padStart(2, "0")}.{" "}
                              {asset.title}
                            </span>
                            {asset.visualNumberMayRead ? (
                              <span className="mt-1 text-[0.7rem] text-[var(--color-muted)]">
                                Source label may read{" "}
                                {asset.visualNumberMayRead}; canonical{" "}
                                {asset.number}
                              </span>
                            ) : null}
                            <span
                              id={`asset-${asset.number}-state`}
                              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted)]"
                            >
                              <span
                                aria-hidden="true"
                                className={`inline-block size-2.5 shrink-0 ${stateShapes[state]}`}
                              />
                              <span aria-hidden="true">
                                {stateSymbols[state]}{" "}
                              </span>
                              {stateLabels.get(state)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </section>
          ))}
        </div>

        <div
          className="mt-5 flex flex-wrap gap-2"
          aria-label="Action Station state legend"
        >
          {reference.states.map((state) => (
            <span
              key={state.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-3 py-1 text-xs text-[var(--color-muted)]"
              title={state.meaning}
            >
              <span
                aria-hidden="true"
                className={`inline-block size-2.5 ${stateShapes[state.id]}`}
              />
              {state.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function EngineChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-2">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium capitalize text-[var(--color-ink)]">
        {value}
      </p>
    </div>
  );
}
