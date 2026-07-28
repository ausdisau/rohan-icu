export interface AccessibilitySettings {
  reducedMotion: boolean;
  reducedSensory: boolean;
  /** Prefer captions on by default for timed media. */
  captionsDefaultOn: boolean;
  /** Prefer transcript panel available without extra discovery. */
  transcriptDefaultVisible: boolean;
  /** Prefer audio description / descriptive text when available. */
  audioDescriptionDefaultOn: boolean;
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  reducedMotion: false,
  reducedSensory: false,
  captionsDefaultOn: true,
  transcriptDefaultVisible: false,
  audioDescriptionDefaultOn: false,
};
