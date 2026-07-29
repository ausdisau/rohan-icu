import canonRuntime from "../../content/canon/canon-runtime.json";

import type { CommunicationMethod } from "@/types/node";
import type {
  CanonContext,
  CanonPhrase,
  CanonPrinciple,
  ConsentPrinciple,
  EvaluateCanonInput,
} from "@/types/prognosis";

interface CanonRuntimeFile {
  chronologyLock: string[];
  phrases: CanonPhrase[];
  consentPrinciples: ConsentPrinciple[];
  activePrinciples: Array<{
    id: string;
    text: string;
    alwaysOnEpisode01?: boolean;
    when?: string[];
  }>;
}

const runtime = canonRuntime as CanonRuntimeFile;

const AAC_METHODS: ReadonlySet<CommunicationMethod> = new Set([
  "cheek-switch",
  "auditory-scanning",
  "aac-board",
  "partner-assisted",
  "voice-output",
  "mixed",
]);

export function getLockedChronology(): string[] {
  return [...runtime.chronologyLock];
}

export function getCanonPhrases(): CanonPhrase[] {
  return runtime.phrases.map((p) => ({ id: p.id, text: p.text }));
}

export function getConsentPrinciples(): ConsentPrinciple[] {
  return runtime.consentPrinciples.map((p) => ({ id: p.id, rule: p.rule }));
}

function nodeHaystack(input: EvaluateCanonInput): string {
  return [
    input.nodeId,
    input.phaseId,
    input.title,
    input.openingNarrative,
    input.clinicalState,
    ...(input.disabilityRightsNotes ?? []),
  ]
    .join("\n")
    .toLowerCase();
}

function whenTagsFor(input: EvaluateCanonInput): Set<string> {
  const tags = new Set<string>();
  if (AAC_METHODS.has(input.communicationMethod)) {
    tags.add("any-aac-method");
  }
  if (input.communicationMethod === "deep-sedation") {
    tags.add("deep-sedation");
  }
  const hay = nodeHaystack(input);
  if (
    input.nodeId.includes("home-school") ||
    input.phaseId.includes("home-school") ||
    /\bhome\b|\bschool\b/.test(hay)
  ) {
    tags.add("home-school");
  }
  if (input.nodeId.includes("kit") || /\bemergency bag\b|\bkit\b/.test(hay)) {
    tags.add("kit");
  }
  if (
    /\bprivacy\b|\bauthorship\b|\bconsent\b|\bvideo\b|\btelemetry\b/.test(hay) ||
    input.nodeId.includes("consent")
  ) {
    tags.add("privacy");
    tags.add("authorship");
  }
  return tags;
}

/**
 * Build learner-facing canon context for the current node.
 * Positive principles only — full banned-pattern lint stays at build time.
 */
export function evaluateCanonContext(input: EvaluateCanonInput): CanonContext {
  const tags = whenTagsFor(input);
  const activePrinciples: CanonPrinciple[] = [];

  for (const principle of runtime.activePrinciples) {
    if (principle.alwaysOnEpisode01) {
      activePrinciples.push({ id: principle.id, text: principle.text });
      continue;
    }
    const when = principle.when ?? [];
    if (when.some((tag) => tags.has(tag))) {
      activePrinciples.push({ id: principle.id, text: principle.text });
    }
  }

  // Cap at 4 principles for cognitive load; prefer always-on first.
  const capped = activePrinciples.slice(0, 4);

  const consentReminders: ConsentPrinciple[] = [];
  if (tags.has("privacy") || tags.has("authorship") || tags.has("home-school")) {
    for (const id of [
      "identity-requires-consent",
      "family-fear-not-surveillance-licence",
      "shortened-cuts",
    ]) {
      const found = runtime.consentPrinciples.find((p) => p.id === id);
      if (found) consentReminders.push({ id: found.id, rule: found.rule });
    }
  }

  return {
    chronologyLock: getLockedChronology(),
    activePrinciples: capped,
    consentReminders: consentReminders.slice(0, 3),
    phrases: getCanonPhrases(),
  };
}

/** Debrief checklist: canon reminders that held for the played pathway. */
export function buildCanonHeldChecklist(
  nodeIds: string[],
): { id: string; text: string; held: boolean }[] {
  const joined = nodeIds.join(" ").toLowerCase();
  return [
    {
      id: "chronology",
      text: "Locked chronology preserved (library help → ambulance CPR → bay ROSC → ICU).",
      held: true,
    },
    {
      id: "access-not-incapacity",
      text: "Communication barriers were not treated as incapacity.",
      held: true,
    },
    {
      id: "address-rohan",
      text: "Rohan remained the decision partner — not spoken over by default.",
      held: true,
    },
    {
      id: "beyond-rosc",
      text: "Pathway continued beyond return of circulation.",
      held:
        joined.includes("home-school") ||
        joined.includes("kit") ||
        joined.includes("debrief"),
    },
    {
      id: "rights-continuity",
      text: "Home, school, privacy, or kit readiness stayed in view mid-ICU.",
      held:
        joined.includes("home-school") ||
        joined.includes("kit") ||
        joined.includes("consent"),
    },
  ];
}
