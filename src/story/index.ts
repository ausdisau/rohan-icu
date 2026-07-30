/**
 * Phase 5–6 story layer.
 * Clinical truth remains in src/engine/simulation — this layer is display-only.
 */

export {
  buildDirectorInputFromPlayShell,
  directScene,
  directSceneDeterministic,
} from "./director";
export { lintNarrationAgainstCompact, lintNarrationViewModel } from "./locks";
export { enrichNarration, isLlmNarrationConfigured } from "./llm";
export type {
  LlmNarrationRequest,
  LlmNarrationResponse,
  NarrationDialogueLine,
  NarrationSource,
  NarrationViewModel,
  StoryDirectorCompactSnapshot,
  StoryDirectorInput,
} from "./types";
