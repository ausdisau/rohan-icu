"use client";

export function RohanAacPanel({
  line,
  methodLabel,
}: {
  line?: string;
  methodLabel?: string;
}) {
  return (
    <aside
      aria-labelledby="aac-panel-heading"
      className="rounded-sm border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)]/50 p-4"
    >
      <h2
        id="aac-panel-heading"
        className="text-sm font-semibold uppercase tracking-wide text-[var(--color-accent)]"
      >
        Rohan’s AAC
      </h2>
      {methodLabel ? (
        <p className="mt-1 text-xs text-[var(--color-muted)]">{methodLabel}</p>
      ) : null}
      {line ? (
        <blockquote className="mt-3 font-[family-name:var(--font-display)] text-xl leading-snug tracking-wide text-[var(--color-ink)]">
          <p>{line}</p>
        </blockquote>
      ) : (
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          No AAC line on this branch yet. Keep addressing Rohan directly and wait
          for his pace.
        </p>
      )}
      <p className="mt-3 text-xs text-[var(--color-muted)]">
        Canon phrasing is reused verbatim — never paraphrased into defeat framing.
      </p>
    </aside>
  );
}
