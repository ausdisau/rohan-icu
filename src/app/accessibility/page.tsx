"use client";

import { useAccessibilitySettings } from "@/components/AccessibilityProvider";

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-[var(--color-line)] py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <div className="max-w-xl">
        <label htmlFor={id} className="text-base font-medium text-[var(--color-ink)]">
          {label}
        </label>
        <p id={`${id}-desc`} className="mt-1 text-sm text-[var(--color-muted)]">
          {description}
        </p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-desc`}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 h-8 w-14 shrink-0 rounded-sm border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${
          checked
            ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
            : "border-[var(--color-line)] bg-[var(--color-wash)]"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 h-6 w-6 rounded-sm bg-[var(--color-surface)] shadow-sm transition-transform ${
            checked ? "left-7" : "left-0.5"
          }`}
        />
        <span className="sr-only">{checked ? "On" : "Off"}</span>
      </button>
    </div>
  );
}

export default function AccessibilitySettingsPage() {
  const { settings, updateSettings, resetSettings } = useAccessibilitySettings();

  return (
    <div className="flex flex-col gap-6">
      <header className="border-b border-[var(--color-line)] pb-6">
        <p className="text-sm uppercase tracking-wide text-[var(--color-accent)]">
          Accessibility
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)]">
          Accessibility settings
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--color-muted)]">
          Preferences persist in this browser. The episode media player honours
          captions, transcript, descriptive text, and reduced-sensory defaults.
        </p>
      </header>

      <div className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] px-4 sm:px-6">
        <ToggleRow
          id="reduced-motion"
          label="Reduced motion"
          description="Minimise animation and transitions across the simulation UI."
          checked={settings.reducedMotion}
          onChange={(reducedMotion) => updateSettings({ reducedMotion })}
        />
        <ToggleRow
          id="reduced-sensory"
          label="Reduced sensory"
          description="Prefer calmer visuals and alarm alternatives (no alarm audio)."
          checked={settings.reducedSensory}
          onChange={(reducedSensory) => updateSettings({ reducedSensory })}
        />
        <ToggleRow
          id="captions-default"
          label="Captions on by default"
          description="Show captions when timed media is available."
          checked={settings.captionsDefaultOn}
          onChange={(captionsDefaultOn) => updateSettings({ captionsDefaultOn })}
        />
        <ToggleRow
          id="transcript-default"
          label="Transcript visible by default"
          description="Keep transcript panels open without extra discovery steps."
          checked={settings.transcriptDefaultVisible}
          onChange={(transcriptDefaultVisible) =>
            updateSettings({ transcriptDefaultVisible })
          }
        />
        <ToggleRow
          id="ad-default"
          label="Audio description on by default"
          description="Prefer descriptive text / AD tracks when present."
          checked={settings.audioDescriptionDefaultOn}
          onChange={(audioDescriptionDefaultOn) =>
            updateSettings({ audioDescriptionDefaultOn })
          }
        />
      </div>

      <button
        type="button"
        onClick={resetSettings}
        className="self-start rounded-sm border border-[var(--color-line)] px-4 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-wash)]"
      >
        Reset to defaults
      </button>
    </div>
  );
}
