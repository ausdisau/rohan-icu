/**
 * Phase 5–6 story layer.
 * Clinical truth remains in src/engine/simulation — this layer is display-only.
 */

export {
  formatCanonCaption,
  getCanonPhrase,
  resolveCanonPhrases,
} from "./canon";
export {
  buildDirectorInputFromEpisodeNode,
  buildDirectorInputFromPlayShell,
  directScene,
  directSceneDeterministic,
} from "./director";
export { lintNarrationAgainstCompact, lintNarrationViewModel } from "./locks";
export {
  enrichNarration,
  getStoryLlmMode,
  isLlmNarrationConfigured,
  type StoryLlmMode,
} from "./llm";
export { mergeWithDeterministicAnchors, requiredAnchors } from "./merge";
export {
  checkNarrationRateLimit,
  getNarrationRateLimitPerMinute,
  isNarrationFeatureEnabled,
  logNarrationTelemetry,
  resetNarrationRateLimits,
  type NarrationTelemetryEvent,
} from "./production";
export type {
  LlmNarrationRequest,
  LlmNarrationResponse,
  NarrationDialogueLine,
  NarrationSource,
  NarrationViewModel,
  StoryDirectorCompactSnapshot,
  StoryDirectorInput,
} from "./types";
