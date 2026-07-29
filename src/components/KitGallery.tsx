"use client";

import { AccessibleMediaPlayer } from "@/components/AccessibleMediaPlayer";
import type { MediaRef } from "@/types/media";

/** Media ids / paths for Rohan's personal emergency bag stills. */
export function isEmergencyKitMedia(media: MediaRef): boolean {
  const id = media.id.toLowerCase();
  if (id.startsWith("kit-") || id.startsWith("emergency-kit")) return true;
  return media.src.toLowerCase().includes("/emergency-kit/");
}

export function isStillMedia(media: MediaRef): boolean {
  return media.kind === "image" || media.kind === "svg";
}

/**
 * Prefer a labelled grid when a node ships many kit stills
 * (cognitive load vs full-width stacked players).
 */
export function shouldUseKitGallery(media: MediaRef[]): boolean {
  const kitStills = media.filter(
    (item) => isStillMedia(item) && isEmergencyKitMedia(item),
  );
  return kitStills.length >= 3;
}

export function KitGallery({
  media,
  headingId = "media-heading",
}: {
  media: MediaRef[];
  headingId?: string;
}) {
  const kitStills = media.filter(
    (item) => isStillMedia(item) && isEmergencyKitMedia(item),
  );
  const other = media.filter((item) => !kitStills.includes(item));

  return (
    <div className="flex flex-col gap-4">
      {kitStills.length > 0 ? (
        <ul
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
          aria-labelledby={headingId}
        >
          {kitStills.map((item) => (
            <li key={item.id} className="min-w-0">
              <AccessibleMediaPlayer media={item} layout="gallery" />
            </li>
          ))}
        </ul>
      ) : null}
      {other.map((item) => (
        <AccessibleMediaPlayer key={item.id} media={item} />
      ))}
    </div>
  );
}
