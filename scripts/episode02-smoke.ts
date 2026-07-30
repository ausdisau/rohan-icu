/**
 * Phase 10 — Episode 02 start → debrief-hook smoke path.
 * Run: npx tsx scripts/episode02-smoke.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  advanceAfterConsequence,
  applyChoiceToSession,
  createSession,
} from "../src/engine/session";
import { projectFromCodeBlueSession } from "../src/engine/continuity-projection";
import {
  createCodeBlueSession,
  commitDraftBundle,
  reduceSimulation,
  cloneCatalog,
} from "../src/engine/simulation";
import {
  episodeManifestSchema,
  simulationNodeSchema,
} from "../src/schemas/node";
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

function main(): void {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const packDir = path.join(
    root,
    "content",
    "episodes",
    "breathing-room-ep02",
  );
  const readJson = (rel: string): unknown =>
    JSON.parse(readFileSync(path.join(packDir, rel), "utf8")) as unknown;

  console.log("\nEpisode 02 pack");
  const manifest = episodeManifestSchema.parse(readJson("episode.json"));
  assert(manifest.id === "breathing-room-ep02", "manifest id is ep02");
  assert(
    manifest.startNodeId === "ep02-arrival",
    "starts at ep02-arrival",
  );
  assert(
    manifest.chronologyLock.length >= 4,
    "chronology lock present",
  );

  const nodes = new Map<string, SimulationNode>();
  for (const id of manifest.nodeIds) {
    const node = simulationNodeSchema.parse(
      readJson(path.join("nodes", `${id}.json`)),
    );
    assert(node.id === id, `node ${id} parses`);
    nodes.set(id, node);
  }

  console.log("\nSmoke path start → debrief-hook");
  // Carry-forward projection from a minimal Code Blue completion
  let cb = createCodeBlueSession({
    id: "code-blue-alarm-after-rosc",
    version: "1",
    title: "t",
    subtitle: "s",
    startNodeId: "cb-quiet-stabilisation",
    nodeIds: ["cb-quiet-stabilisation"],
    chronologyLock: ["a", "b", "c", "d"],
    educationalBoundary: "boundary",
    simulationEngineRevision: 2,
  } as never);
  cb = commitDraftBundle(cb, ["protect-aac"]).session;
  cb = {
    ...cb,
    completed: true,
    richState: reduceSimulation(
      cb.richState,
      { type: "RESTORE_AAC_AFTER_RESCUE" },
      cloneCatalog(),
    ),
  };
  const projection = projectFromCodeBlueSession(cb);
  assert(projection.source === "code-blue", "projection sourced from code-blue");
  assert(
    projection.flags.aacRestoredAfterRescue === true,
    "AAC restore flag projected",
  );

  let session = createSession(manifest, projection.domainOverrides);
  assert(
    session.currentNodeId === "ep02-arrival",
    "session starts at arrival",
  );
  assert(
    (session.state.communicationAccess ?? 0) >=
      (session.initialState.communicationAccess ?? 0),
    "carry-forward can raise communication access vs baseline",
  );

  const pathChoiceIds = [
    "ep02-acknowledge-carry",
    "ep02-respiratory-triggers",
    "ep02-to-limits",
    "ep02-ask-rohan-first",
    "ep02-finish-reflect",
  ];

  for (const choiceId of pathChoiceIds) {
    const node = nodes.get(session.currentNodeId);
    assert(Boolean(node), `current node ${session.currentNodeId} exists`);
    if (!node) break;
    const choice = node.choices.find((c) => c.id === choiceId);
    assert(Boolean(choice), `choice ${choiceId} on ${node.id}`);
    if (!choice) break;
    session = applyChoiceToSession(session, node, choice);
    session = advanceAfterConsequence(session, choice, node);
  }

  assert(session.completed === true, "path completes at debrief-hook");
  assert(
    session.history.some((h) => h.nodeId === "ep02-debrief-hook"),
    "history includes ep02-debrief-hook",
  );
  assert(
    session.history.every((h) => !/dose|joule|shock energy/i.test(h.label)),
    "no dose/energy trainers on path labels",
  );

  console.log(`\nepisode02-smoke: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main();
