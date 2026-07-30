/**
 * Phase 5–6 story director tests.
 * Run: npm run story-director-test
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildDirectorInputFromPlayShell,
  directSceneDeterministic,
  enrichNarration,
  isLlmNarrationConfigured,
  lintNarrationViewModel,
} from "../src/story";
import type { CodeBlueManifest, CodeBlueScenarioNode } from "../src/schemas/code-blue";

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
  const directed = directSceneDeterministic(input);
  assert(directed.clinicalTruthUnchanged === true, "clinicalTruthUnchanged");
  assert(directed.source === "deterministic", "source is deterministic");
  assert(
    directed.summary === quiet.scene.summary,
    "deterministic keeps authored summary",
  );
  assert(
    directed.framingNotes.some((note) => /WAIT/i.test(note)),
    "framing mirrors WAIT",
  );
  assert(
    directed.framingNotes.some((note) => /pulse fragile/i.test(note)),
    "framing mirrors engine pulse",
  );
  const lint = lintNarrationViewModel(directed, input.compact);
  assert(lint.ok, "deterministic narration passes locks");

  console.log("\nLock rejection");
  const bad = lintNarrationViewModel(
    {
      source: "llm-enriched",
      summary: "Shock at 200 joules now. Samira should start compressions.",
      dialogue: [],
      captions: [],
      framingNotes: [],
      clinicalTruthUnchanged: true,
    },
    input.compact,
  );
  assert(!bad.ok, "invented shock/family clinical text is rejected");
  assert(
    bad.findings.some((finding) =>
      ["narration-dose-or-energy", "narration-family-clinical"].includes(
        finding.ruleId,
      ),
    ),
    "dose/energy or family-clinical rules fire",
  );

  console.log("\nLLM enricher fallback");
  assert(
    isLlmNarrationConfigured() === Boolean(process.env.OPENAI_API_KEY?.trim()),
    "configuration mirrors OPENAI_API_KEY",
  );
  const enriched = await enrichNarration(input);
  assert(
    enriched.clinicalTruthUnchanged === true,
    "enrichment keeps clinicalTruthUnchanged",
  );
  if (!process.env.OPENAI_API_KEY?.trim()) {
    assert(
      enriched.source === "deterministic",
      "without API key, enrichment falls back to deterministic",
    );
    assert(
      Boolean(enriched.fallbackReason),
      "fallback reason is explained",
    );
  }

  console.log(`\nstory-director-test: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
