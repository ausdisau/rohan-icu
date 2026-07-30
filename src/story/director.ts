/**
 * Phase 5 — Deterministic story director.
 * Composes authored scene text with read-only engine snapshots for display.
 * Never mutates RichSimulationState and never invents clinical truth.
 */

import type {
  NarrationViewModel,
  StoryDirectorInput,
} from "./types";

function phaseFraming(input: StoryDirectorInput): string[] {
  const notes: string[] = [];
  const { compact, emergencyOverride, communicationBeat } = input;

  if (emergencyOverride || compact.playPhase === "emergency-override") {
    notes.push(
      "Emergency override framing: protect AAC in place, no new clinical questions, no airway replacement, no doses or energies.",
    );
  }

  if (communicationBeat?.instruction === "WAIT") {
    notes.push(
      "Rohan's AAC instruction is WAIT. Silence is not consent; do not open non-emergency questions.",
    );
  } else if (communicationBeat?.instruction === "STOP") {
    notes.push(
      "Rohan's AAC instruction is STOP. Pause non-emergency interaction and protect access.",
    );
  }

  if (compact.defibrillatorReady) {
    notes.push(
      "Defibrillator readiness is recorded by the engine. Readiness is not an indication to shock.",
    );
  }

  if (compact.provisionalRoscNeedsConfirm) {
    notes.push(
      "Circulation remains provisional until independent confirmation — the story does not end at a pulse.",
    );
  }

  if (compact.postRoscReassessmentDue) {
    notes.push(
      "Post-event reassessment is still due after provisional ROSC.",
    );
  }

  if (input.familyBeat?.clinicalAssignmentForbidden) {
    notes.push(
      "Family and paid support stay non-clinical for airway, ventilation, and suction.",
    );
  }

  notes.push(
    `Monitor (engine): pulse ${compact.pulse}; rhythm ${compact.rhythm}; phase ${compact.playPhase}.`,
  );

  return notes;
}

function lensBeat(lens: string, emergencyOverride: boolean): string | null {
  if (emergencyOverride) {
    return "The bay tightens around circulation work while communication access stays protected in place.";
  }
  switch (lens) {
    case "bedside-clinical":
      return "Bedside framing stays observational — plan without inventing indication.";
    case "cardiac-monitor":
      return "The monitor asks a question; it does not authorise a ritual response.";
    case "airway-equipment":
      return "Equipment readiness supports reserve; it does not rewrite the airway route.";
    case "aac-access":
      return "Access restore is deliberate authorship support, not a capacity test.";
    case "family-corridor":
      return "Family presence is continuity and values — never clinical workforce.";
    case "handover":
      return "Handover language stays precise: provisional means provisional.";
    case "post-event-reflection":
      return "Reflection opens without a single perfect path.";
    case "governance-meeting":
      return "System sustainability — including paid support boundaries — belongs in the debrief frame.";
    default:
      return null;
  }
}

/**
 * Pure deterministic director. Authored scene text is the base; framing notes
 * mirror engine state without replacing clinicalTruth panels.
 */
export function directScene(input: StoryDirectorInput): NarrationViewModel {
  const lens = lensBeat(input.scene.lens, input.emergencyOverride);
  const framingNotes = phaseFraming(input);
  if (lens) framingNotes.unshift(lens);

  return {
    source: "authored",
    summary: input.scene.summary,
    dialogue: input.scene.dialogue ? [...input.scene.dialogue] : [],
    captions: input.scene.captions ? [...input.scene.captions] : [],
    framingNotes,
    clinicalTruthUnchanged: true,
    providerNote: "Phase 5 deterministic director (authored scene + engine framing).",
  };
}

/** Alias used when we want the source tag to read as directed framing. */
export function directSceneDeterministic(
  input: StoryDirectorInput,
): NarrationViewModel {
  const base = directScene(input);
  return {
    ...base,
    source: "deterministic",
    providerNote:
      "Phase 5 deterministic story director — display framing only; clinical truth unchanged.",
  };
}

export function buildDirectorInputFromPlayShell(args: {
  node: {
    id: string;
    phase: string;
    title: string;
    scene: StoryDirectorInput["scene"];
    communicationBeat?: StoryDirectorInput["communicationBeat"];
    familyBeat?: StoryDirectorInput["familyBeat"];
  };
  educationalBoundary: string;
  chronologyLock: string[];
  compact: StoryDirectorInput["compact"];
  emergencyOverride: boolean;
}): StoryDirectorInput {
  return {
    nodeId: args.node.id,
    phase: args.node.phase,
    title: args.node.title,
    scene: args.node.scene,
    communicationBeat: args.node.communicationBeat,
    familyBeat: args.node.familyBeat
      ? {
          clinicalAssignmentForbidden: true,
          note: args.node.familyBeat.note,
        }
      : undefined,
    educationalBoundary: args.educationalBoundary,
    chronologyLock: args.chronologyLock,
    compact: args.compact,
    emergencyOverride: args.emergencyOverride,
  };
}
