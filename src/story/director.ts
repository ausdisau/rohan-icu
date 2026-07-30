/**
 * Phase 5 — Deterministic story director.
 * Composes authored scene text, director cues, and read-only engine snapshots.
 * Never mutates RichSimulationState and never invents clinical truth.
 */

import type { DirectorCuesFile, DirectorNodeCue } from "@/schemas/director-cues";

import { formatCanonCaption, resolveCanonPhrases } from "./canon";
import { requiredAnchors } from "./merge";
import type {
  NarrationDialogueLine,
  NarrationViewModel,
  StoryDirectorInput,
} from "./types";

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

function buildDirectedSummary(
  input: StoryDirectorInput,
  cue: DirectorNodeCue | undefined,
): string {
  const authored = input.scene.summary.trim();
  if (!cue?.bridge) return authored;
  // Bridge first, then authored detail — flavour only; clinicalTruth panels unchanged.
  if (authored.includes(cue.bridge)) return authored;
  return `${cue.bridge} ${authored}`;
}

function buildDirectedDialogue(
  input: StoryDirectorInput,
  cue: DirectorNodeCue | undefined,
): NarrationDialogueLine[] {
  const dialogue = input.scene.dialogue ? [...input.scene.dialogue] : [];
  if (!cue) return dialogue;

  const phrases = resolveCanonPhrases(cue.canonPhraseIds);
  for (const phrase of phrases) {
    const already = dialogue.some((line) => line.line.includes(phrase.text));
    if (already) continue;
    // Only inject as AAC-visible canon when access lens / restore / quiet nodes.
    if (
      input.scene.lens === "aac-access" ||
      input.nodeId === "cb-aac-restore-family" ||
      input.nodeId === "cb-debrief-hook"
    ) {
      dialogue.push({
        speaker: "Rohan",
        line: phrase.text,
        aac: true,
      });
    }
  }
  return dialogue;
}

function buildDirectedCaptions(
  input: StoryDirectorInput,
  cue: DirectorNodeCue | undefined,
  cuesFile: DirectorCuesFile | null,
): string[] {
  const captions = input.scene.captions ? [...input.scene.captions] : [];
  const phraseIds = [
    ...(cuesFile?.globalCanonPhraseIds ?? []),
    ...(cue?.canonPhraseIds ?? []),
  ];
  for (const phrase of resolveCanonPhrases(phraseIds)) {
    const caption = formatCanonCaption(phrase);
    if (!captions.some((line) => line.includes(phrase.text))) {
      captions.push(caption);
    }
  }
  return captions.slice(0, 8);
}

function buildFramingNotes(
  input: StoryDirectorInput,
  cue: DirectorNodeCue | undefined,
): string[] {
  const notes: string[] = [];
  const lens = lensBeat(input.scene.lens, input.emergencyOverride);
  if (lens) notes.push(lens);
  if (cue?.intent) notes.push(`Director intent: ${cue.intent}`);
  if (cue?.mustRetain?.length) {
    notes.push(`Must retain in any enrichment: ${cue.mustRetain.join(", ")}.`);
  }
  notes.push(...requiredAnchors(input));
  return notes;
}

export interface DirectSceneOptions {
  cues?: DirectorCuesFile | null;
}

/**
 * Pure deterministic director. Authored scene text + cues + engine framing.
 */
export function directScene(
  input: StoryDirectorInput,
  options: DirectSceneOptions = {},
): NarrationViewModel {
  const cuesFile = options.cues ?? null;
  const cue = cuesFile?.nodes[input.nodeId];

  return {
    source: "authored",
    summary: buildDirectedSummary(input, cue),
    dialogue: buildDirectedDialogue(input, cue),
    captions: buildDirectedCaptions(input, cue, cuesFile),
    framingNotes: buildFramingNotes(input, cue),
    clinicalTruthUnchanged: true,
    providerNote:
      "Phase 5 deterministic director (authored scene + cues + engine framing).",
  };
}

export function directSceneDeterministic(
  input: StoryDirectorInput,
  options: DirectSceneOptions = {},
): NarrationViewModel {
  const base = directScene(input, options);
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
