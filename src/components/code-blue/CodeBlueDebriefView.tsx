"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import {
  exportCodeBlueDebriefJson,
  generateCodeBlueDebrief,
  loadCodeBlueSession,
  type CodeBlueDebriefResult,
} from "@/engine/simulation";
import type { CodeBlueDebriefFile } from "@/schemas/code-blue";

function subscribeNoop() {
  return () => {};
}

function downloadExport(result: CodeBlueDebriefResult) {
  const blob = new Blob([exportCodeBlueDebriefJson(result)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `code-blue-debrief-${result.episodeId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CodeBlueDebriefView({
  debrief,
}: {
  debrief: CodeBlueDebriefFile;
}) {
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [ready, setReady] = useState(false);

  if (isClient && !ready) {
    setReady(true);
  }

  const result = useMemo(() => {
    if (!ready) return null;
    const session = loadCodeBlueSession();
    if (!session) return null;
    return generateCodeBlueDebrief(session, debrief);
  }, [ready, debrief]);

  if (!ready) {
    return (
      <div className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
        <p className="text-[var(--color-muted)]">Loading Code Blue debrief…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)]">
          Code Blue debrief
        </h1>
        <p className="mt-3 text-[var(--color-muted)]">
          No Code Blue session found. Complete a PlayShell run first, then return
          here for scored reflection.
        </p>
        <Link
          href="/code-blue"
          className="mt-5 inline-flex rounded-sm bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-focus)]"
        >
          Open Code Blue PlayShell
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm uppercase tracking-wide text-[var(--color-accent)]">
          Code Blue · scored debrief
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)]">
          Pathway reflection
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--color-muted)]">
          {result.pathwaySummary} No single perfect path badge is awarded.
        </p>
      </header>

      <section
        aria-labelledby="cb-dimensions-heading"
        className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
      >
        <h2
          id="cb-dimensions-heading"
          className="font-[family-name:var(--font-display)] text-xl"
        >
          Six dimensions
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {result.dimensions.map((dim) => (
            <li
              key={dim.id}
              className="rounded-sm border border-[var(--color-line)] px-4 py-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-medium text-[var(--color-ink)]">
                  {dim.label}
                </h3>
                <p className="text-sm tabular-nums text-[var(--color-accent)]">
                  {dim.score}/{dim.max}
                </p>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-sm bg-[var(--color-wash)]"
                aria-hidden
              >
                <div
                  className="h-full bg-[var(--color-accent)]"
                  style={{ width: `${(dim.score / dim.max) * 100}%` }}
                />
              </div>
              <ul className="mt-2 space-y-1 text-sm text-[var(--color-muted)]">
                {dim.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="cb-tags-heading"
        className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
      >
        <h2
          id="cb-tags-heading"
          className="font-[family-name:var(--font-display)] text-xl"
        >
          Pathway tags
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {result.debriefTags.map((tag) => (
            <li
              key={tag}
              className="border border-[var(--color-line)] px-2 py-1 text-xs text-[var(--color-ink)]"
            >
              {tag}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg">
            What you noticed
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--color-muted)]">
            {result.whatNoticed.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg">
            Gaps & trade-offs
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--color-muted)]">
            {result.whatMissed.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="cb-prompts-heading"
        className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
      >
        <h2
          id="cb-prompts-heading"
          className="font-[family-name:var(--font-display)] text-xl"
        >
          Reflection prompts
        </h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-[var(--color-ink)]">
          {result.reflectionPrompts.map((prompt) => (
            <li key={prompt} className="leading-relaxed">
              {prompt}
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => downloadExport(result)}
          className="rounded-sm bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-focus)]"
        >
          Export event log + scores (JSON)
        </button>
        <Link
          href="/code-blue"
          className="rounded-sm border border-[var(--color-line)] px-4 py-2 text-sm hover:bg-[var(--color-wash)]"
        >
          Back to PlayShell
        </Link>
        <Link
          href="/episode-02"
          className="rounded-sm border border-[var(--color-line)] px-4 py-2 text-sm hover:bg-[var(--color-wash)]"
        >
          Continue to Episode 02
        </Link>
        <Link
          href="/debrief"
          className="rounded-sm border border-[var(--color-line)] px-4 py-2 text-sm hover:bg-[var(--color-wash)]"
        >
          Episode 01 debrief shell
        </Link>
      </div>
    </div>
  );
}
