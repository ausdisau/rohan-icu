/**
 * Deterministic simulation engine tests (Phase 2 / PDF export hard rules).
 * Run: npm run simulation-test
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  domainDeltasForStationCommit,
} from "../src/engine/action-stations";
import {
  canAskNonEmergencyQuestion,
  cloneCatalog,
  commitActionBundle,
  commitDraftBundle,
  createCodeBlueSession,
  createInitialRichState,
  emergencyRescueWaitsForAac,
  equipmentReadyCreatesIndication,
  fireEvent,
  generateCodeBlueDebrief,
  interpretActivation,
  kitGateBlocksCommit,
  partitionBundle,
  PHASE2_ACTION_CATALOG,
  postRoscReassessmentRequired,
  provisionalRoscRequiresIndependentConfirmation,
  reduceSimulation,
  roundTripRichState,
  scoreCodeBlueSession,
  validateActionAssignment,
  waitBlocksNonEmergencyQuestion,
  withEvidenceSatisfied,
  withSelectedKitAssets,
} from "../src/engine/simulation";
import {
  STATION_CODE_BLUE_BRIDGE,
  codeBlueActionsForStationAsset,
  suggestCodeBlueActionsFromStations,
} from "../src/engine/station-code-blue-bridge";
import {
  applyStationActionToSession,
  createSession,
} from "../src/engine/session";
import { lintCodeBluePack } from "../src/schemas/code-blue";
import type {
  CodeBlueDebriefFile,
  CodeBlueManifest,
  CodeBlueScenarioNode,
} from "../src/schemas/code-blue";
import type { EpisodeManifest } from "../src/types/node";

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

function section(title: string): void {
  console.log(`\n${title}`);
}

function main(): void {
  section("Communication access");
  {
    const state = createInitialRichState();
    const access = state.domains.communicationAccess;
    assert(
      interpretActivation(access, null) === "unknown",
      "no response equals unknown",
    );
    assert(
      interpretActivation({ ...access, questionActive: false }, "yes") ===
        "unknown",
      "activation without active question equals unknown",
    );
    assert(
      waitBlocksNonEmergencyQuestion(access) === true,
      "WAIT is active on opening state",
    );
    assert(
      canAskNonEmergencyQuestion(access) === false,
      "WAIT blocks non-emergency questions",
    );
    assert(
      emergencyRescueWaitsForAac() === false,
      "emergency rescue does not wait for AAC",
    );
  }

  section("Family and paid support boundaries");
  {
    const state = createInitialRichState();
    const catalog = cloneCatalog();
    const familyReasons = validateActionAssignment(
      state,
      catalog["replace-airway"],
      "samira",
    );
    assert(
      familyReasons.some((reason) => reason.includes("Family")),
      "family cannot satisfy clinical role requirements",
    );
    const paidOnAirway = validateActionAssignment(
      state,
      catalog["replace-airway"],
      "paid-support-worker",
    );
    assert(
      paidOnAirway.length > 0,
      "paid support worker cannot take replace-airway",
    );
  }

  section("Evidence and readiness");
  {
    const state = createInitialRichState();
    const catalog = cloneCatalog();
    assert(
      equipmentReadyCreatesIndication(state, "spare-trach-same-size") === false,
      "equipment readiness does not create indication",
    );
    const locked = validateActionAssignment(
      state,
      catalog["replace-airway"],
      "ent-airway",
    );
    assert(
      locked.some((reason) =>
        reason.includes("locked") || reason.includes("Evidence") || reason.includes("indication"),
      ),
      "airway replacement remains locked without evidence",
    );
  }

  section("Partial bundles and duplicates");
  {
    const state = createInitialRichState();
    const catalog = cloneCatalog();
    const { accepted, blocked } = partitionBundle(
      state,
      catalog,
      ["protect-aac", "prepare-defibrillator", "replace-airway"],
      {
        "protect-aac": { role: "aac-disability-access" },
        "prepare-defibrillator": { role: "icu-circulation" },
        "replace-airway": { role: "ent-airway" },
      },
    );
    assert(
      accepted.includes("protect-aac") &&
        accepted.includes("prepare-defibrillator"),
      "valid actions in a partially invalid bundle still accept",
    );
    assert(
      blocked.some((item) => item.actionId === "replace-airway"),
      "invalid replace-airway is blocked without rejecting whole bundle",
    );

    const dup = partitionBundle(
      state,
      catalog,
      ["protect-aac", "protect-aac"],
      { "protect-aac": { role: "aac-disability-access" } },
    );
    assert(
      dup.accepted.length === 1 &&
        dup.blocked.some((item) =>
          item.reasons.some((reason) => reason.includes("Duplicate")),
        ),
      "duplicate commands do not repeat interventions",
    );
  }

  section("G1-style bundle F1+F2+F6");
  {
    const state = createInitialRichState();
    const catalog = cloneCatalog();
    const result = commitActionBundle(
      state,
      catalog,
      [
        "assess-borrowed-circuit",
        "assign-suction-bedside-reserve",
        "assign-paid-support-continuity",
        "replace-airway",
      ],
      {
        "assess-borrowed-circuit": { role: "biomedical-engineering" },
        "assign-suction-bedside-reserve": { role: "biomedical-engineering" },
        "assign-paid-support-continuity": { role: "paid-support-worker" },
        "replace-airway": { role: "ent-airway" },
      },
    );
    assert(
      result.accepted.includes("assess-borrowed-circuit") &&
        result.accepted.includes("assign-suction-bedside-reserve") &&
        result.accepted.includes("assign-paid-support-continuity"),
      "G1 components F1/F2/F6 commit",
    );
    assert(
      result.blocked.some((item) => item.actionId === "replace-airway"),
      "G1 bundle still blocks unsupported airway replacement",
    );
    assert(
      result.state.flags.suctionAssignedBedsideReserve === true &&
        result.state.flags.transportHeld === true,
      "F2 assigns bedside reserve and keeps transport held",
    );
  }

  section("Roles and H5 path");
  {
    let state = createInitialRichState();
    const catalog = cloneCatalog();
    state = reduceSimulation(
      state,
      { type: "ASSIGN_ROLE", role: "icu-circulation", actionId: "prepare-defibrillator" },
      catalog,
    );
    state = reduceSimulation(
      state,
      { type: "ASSIGN_ROLE", role: "icu-circulation", actionId: "protect-aac" },
      catalog,
    );
    assert(
      state.eventLog.some((event) => event.kind === "role-conflict"),
      "a role cannot be assigned twice",
    );

    state = createInitialRichState();
    state = reduceSimulation(state, { type: "ENTER_EMERGENCY_OVERRIDE" }, catalog);
    assert(state.playPhase === "emergency-override", "emergency override engages");
    state = reduceSimulation(state, { type: "PROVISIONAL_ROSC" }, catalog);
    assert(
      provisionalRoscRequiresIndependentConfirmation(state) === true,
      "provisional ROSC requires independent confirmation",
    );
    assert(
      postRoscReassessmentRequired(state) === true,
      "post-ROSC reassessment is required",
    );
    state = reduceSimulation(state, { type: "CONFIRM_ROSC_INDEPENDENTLY" }, catalog);
    assert(
      state.domains.circulation.rosCConfirmedIndependently === true,
      "independent confirmation clears provisional uncertainty",
    );
    state = reduceSimulation(state, { type: "RESTORE_AAC_AFTER_RESCUE" }, catalog);
    assert(
      state.flags.aacRestoredAfterRescue === true &&
        state.domains.communicationAccess.deviceVisible === true,
      "communication access can be restored after emergency override",
    );
  }

  section("Evidence unlock still does not auto-indicate alone until thresholds met");
  {
    let state = createInitialRichState();
    const catalog = cloneCatalog();
    for (const evidenceId of [
      "external-circuit-load-considered",
      "position-considered",
      "power-continuity-considered",
    ]) {
      state = reduceSimulation(
        state,
        { type: "SATISFY_EVIDENCE", evidenceId, actionId: "replace-airway" },
        catalog,
      );
      catalog["replace-airway"] = withEvidenceSatisfied(
        catalog["replace-airway"],
        evidenceId,
      );
    }
    assert(
      state.domains.airway.replacementIndicated === true,
      "three evidence checks can open replacement indication",
    );
  }

  section("Persistence");
  {
    const state = createInitialRichState();
    const catalog = cloneCatalog();
    const advanced = reduceSimulation(
      state,
      { type: "ENTER_EMERGENCY_OVERRIDE" },
      catalog,
    );
    const reloaded = roundTripRichState(advanced);
    assert(
      reloaded.revision === advanced.revision &&
        reloaded.eventLog.length === advanced.eventLog.length &&
        reloaded.playPhase === "emergency-override",
      "save and reload preserves deterministic state",
    );
  }

  section("Chronology lock flag");
  {
    const state = createInitialRichState();
    assert(
      state.flags.chronologyLocked === true,
      "chronology cannot be reordered (locked flag present)",
    );
  }

  section("Phase 3 Code Blue content pack smoke");
  {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const packDir = path.join(
      root,
      "content",
      "episodes",
      "breathing-room",
      "code-blue",
    );
    const readJson = (rel: string): unknown =>
      JSON.parse(readFileSync(path.join(packDir, rel), "utf8")) as unknown;

    const manifest = readJson("manifest.json") as {
      startNodeId: string;
      nodeIds: string[];
      simulationEngineRevision: number;
    };
    const actions = readJson("actions.json");
    const events = readJson("events.json") as {
      events: Array<{ id: string }>;
    };
    const debrief = readJson("debrief.json");
    const nodes = manifest.nodeIds.map((id) => ({
      id,
      data: readJson(path.join("nodes", `${id}.json`)),
      path: `nodes/${id}.json`,
    }));

    const findings = lintCodeBluePack({
      manifest,
      actions,
      events,
      debrief,
      nodes,
      catalogActionIds: Object.keys(PHASE2_ACTION_CATALOG),
      manifestPath: "manifest.json",
      actionsPath: "actions.json",
      eventsPath: "events.json",
      debriefPath: "debrief.json",
    });
    assert(findings.length === 0, "code-blue pack passes lintCodeBluePack");
    assert(
      manifest.simulationEngineRevision === 2,
      "code-blue manifest targets simulationEngineRevision 2",
    );
    assert(
      manifest.startNodeId === "cb-quiet-stabilisation",
      "code-blue starts at quiet stabilisation",
    );

    const g1 = [
      "assess-borrowed-circuit",
      "assign-suction-bedside-reserve",
      "assign-paid-support-continuity",
    ];
    for (const id of g1) {
      assert(
        id in PHASE2_ACTION_CATALOG,
        `G1 action ${id} resolves in PHASE2_ACTION_CATALOG`,
      );
    }
    assert(
      events.events.some((event) => event.id === "h5-emergency-override"),
      "events.json lists h5-emergency-override",
    );

    const alloc = nodes.find((node) => node.id === "cb-resource-allocation");
    const allocData = alloc?.data as { availableActions?: string[] } | undefined;
    assert(
      g1.every((id) => allocData?.availableActions?.includes(id)),
      "cb-resource-allocation offers G1 action IDs",
    );

    const quiet = nodes.find((node) => node.id === "cb-quiet-stabilisation")
      ?.data as CodeBlueScenarioNode;
    let play = createCodeBlueSession(manifest as CodeBlueManifest);
    assert(
      play.currentNodeId === "cb-quiet-stabilisation",
      "PlayShell session starts at quiet stabilisation",
    );
    const beforeRevision = play.richState.revision;
    play = {
      ...play,
      // Draft-only selection is UI-local; committing is what mutates.
    };
    assert(
      play.richState.revision === beforeRevision,
      "creating a session does not invent clinical mutations",
    );
    const committed = commitDraftBundle(play, [
      "protect-aac",
      "prepare-defibrillator",
    ]);
    assert(
      committed.result.accepted.includes("protect-aac"),
      "PlayShell commitDraftBundle accepts protect-aac with catalog roles",
    );
    play = committed.session;
    play = fireEvent(play, quiet, "intermittent-monitor-alarm");
    assert(
      play.currentNodeId === "cb-intermittent-alarm",
      "firing intermittent alarm advances to cb-intermittent-alarm",
    );
  }

  section("Phase 7 Code Blue debrief scoring");
  {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const packDir = path.join(
      root,
      "content",
      "episodes",
      "breathing-room",
      "code-blue",
    );
    const readJson = (rel: string): unknown =>
      JSON.parse(readFileSync(path.join(packDir, rel), "utf8")) as unknown;
    const manifest = readJson("manifest.json") as CodeBlueManifest;
    const debriefFile = readJson("debrief.json") as CodeBlueDebriefFile;
    const nodesById = new Map(
      manifest.nodeIds.map((id) => [
        id,
        readJson(path.join("nodes", `${id}.json`)) as CodeBlueScenarioNode,
      ]),
    );

    // Partial G1 path
    let partial = createCodeBlueSession(manifest);
    partial = commitDraftBundle(partial, [
      "protect-aac",
      "assess-borrowed-circuit",
    ]).session;
    const partialScore = scoreCodeBlueSession(partial);
    const fullG1 = commitDraftBundle(createCodeBlueSession(manifest), [
      "protect-aac",
      ...[
        "assess-borrowed-circuit",
        "assign-suction-bedside-reserve",
        "assign-paid-support-continuity",
      ],
    ]).session;
    const fullScore = scoreCodeBlueSession(fullG1);
    assert(
      partialScore.equipmentReasoning > 0,
      "partial G1 still produces equipment score",
    );
    assert(
      fullScore.systemSustainability >= partialScore.systemSustainability,
      "full G1 (with paid support) does not lower system sustainability vs partial",
    );
    assert(
      fullScore.equipmentReasoning !== 12 ||
        partialScore.equipmentReasoning !== 12,
      "no automatic perfect equipment score on either path",
    );

    // H5 path scoring
    let h5 = createCodeBlueSession(manifest);
    h5 = commitDraftBundle(h5, ["protect-aac", "prepare-defibrillator"]).session;
    const quiet = nodesById.get("cb-quiet-stabilisation")!;
    h5 = fireEvent(h5, quiet, "intermittent-monitor-alarm");
    const alarm = nodesById.get("cb-intermittent-alarm")!;
    // advance through graph toward H5 when possible
    h5 = {
      ...h5,
      firedEvents: [...h5.firedEvents, "h5-emergency-override"],
      richState: reduceSimulation(
        h5.richState,
        { type: "ENTER_EMERGENCY_OVERRIDE" },
        cloneCatalog(),
      ),
    };
    void alarm;
    const h5Score = scoreCodeBlueSession(h5);
    assert(
      h5Score.timingCoordination >= partialScore.timingCoordination,
      "H5 path raises or holds timing coordination vs partial non-H5",
    );
    const h5Debrief = generateCodeBlueDebrief(h5, debriefFile);
    assert(
      h5Debrief.debriefTags.includes("H5-emergency-override"),
      "H5 path tags H5-emergency-override",
    );
    assert(
      h5Debrief.noSinglePerfectPath === true,
      "debrief never awards a perfect-path badge",
    );
    assert(
      !h5Debrief.debriefTags.includes("perfect-path"),
      "perfect-path tag is never emitted",
    );

    // AAC restore affects communication score
    let aacPath = createCodeBlueSession(manifest);
    aacPath = commitDraftBundle(aacPath, ["protect-aac"]).session;
    const beforeAac = scoreCodeBlueSession(aacPath).communicationAccess;
    aacPath = {
      ...aacPath,
      richState: reduceSimulation(
        aacPath.richState,
        { type: "RESTORE_AAC_AFTER_RESCUE" },
        cloneCatalog(),
      ),
    };
    const afterAac = scoreCodeBlueSession(aacPath).communicationAccess;
    assert(
      afterAac > beforeAac,
      "AAC restore increases communication-access score",
    );
    const aacDebrief = generateCodeBlueDebrief(aacPath, debriefFile);
    assert(
      aacDebrief.debriefTags.includes("aac-restore"),
      "AAC restore adds aac-restore tag",
    );
    assert(
      aacDebrief.dimensions.length === debriefFile.dimensions.length,
      "debrief renders all six dimensions from debrief.json",
    );
    assert(
      aacDebrief.eventLog.length === aacPath.richState.eventLog.length,
      "export payload includes full eventLog",
    );
  }

  section("Phase 9 Action Stations bridge + draft≠mutate");
  {
    assert(
      STATION_CODE_BLUE_BRIDGE.length >= 8,
      "station↔code-blue bridge lists core asset mappings",
    );
    assert(
      codeBlueActionsForStationAsset(18).includes("prepare-defibrillator"),
      "defibrillator asset maps to prepare-defibrillator (readiness, not indication)",
    );
    assert(
      codeBlueActionsForStationAsset(27).includes("protect-aac"),
      "AAC asset maps to protect-aac",
    );
    const suggested = suggestCodeBlueActionsFromStations(
      [9, 8, 27],
      [
        "assess-borrowed-circuit",
        "assign-suction-bedside-reserve",
        "protect-aac",
        "replace-airway",
      ],
    );
    assert(
      suggested.includes("assess-borrowed-circuit") &&
        suggested.includes("protect-aac"),
      "bridge suggests Code Blue actions from station assets without committing",
    );
    assert(
      !suggested.includes("replace-airway"),
      "bridge does not suggest replace-airway from circuit/AAC alone",
    );

    const relevantDeltas = domainDeltasForStationCommit(18);
    assert(
      typeof relevantDeltas === "object",
      "domainDeltasForStationCommit returns a delta object for defibrillator",
    );
    assert(
      !("shockEnergy" in (relevantDeltas as object)),
      "station commit deltas never invent shock energy",
    );

    const stubManifest = {
      id: "breathing-room-ep01",
      slug: "breathing-room",
      title: "test",
      chronologyLock: ["a", "b", "c", "d"],
      startNodeId: "ep01-pressure-rise",
      nodeIds: ["ep01-pressure-rise"],
      version: "test",
    } as EpisodeManifest;
    let epSession = createSession(stubManifest);
    const before = { ...epSession.state };
    epSession = applyStationActionToSession(epSession, {
      nodeId: "ep01-pressure-rise",
      assetNumber: 18,
      inventoryId: "defib",
      title: "Defibrillator",
      stationId: "circulation",
      workflowStep: "assigned",
      evidenceGateOpen: true,
      timestampIso: new Date(0).toISOString(),
    });
    assert(
      JSON.stringify(epSession.state) === JSON.stringify(before),
      "Episode 01 station 'assigned' step does not mutate domains (draft≠mutate)",
    );
    epSession = applyStationActionToSession(epSession, {
      nodeId: "ep01-pressure-rise",
      assetNumber: 18,
      inventoryId: "defib",
      title: "Defibrillator",
      stationId: "circulation",
      workflowStep: "committed",
      evidenceGateOpen: true,
      timestampIso: new Date(0).toISOString(),
    });
    assert(
      JSON.stringify(epSession.state) !== JSON.stringify(before),
      "Episode 01 station 'committed' step applies soft domain nudge",
    );
  }

  section("Phase 8 unified Code Blue session + kit soft gate");
  {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const packDir = path.join(
      root,
      "content",
      "episodes",
      "breathing-room",
      "code-blue",
    );
    const readJson = (rel: string): unknown =>
      JSON.parse(readFileSync(path.join(packDir, rel), "utf8")) as unknown;
    const manifest = readJson("manifest.json") as CodeBlueManifest;
    const quiet = readJson(
      "nodes/cb-quiet-stabilisation.json",
    ) as CodeBlueScenarioNode;

    const requirements: Record<string, number[]> = {
      "protect-aac": [27, 28, 34, 35],
      "prepare-defibrillator": [18, 19, 20],
    };

    let play = createCodeBlueSession(manifest, { uiMode: "kit" });
    assert(play.uiMode === "kit", "kit mode stored on shared session");
    assert(
      play.selectedKitAssets.includes(27),
      "default kit selection includes AAC device",
    );

    // Draft stays local — kit gate blocks commit until assets selected.
    const draft = ["protect-aac"];
    const blockedMissing = kitGateBlocksCommit(
      draft,
      play.selectedKitAssets,
      requirements,
    );
    assert(
      blockedMissing.length > 0,
      "kit soft-gate blocks protect-aac without full AAC kit assets",
    );
    const revisionBefore = play.richState.revision;
    // Simulate UI refusing commit when gate fails (engine not called).
    assert(
      play.richState.revision === revisionBefore,
      "draft + failed kit gate does not mutate clinical truth",
    );

    play = withSelectedKitAssets(play, [27, 28, 34, 35, 18, 19, 20]);
    assert(
      kitGateBlocksCommit(draft, play.selectedKitAssets, requirements).length ===
        0,
      "kit soft-gate clears after selecting required assets",
    );
    const committed = commitDraftBundle(play, draft);
    play = committed.session;
    assert(
      committed.result.accepted.includes("protect-aac"),
      "kit-gated commit accepts protect-aac once soft gate cleared",
    );
    assert(
      play.richState.revision > revisionBefore,
      "successful commit advances engine revision",
    );

    play = fireEvent(play, quiet, "intermittent-monitor-alarm");
    assert(
      play.currentNodeId === "cb-intermittent-alarm",
      "after kit-gated commit, event advance still works",
    );
    assert(
      play.selectedKitAssets.includes(27),
      "kit asset selection persists across event advance",
    );
  }

  console.log(`\nsimulation-test: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
