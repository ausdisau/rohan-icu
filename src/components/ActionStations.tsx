"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import {
  workedSequenceNote,
  type StationActionRecord,
} from "@/engine/action-stations";
import type { ActionStationsParsed } from "@/schemas/action-stations";

type StationState = ActionStationsParsed["states"][number]["id"];
type StationAsset = ActionStationsParsed["assets"][number];

const stateSymbols: Record<StationState, string> = {
  available: "○",
  relevant: "◇",
  "locked-by-evidence": "▣",
  assigned: "△",
  committed: "●",
};

function imageSrc(asset: StationAsset): string {
  return `/media/emergency-kit/${asset.inventoryId.replace(/^kit-/, "")}.png`;
}

export function ActionStations({
  reference,
  nodeId,
  onStationAction,
}: {
  reference: ActionStationsParsed;
  nodeId: string;
  onStationAction?: (record: StationActionRecord) => void;
}) {
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
    return `Asset ${asset.number}, ${asset.title}, ${reference.stations.find((station) => station.id === asset.stationId)?.label ?? asset.stationId} station, ${stateLabels.get(state) ?? state}.`;
  }

  function emitAction(
    asset: StationAsset,
    workflowStep: StationActionRecord["workflowStep"],
  ) {
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
    const nextState: StationState =
      state === "available"
        ? "relevant"
        : state === "relevant"
          ? "assigned"
          : state === "assigned"
            ? "committed"
            : state;
    if (
      nextState !== "relevant" &&
      nextState !== "assigned" &&
      nextState !== "committed"
    ) {
      return;
    }

    setAssetStates((current) => ({ ...current, [asset.number]: nextState }));
    const record = emitAction(asset, nextState);
    const sequenceNote =
      nextState === "committed"
        ? workedSequenceNote([...localHistory, record], asset.number)
        : null;
    setAnnouncement(
      `${describe(asset, nextState)} ${
        nextState === "committed"
          ? "Committed to the branch consequence; success is not assumed."
          : "Scenario time remains paused for Rohan's AAC."
      }${sequenceNote ? ` ${sequenceNote}` : ""}`,
    );
  }

  const selectedState = selectedAsset
    ? effectiveState(selectedAsset)
    : undefined;

  return (
    <section
      aria-labelledby="action-stations-heading"
      className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:p-5"
    >
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
            Select → interpret → preconditions → assign → commit
          </p>
          <h2
            id="action-stations-heading"
            className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)]"
          >
            {reference.title}
          </h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-[var(--color-muted)]">
          {reference.educationalBoundary}
        </p>
      </div>

      <div className="mt-5 rounded-sm border-2 border-[var(--color-accent)] bg-[var(--color-wash)] p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
            {reference.centralScene.title}
          </h3>
          <span className="rounded-full border border-[var(--color-warning)] px-3 py-1 text-xs font-semibold text-[var(--color-warning)]">
            Evidence incomplete
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          {reference.centralScene.description}
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {reference.centralScene.indicators.map((indicator) => (
            <li
              key={indicator.id}
              className="border-l-4 border-[var(--color-accent)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            >
              <span className="font-semibold text-[var(--color-ink)]">
                {indicator.label}:{" "}
              </span>
              <span className="text-[var(--color-muted)]">
                {indicator.detail}
              </span>
            </li>
          ))}
        </ul>
        {reference.workedSequence ? (
          <p className="mt-3 text-sm text-[var(--color-ink)]">
            <span className="font-semibold">Worked airway sequence: </span>
            {reference.workedSequence}
          </p>
        ) : null}
      </div>

      <fieldset className="mt-5 rounded-sm border border-[var(--color-warning)] p-4">
        <legend className="px-2 text-sm font-semibold text-[var(--color-warning)]">
          Evidence gate for assets 01–03
        </legend>
        <p className="text-sm text-[var(--color-muted)]">
          Check each consideration to unlock the visible airway options. This
          records interpretation, not task completion.
        </p>
        <div className="mt-3 grid gap-2">
          {reference.evidenceGate.evidenceToConsider.map((evidence, index) => (
            <label
              key={evidence}
              className="flex cursor-pointer items-start gap-3 rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-ink)]"
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
          ))}
        </div>
        <p className="mt-3 text-sm font-medium text-[var(--color-warning)]">
          Gate status:{" "}
          {evidenceGateOpen ? "open for interpretation" : "locked by evidence"}
        </p>
      </fieldset>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        {reference.stations.map((station) => (
          <section
            key={station.id}
            aria-labelledby={`station-${station.id}`}
            className="min-w-0"
          >
            <h3
              id={`station-${station.id}`}
              className="border-b-2 border-[var(--color-accent)] pb-2 font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]"
            >
              {station.label}{" "}
              <span className="text-sm font-normal text-[var(--color-muted)]">
                {String(station.numberRange[0]).padStart(2, "0")}–
                {String(station.numberRange[1]).padStart(2, "0")}
              </span>
            </h3>
            <ul className="mt-3 grid grid-cols-2 gap-3">
              {reference.assets
                .filter((asset) => asset.stationId === station.id)
                .map((asset) => {
                  const state = effectiveState(asset);
                  const selected = selectedNumber === asset.number;
                  return (
                    <li key={asset.number}>
                      <button
                        type="button"
                        onClick={() => selectAsset(asset)}
                        aria-pressed={selected}
                        aria-describedby={`asset-${asset.number}-state`}
                        className={`flex h-full w-full flex-col overflow-hidden rounded-sm border-2 text-left transition ${
                          selected
                            ? "border-[var(--color-focus)] bg-[var(--color-accent-soft)]"
                            : "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]"
                        }`}
                      >
                        <span className="relative block aspect-[4/3] w-full bg-white">
                          <Image
                            src={imageSrc(asset)}
                            alt={asset.altText}
                            fill
                            sizes="(min-width: 1280px) 15vw, (min-width: 640px) 25vw, 45vw"
                            className="object-contain"
                          />
                        </span>
                        <span className="flex flex-1 flex-col p-2.5">
                          <span className="text-xs font-bold text-[var(--color-accent)]">
                            {String(asset.number).padStart(2, "0")}
                            {asset.visualNumberMayRead
                              ? ` (label may read ${asset.visualNumberMayRead})`
                              : ""}
                          </span>
                          <span className="mt-1 text-sm font-semibold leading-snug text-[var(--color-ink)]">
                            {asset.title}
                          </span>
                          <span
                            id={`asset-${asset.number}-state`}
                            className="mt-2 text-xs font-medium text-[var(--color-muted)]"
                          >
                            <span aria-hidden="true">{stateSymbols[state]} </span>
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

      {selectedAsset && selectedState ? (
        <div className="mt-6 rounded-sm border-2 border-[var(--color-focus)] bg-[var(--color-surface)] p-4">
          <p className="text-sm font-semibold text-[var(--color-accent)]">
            Asset {String(selectedAsset.number).padStart(2, "0")} ·{" "}
            {stateLabels.get(selectedState)}
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]">
            {selectedAsset.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            {selectedAsset.purpose}
          </p>

          {selectedState === "locked-by-evidence" ? (
            <p
              role="alert"
              className="mt-4 border-l-4 border-[var(--color-warning)] bg-[var(--color-wash)] p-3 text-sm text-[var(--color-warning)]"
            >
              {reference.evidenceGate.earlySelectionWarning}
            </p>
          ) : (
            <>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-ink)]">
                    Preconditions and context gate
                  </h4>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--color-muted)]">
                    {selectedAsset.contextGate.requiredEvidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm text-[var(--color-warning)]">
                    Warning: {selectedAsset.contextGate.warning}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-ink)]">
                    Interpret before assignment
                  </h4>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--color-muted)]">
                    {reference.decisionPrompts.map((prompt) => (
                      <li key={prompt}>{prompt}</li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {selectedState !== "committed" ? (
                  <button
                    type="button"
                    onClick={() => advanceAsset(selectedAsset)}
                    className="rounded-sm bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-focus)]"
                  >
                    {selectedState === "available"
                      ? "Mark relevant"
                      : selectedState === "relevant"
                        ? "Assign to trained responder"
                        : "Commit to branch"}
                  </button>
                ) : (
                  <p className="rounded-sm border border-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)]">
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
                  className="rounded-sm border border-[var(--color-line)] px-4 py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-wash)]"
                >
                  Wait / unknown
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      <div
        className="mt-5 flex flex-wrap gap-2"
        aria-label="Action Station state legend"
      >
        {reference.states.map((state) => (
          <span
            key={state.id}
            className="rounded-full border border-[var(--color-line)] px-3 py-1 text-xs text-[var(--color-muted)]"
            title={state.meaning}
          >
            <span aria-hidden="true">{stateSymbols[state.id]} </span>
            {state.label}
          </span>
        ))}
      </div>
    </section>
  );
}
