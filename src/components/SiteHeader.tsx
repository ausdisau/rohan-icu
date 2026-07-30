"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/episode", label: "Episode" },
  { href: "/code-blue", label: "Code Blue" },
  { href: "/debrief", label: "Debrief" },
  { href: "/accessibility", label: "Accessibility" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--color-ink)]"
        >
          Breathing Room
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap gap-1">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-sm px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
                  active
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
