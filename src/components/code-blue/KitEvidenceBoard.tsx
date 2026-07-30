"use client";

import Image from "next/image";

import {
  ACTION_KIT_REQUIREMENTS,
  formatKitAssetIds,
  KIT_EQUIPMENT,
  type KitDomain,
} from "./kitEvidence";

const domainStyles: Record<KitDomain, string> = {
  airway: "border-sky-700/40",
  breathing: "border-[var(--color-accent)]/40",
  circulation: "border-[var(--color-warning)]/50",
  access: "border-emerald-700/40",
  family: "border-[var(--color-line)]",
};

export function KitEvidenceBoard({
  selectedAssets,
  onToggle,
  draftActionIds,
}: {
  selectedAssets: number[];
  onToggle: (assetNumber: number) => void;
  draftActionIds: string[];
}) {
  const requiredNow = [
    ...new Set(
      draftActionIds.flatMap(
        (actionId) => ACTION_KIT_REQUIREMENTS[actionId] ?? [],
      ),
    ),
  ].sort((a, b) => a - b);

  return (
    <section
      aria-labelledby="cb-kit-heading"
      className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
            From ChatGPT interactive Code Blue
          </p>
          <h2
            id="cb-kit-heading"
            className="font-[family-name:var(--font-display)] text-lg"
          >
            Emergency kit evidence
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-muted)]">
            Select kit assets as evidence cues for the draft board. Missing
            assets block commit in the UI — they do not create clinical
            indication. Engine truth stays authoritative.
          </p>
        </div>
        {requiredNow.length > 0 ? (
          <p className="rounded-sm bg-[var(--color-wash)] px-3 py-2 text-xs text-[var(--color-ink)]">
            Draft needs assets {formatKitAssetIds(requiredNow)}
          </p>
        ) : null}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {KIT_EQUIPMENT.map((item) => {
          const selected = selectedAssets.includes(item.number);
          const needed = requiredNow.includes(item.number);
          return (
            <li key={item.number}>
              <button
                type="button"
                onClick={() => onToggle(item.number)}
                aria-pressed={selected}
                className={`flex h-full w-full flex-col overflow-hidden rounded-sm border-2 text-left transition-colors ${
                  selected
                    ? "border-[var(--color-focus)] bg-[var(--color-accent-soft)]"
                    : needed
                      ? "border-[var(--color-warning)] bg-white"
                      : `border-[var(--color-line)] bg-white hover:border-[var(--color-accent)] ${domainStyles[item.domain]}`
                }`}
              >
                <span className="relative block aspect-square w-full bg-white">
                  <Image
                    src={item.src}
                    alt={`${String(item.number).padStart(2, "0")}. ${item.title}`}
                    fill
                    sizes="180px"
                    className="object-contain p-1"
                  />
                </span>
                <span className="flex flex-1 flex-col p-2.5">
                  <span className="text-xs font-bold text-[var(--color-accent)]">
                    {String(item.number).padStart(2, "0")}
                  </span>
                  <span className="mt-1 text-sm font-semibold leading-snug">
                    {item.title}
                  </span>
                  <span className="mt-auto pt-2 text-xs text-[var(--color-muted)]">
                    {selected
                      ? "Selected"
                      : needed
                        ? `Needed · ${item.initialState}`
                        : item.initialState}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
