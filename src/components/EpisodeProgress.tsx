"use client";

/**
 * Season progress landmark — where the learner is in Ep01 → Code Blue → Ep02 → Authorship.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { id: "ep01", href: "/episode", label: "Episode 01" },
  { id: "code-blue", href: "/code-blue", label: "Code Blue" },
  { id: "ep02", href: "/episode-02", label: "Episode 02" },
  { id: "authorship", href: "/authorship", label: "Authorship" },
  { id: "debrief", href: "/debrief", label: "Debrief" },
] as const;

function activeStepId(pathname: string): string | null {
  if (pathname.startsWith("/authorship")) return "authorship";
  if (pathname.startsWith("/episode-02")) return "ep02";
  if (pathname.startsWith("/code-blue")) return "code-blue";
  if (pathname.startsWith("/episode")) return "ep01";
  if (pathname.startsWith("/debrief")) return "debrief";
  return null;
}

export function EpisodeProgress() {
  const pathname = usePathname();
  const active = activeStepId(pathname);
  if (!active) return null;

  return (
    <nav
      aria-label="Season progress"
      className="border-b border-[var(--color-line)] bg-[var(--color-wash)]"
    >
      <ol className="mx-auto flex max-w-5xl flex-wrap gap-2 px-4 py-2 text-xs sm:px-6 sm:text-sm">
        {STEPS.map((step, index) => {
          const isCurrent = step.id === active;
          return (
            <li key={step.id} className="flex items-center gap-2">
              {index > 0 ? (
                <span aria-hidden className="text-[var(--color-muted)]">
                  →
                </span>
              ) : null}
              <Link
                href={step.href}
                className={`rounded-sm px-2 py-1 ${
                  isCurrent
                    ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-ink)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {step.label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
