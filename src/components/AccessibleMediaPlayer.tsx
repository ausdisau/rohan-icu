"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { useAccessibilitySettings } from "@/components/AccessibilityProvider";
import type { MediaRef } from "@/types/media";

export function AccessibleMediaPlayer({ media }: { media: MediaRef }) {
  const { settings } = useAccessibilitySettings();
  const reactId = useId();
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showCaptions, setShowCaptions] = useState(settings.captionsDefaultOn);
  const [showTranscript, setShowTranscript] = useState(
    settings.transcriptDefaultVisible,
  );
  const [showAd, setShowAd] = useState(settings.audioDescriptionDefaultOn);

  useEffect(() => {
    setShowCaptions(settings.captionsDefaultOn);
  }, [settings.captionsDefaultOn]);

  useEffect(() => {
    setShowTranscript(settings.transcriptDefaultVisible);
  }, [settings.transcriptDefaultVisible]);

  useEffect(() => {
    setShowAd(settings.audioDescriptionDefaultOn);
  }, [settings.audioDescriptionDefaultOn]);

  const a11y = media.accessibility;
  const useReducedSensory =
    settings.reducedSensory && Boolean(a11y.reducedSensoryAlt);
  const isTimed = media.kind === "audio" || media.kind === "video";
  const title = media.title ?? media.id;

  function playPause() {
    const el = mediaRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().then(() => setPlaying(true));
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  function replay() {
    const el = mediaRef.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play().then(() => setPlaying(true));
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!isTimed) return;
    if (event.key === " " || event.key === "k") {
      event.preventDefault();
      playPause();
    }
    if (event.key === "Home") {
      event.preventDefault();
      replay();
    }
  }

  return (
    <figure
      className="rounded-sm border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
      onKeyDown={onKeyDown}
    >
      <figcaption className="mb-3 text-sm font-medium text-[var(--color-ink)]">
        {title}
      </figcaption>

      {useReducedSensory ? (
        <div
          role="note"
          className="rounded-sm border border-dashed border-[var(--color-warning)] bg-[var(--color-wash)]/50 p-3 text-sm text-[var(--color-muted)]"
        >
          <p className="font-medium text-[var(--color-ink)]">
            Reduced-sensory alternative
          </p>
          <p className="mt-1">{a11y.reducedSensoryAlt}</p>
        </div>
      ) : null}

      {/* Stills always available; reduced-sensory only swaps alarm-bearing timed media. */}
      {(media.kind === "image" || media.kind === "svg") &&
      !(useReducedSensory && a11y.reducedSensoryAlt) ? (
        <img
          src={media.src}
          alt={a11y.altText ?? title}
          className="max-h-80 w-full object-contain"
        />
      ) : null}

      {!useReducedSensory && media.kind === "video" ? (
        <video
          ref={(el) => {
            mediaRef.current = el;
          }}
          src={media.src}
          controls={false}
          playsInline
          preload="metadata"
          className="w-full max-w-full bg-[var(--color-ink)]/5"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          aria-describedby={
            showAd && a11y.audioDescription
              ? `${reactId}-ad`
              : undefined
          }
        >
          {showCaptions &&
          a11y.captions &&
          (a11y.captions.startsWith("/") ||
            a11y.captions.startsWith("http")) ? (
            <track
              kind="captions"
              srcLang="en"
              label="Captions"
              default
              src={a11y.captions}
            />
          ) : null}
        </video>
      ) : null}

      {!useReducedSensory && media.kind === "audio" ? (
        <audio
          ref={(el) => {
            mediaRef.current = el;
          }}
          src={media.src}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          className="w-full"
        />
      ) : null}

      {isTimed && !useReducedSensory ? (
        <div
          className="mt-3 flex flex-wrap gap-2"
          role="group"
          aria-label="Playback controls"
        >
          <button
            type="button"
            onClick={playPause}
            className="rounded-sm bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-focus)]"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={replay}
            className="rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-wash)]"
          >
            Replay
          </button>
        </div>
      ) : null}

      {/* Captions / transcript / AD stay available under reduced-sensory. */}
      {isTimed &&
      (a11y.captions || a11y.transcript || a11y.audioDescription) ? (
        <div
          className="mt-3 flex flex-wrap gap-2"
          role="group"
          aria-label="Access text controls"
        >
          {a11y.captions ? (
            <button
              type="button"
              aria-pressed={showCaptions}
              onClick={() => setShowCaptions((v) => !v)}
              className="rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-wash)]"
            >
              Captions {showCaptions ? "on" : "off"}
            </button>
          ) : null}
          {a11y.transcript ? (
            <button
              type="button"
              aria-pressed={showTranscript}
              onClick={() => setShowTranscript((v) => !v)}
              className="rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-wash)]"
            >
              Transcript
            </button>
          ) : null}
          {a11y.audioDescription ? (
            <button
              type="button"
              aria-pressed={showAd}
              onClick={() => setShowAd((v) => !v)}
              className="rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-wash)]"
            >
              Descriptive text
            </button>
          ) : null}
        </div>
      ) : null}

      {showCaptions && a11y.captions && isTimed ? (
        <div
          className="mt-3 rounded-sm bg-[var(--color-wash)] p-3 text-sm text-[var(--color-ink)]"
          aria-live="polite"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Captions
          </p>
          <p className="mt-1 whitespace-pre-wrap">{a11y.captions}</p>
        </div>
      ) : null}

      {showTranscript && a11y.transcript ? (
        <div className="mt-3 rounded-sm border border-[var(--color-line)] p-3 text-sm text-[var(--color-muted)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink)]">
            Transcript
          </p>
          <p className="mt-1 whitespace-pre-wrap">{a11y.transcript}</p>
        </div>
      ) : null}

      {showAd && a11y.audioDescription ? (
        <div
          id={`${reactId}-ad`}
          className="mt-3 rounded-sm border border-dashed border-[var(--color-line)] p-3 text-sm text-[var(--color-muted)]"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink)]">
            Audio description / descriptive text
          </p>
          <p className="mt-1 whitespace-pre-wrap">{a11y.audioDescription}</p>
        </div>
      ) : null}

      {a11y.extendedAltText ? (
        <details className="mt-3 text-sm text-[var(--color-muted)]">
          <summary className="cursor-pointer text-[var(--color-ink)]">
            Extended description
          </summary>
          <p className="mt-2 whitespace-pre-wrap">{a11y.extendedAltText}</p>
        </details>
      ) : null}

      <p className="mt-3 text-xs text-[var(--color-muted)]">
        Media never autoplays. Use Play when you are ready
        {settings.reducedMotion ? " · reduced motion on" : ""}.
      </p>
    </figure>
  );
}
