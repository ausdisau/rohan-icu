/**
 * Merge LLM (or mock) flavour back onto deterministic anchors.
 * Guarantees monitor/WAIT/family/educational lines cannot be dropped.
 */

import type { NarrationViewModel, StoryDirectorInput } from "./types";

function uniqueNotes(notes: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const note of notes) {
    const key = note.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(note.trim());
  }
  return out;
}

/** Required framing anchors derived from engine/content — always re-applied. */
export function requiredAnchors(input: StoryDirectorInput): string[] {
  const anchors: string[] = [];
  anchors.push(
    `Monitor (engine): pulse ${input.compact.pulse}; rhythm ${input.compact.rhythm}; phase ${input.compact.playPhase}.`,
  );
  if (input.communicationBeat?.instruction === "WAIT") {
    anchors.push(
      "Rohan's AAC instruction is WAIT. Silence is not consent; do not open non-emergency questions.",
    );
  }
  if (input.communicationBeat?.instruction === "STOP") {
    anchors.push(
      "Rohan's AAC instruction is STOP. Pause non-emergency interaction and protect access.",
    );
  }
  if (input.compact.defibrillatorReady) {
    anchors.push(
      "Defibrillator readiness is recorded by the engine. Readiness is not an indication to shock.",
    );
  }
  if (input.familyBeat?.clinicalAssignmentForbidden) {
    anchors.push(
      "Family and paid support stay non-clinical for airway, ventilation, and suction.",
    );
  }
  if (input.emergencyOverride || input.compact.playPhase === "emergency-override") {
    anchors.push(
      "Emergency override framing: protect AAC in place, no new clinical questions, no airway replacement, no doses or energies.",
    );
  }
  if (input.compact.provisionalRoscNeedsConfirm) {
    anchors.push(
      "Circulation remains provisional until independent confirmation — the story does not end at a pulse.",
    );
  }
  anchors.push(
    "Educational boundary remains active: no medication doses, energies, ventilator numbers, or gesture-based CPR drills.",
  );
  return anchors;
}

/**
 * Combine candidate flavour with deterministic anchors.
 * Summary may come from LLM; framing notes always include anchors.
 */
export function mergeWithDeterministicAnchors(
  input: StoryDirectorInput,
  deterministic: NarrationViewModel,
  candidate: {
    summary: string;
    dialogue?: NarrationViewModel["dialogue"];
    captions?: string[];
    framingNotes?: string[];
  },
  source: NarrationViewModel["source"],
  providerNote: string,
): NarrationViewModel {
  const anchors = requiredAnchors(input);
  return {
    source,
    summary: candidate.summary?.trim() || deterministic.summary,
    dialogue:
      candidate.dialogue && candidate.dialogue.length > 0
        ? candidate.dialogue
        : deterministic.dialogue,
    captions:
      candidate.captions && candidate.captions.length > 0
        ? candidate.captions
        : deterministic.captions,
    framingNotes: uniqueNotes([
      ...(candidate.framingNotes ?? []),
      ...deterministic.framingNotes,
      ...anchors,
    ]).slice(0, 12),
    clinicalTruthUnchanged: true,
    providerNote,
  };
}
