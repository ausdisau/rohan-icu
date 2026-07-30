/**
 * Deterministic simulation engine tests (Phase 2 / PDF export hard rules).
 * Run: npm run simulation-test
 */

import {
  canAskNonEmergencyQuestion,
  cloneCatalog,
  commitActionBundle,
  createInitialRichState,
  emergencyRescueWaitsForAac,
  equipmentReadyCreatesIndication,
  interpretActivation,
  partitionBundle,
  postRoscReassessmentRequired,
  provisionalRoscRequiresIndependentConfirmation,
  reduceSimulation,
  roundTripRichState,
  validateActionAssignment,
  waitBlocksNonEmergencyQuestion,
  withEvidenceSatisfied,
} from "../src/engine/simulation";

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

  console.log(`\nsimulation-test: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
