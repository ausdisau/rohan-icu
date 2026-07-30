/**
 * Phase 5–6 story director tests.
 * Run: npm run story-director-test
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { directorCuesFileSchema } from "../src/schemas/director-cues";
import type { CodeBlueManifest, CodeBlueScenarioNode } from "../src/schemas/code-blue";
import {
  buildDirectorInputFromEpisodeNode,
  buildDirectorInputFromPlayShell,
  checkNarrationRateLimit,
  directSceneDeterministic,
  enrichNarration,
  getStoryLlmMode,
  isLlmNarrationConfigured,
  isNarrationFeatureEnabled,
  lintNarrationViewModel,
  mergeWithDeterministicAnchors,
  requiredAnchors,
  resetNarrationRateLimits,
} from "../src/story";
import type { SimulationNode } from "../src/types/node";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ok  ${message}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${message}`);
  }
}

async function main(): Promise<void> {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const packDir = path.join(
    root,
    "content",
    "episodes",
    "breathing-room",
    "code-blue",
  );
  const manifest = JSON.parse(
    readFileSync(path.join(packDir, "manifest.json"), "utf8"),
  ) as CodeBlueManifest;
  const quiet = JSON.parse(
    readFileSync(
      path.join(packDir, "nodes", "cb-quiet-stabilisation.json"),
      "utf8",
    ),
  ) as CodeBlueScenarioNode;
  const cues = directorCuesFileSchema.parse(
    JSON.parse(readFileSync(path.join(packDir, "director-cues.json"), "utf8")),
  );

  console.log("\nDirector cues");
  assert(cues.phase === 5, "director-cues phase is 5");
  assert(
    Object.keys(cues.nodes).length === manifest.nodeIds.length,
    "director cues cover every manifest node",
  );
  for (const nodeId of manifest.nodeIds) {
    assert(Boolean(cues.nodes[nodeId]), `cue exists for ${nodeId}`);
  }

  console.log("\nDeterministic director");
  const input = buildDirectorInputFromPlayShell({
    node: quiet,
    educationalBoundary: manifest.educationalBoundary,
    chronologyLock: manifest.chronologyLock,
    compact: {
      playPhase: "observe",
      pulse: "fragile",
      rhythm: "frequent-ectopy",
      airwayRoute: "current acute ET route",
      chestMovement: "stable",
      defibrillatorReady: false,
      aacInstruction: "WAIT",
      aacVisible: true,
      crisisDebtLevel: "moderate",
      provisionalRoscNeedsConfirm: false,
      postRoscReassessmentDue: true,
    },
    emergencyOverride: false,
  });
  const directed = directSceneDeterministic(input, { cues });
  assert(directed.clinicalTruthUnchanged === true, "clinicalTruthUnchanged");
  assert(directed.source === "deterministic", "source is deterministic");
  assert(
    directed.summary.includes(cues.nodes["cb-quiet-stabilisation"].bridge),
    "summary includes director bridge",
  );
  assert(
    directed.summary.includes(quiet.scene.summary),
    "summary retains authored scene text",
  );
  assert(
    directed.framingNotes.some((note) => /WAIT/i.test(note)),
    "framing mirrors WAIT",
  );
  assert(
    directed.framingNotes.some((note) => /pulse fragile/i.test(note)),
    "framing mirrors engine pulse",
  );
  assert(
    directed.framingNotes.some((note) => /Director intent/i.test(note)),
    "framing includes director intent",
  );
  assert(
    directed.captions.some((line) => /LAST EMERGENCY IS HISTORY/i.test(line)),
    "canon phrase appears in captions",
  );
  const lint = lintNarrationViewModel(directed, input.compact);
  assert(lint.ok, "deterministic narration passes locks");

  console.log("\nAnchor merge");
  const anchors = requiredAnchors(input);
  assert(anchors.some((a) => /WAIT/i.test(a)), "anchors include WAIT");
  const merged = mergeWithDeterministicAnchors(
    input,
    directed,
    {
      summary: "A quieter bay still asks what changed.",
      dialogue: directed.dialogue,
      captions: ["Flavour caption only"],
      framingNotes: ["LLM colour note"],
    },
    "llm-enriched",
    "test merge",
  );
  assert(
    merged.framingNotes.some((note) => /pulse fragile/i.test(note)),
    "merge re-applies monitor anchor",
  );
  assert(
    merged.framingNotes.some((note) => /Educational boundary/i.test(note)),
    "merge re-applies educational boundary",
  );

  console.log("\nLock rejection");
  const bad = lintNarrationViewModel(
    {
      source: "llm-enriched",
      summary:
        "Deliver a shock at 200 joules now. Samira should start compressions. Perform gesture CPR while waiting.",
      dialogue: [],
      captions: [],
      framingNotes: [],
      clinicalTruthUnchanged: true,
    },
    input.compact,
  );
  assert(!bad.ok, "invented shock/family clinical text is rejected");

  console.log("\nPhase 6 modes");
  const previousMode = process.env.STORY_LLM_MODE;
  delete process.env.STORY_LLM_MODE;
  delete process.env.OPENAI_API_KEY;
  assert(getStoryLlmMode() === "off", "default mode is off without key");
  assert(isLlmNarrationConfigured() === false, "off mode is not configured");

  process.env.STORY_LLM_MODE = "mock";
  assert(getStoryLlmMode() === "mock", "mock mode selectable");
  assert(isLlmNarrationConfigured() === true, "mock mode is configured");
  const mocked = await enrichNarration(input, { cues });
  assert(mocked.source === "llm-enriched", "mock enrichment marks llm-enriched");
  assert(
    mocked.summary.includes("Mock director colour"),
    "mock summary includes colour marker",
  );
  assert(
    mocked.framingNotes.some((note) => /WAIT/i.test(note)),
    "mock merge keeps WAIT anchor",
  );
  assert(
    lintNarrationViewModel(mocked, input.compact).ok,
    "mock enrichment passes locks",
  );

  if (previousMode === undefined) delete process.env.STORY_LLM_MODE;
  else process.env.STORY_LLM_MODE = previousMode;

  console.log("\nPhase 11 production guards");
  const prevEnabled = process.env.STORY_NARRATION_ENABLED;
  const prevLimit = process.env.STORY_NARRATION_RATE_LIMIT_PER_MIN;
  delete process.env.STORY_NARRATION_ENABLED;
  assert(isNarrationFeatureEnabled() === true, "narration enabled by default");
  process.env.STORY_NARRATION_ENABLED = "false";
  assert(isNarrationFeatureEnabled() === false, "feature flag can disable narration");
  process.env.STORY_NARRATION_ENABLED = "true";
  process.env.STORY_NARRATION_RATE_LIMIT_PER_MIN = "2";
  resetNarrationRateLimits();
  assert(checkNarrationRateLimit("test-client").allowed, "first request allowed");
  assert(checkNarrationRateLimit("test-client").allowed, "second request allowed");
  assert(
    checkNarrationRateLimit("test-client").allowed === false,
    "third request rate-limited at 2/min",
  );
  resetNarrationRateLimits();
  if (prevEnabled === undefined) delete process.env.STORY_NARRATION_ENABLED;
  else process.env.STORY_NARRATION_ENABLED = prevEnabled;
  if (prevLimit === undefined) delete process.env.STORY_NARRATION_RATE_LIMIT_PER_MIN;
  else process.env.STORY_NARRATION_RATE_LIMIT_PER_MIN = prevLimit;

  console.log("\nEpisode 01 director cues");
  const ep01Dir = path.join(root, "content", "episodes", "breathing-room");
  const ep01Cues = directorCuesFileSchema.parse(
    JSON.parse(readFileSync(path.join(ep01Dir, "director-cues.json"), "utf8")),
  );
  const ep01Manifest = JSON.parse(
    readFileSync(path.join(ep01Dir, "episode.json"), "utf8"),
  ) as { nodeIds: string[]; chronologyLock: string[] };
  assert(ep01Cues.id === "episode-01-director-cues", "ep01 cues id");
  assert(ep01Cues.phase === 11, "ep01 cues phase is 11");
  for (const nodeId of ep01Manifest.nodeIds) {
    assert(Boolean(ep01Cues.nodes[nodeId]), `ep01 cue exists for ${nodeId}`);
  }
  const arrival = JSON.parse(
    readFileSync(
      path.join(ep01Dir, "nodes", "ep01-arrival-framing.json"),
      "utf8",
    ),
  ) as SimulationNode;
  const epInput = buildDirectorInputFromEpisodeNode({
    node: arrival,
    educationalBoundary: "Educational boundary for test.",
    chronologyLock: ep01Manifest.chronologyLock,
  });
  const epDirected = directSceneDeterministic(epInput, { cues: ep01Cues });
  assert(
    epDirected.summary.includes(ep01Cues.nodes["ep01-arrival-framing"].bridge),
    "ep01 summary includes director bridge",
  );
  assert(
    epDirected.clinicalTruthUnchanged === true,
    "ep01 director keeps clinicalTruthUnchanged",
  );
  assert(
    lintNarrationViewModel(epDirected, epInput.compact).ok,
    "ep01 deterministic narration passes locks",
  );

  console.log(`\nstory-director-test: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
