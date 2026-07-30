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
  buildDirectorInputFromPlayShell,
  directSceneDeterministic,
  enrichNarration,
  getStoryLlmMode,
  isLlmNarrationConfigured,
  lintNarrationViewModel,
  mergeWithDeterministicAnchors,
  requiredAnchors,
} from "../src/story";

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

  console.log(`\nstory-director-test: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
