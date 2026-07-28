import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";

import { AccessibilityProvider } from "@/components/AccessibilityProvider";
import { SiteHeader } from "@/components/SiteHeader";

import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Breathing Room — Rohan Malik ICU Simulation",
  description:
    "Branching ICU simulation: post-ROSC care, communication access, and clinical trade-offs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-[family-name:var(--font-body)]">
        <AccessibilityProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-[var(--color-surface)] focus:px-3 focus:py-2"
          >
            Skip to main content
          </a>
          <SiteHeader />
          <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
            {children}
          </main>
          <footer className="border-t border-[var(--color-line)] bg-[var(--color-surface)]">
            <div className="mx-auto max-w-5xl px-4 py-4 text-sm text-[var(--color-muted)] sm:px-6">
              Between the Lines / Breathing Room — ICU simulation. No exact drug
              names or doses.
            </div>
          </footer>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
