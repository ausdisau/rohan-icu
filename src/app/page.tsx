import Link from "next/link";

import {
  loadCodeBlueManifest,
  loadEpisodeManifest,
} from "@/lib/content";

export default async function HomePage() {
  const [episode, codeBlue] = await Promise.all([
    loadEpisodeManifest(),
    loadCodeBlueManifest(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <section className="relative overflow-hidden rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-12 sm:px-10 sm:py-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            backgroundImage:
              "linear-gradient(135deg, transparent 40%, #c5dde2 100%), repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(47,111,122,0.06) 24px, rgba(47,111,122,0.06) 25px)",
          }}
        />
        <div className="relative max-w-2xl">
          <p className="font-[family-name:var(--font-display)] text-4xl leading-tight tracking-tight text-[var(--color-ink)] sm:text-5xl">
            Breathing Room
          </p>
          <h1 className="mt-4 text-xl font-semibold text-[var(--color-ink)] sm:text-2xl">
            {episode.title}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--color-muted)]">
            A branching ICU simulation that begins after sustained ROSC. Decisions
            move multi-domain state—infection, renal reserve, communication
            access, home and school rights—not a single health score.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/episode"
              className="inline-flex items-center justify-center rounded-sm bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-focus)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              Open episode player
            </Link>
            <Link
              href="/code-blue"
              className="inline-flex items-center justify-center rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-wash)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              {codeBlue.title}
            </Link>
            <Link
              href="/accessibility"
              className="inline-flex items-center justify-center rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-wash)]"
            >
              Accessibility settings
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="chronology-heading" className="prose-clinical">
        <h2
          id="chronology-heading"
          className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)]"
        >
          Locked chronology
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-[var(--color-muted)]">
          {episode.chronologyLock.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
