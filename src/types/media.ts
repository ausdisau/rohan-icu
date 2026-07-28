export type MediaKind = "image" | "audio" | "video" | "svg";

export interface MediaAccessibility {
  /** Caption track or on-screen captions for timed media. */
  captions?: string;
  /** Full transcript (required for audio/video paths in production). */
  transcript?: string;
  /** Audio description / descriptive text track. */
  audioDescription?: string;
  /** Concise alt text for stills / diagrams. */
  altText?: string;
  /** Extended description for complex visuals. */
  extendedAltText?: string;
  /** Reduced-sensory alternative (no alarm audio, calmer visual). */
  reducedSensoryAlt?: string;
}

export interface MediaRef {
  id: string;
  kind: MediaKind;
  /** Path under /public or content slot URI. */
  src: string;
  title?: string;
  accessibility: MediaAccessibility;
  /** When true, never autoplay; learner starts media. */
  autoplayForbidden?: boolean;
}
