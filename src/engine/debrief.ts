import type {
  DebriefCategory,
  DebriefCategoryId,
  DebriefHighlights,
  DebriefPayload,
} from "@/types/debrief";
import type { SimulationStateKey } from "@/types/simulation";

import { summarizeStationHistory } from "./action-stations";
import type { AppliedChoiceRecord, SimulationSession } from "./session";
import { toChoiceHistory } from "./session";
import {
  DOMAIN_LABELS,
  HIGHER_IS_WORSE,
  computeNetDeltas,
  formatDelta,
} from "./state";

export type { DebriefHighlights };

/** Prompt 13 payload with required notice / miss / highlight fields. */
export type EnrichedDebriefPayload = DebriefPayload & {
  highlights: DebriefHighlights;
  whatNoticed: string[];
  whatMissed: string[];
};

const CATEGORY_META: Record<
  Exclude<DebriefCategoryId, "next-episode">,
  { title: string; domainKeys: SimulationStateKey[] }
> = {
  "clinical-tradeoffs": {
    title: "Clinical trade-offs",
    domainKeys: [
      "infectionControl",
      "antibioticResistance",
      "renalReserve",
      "respiratoryStability",
      "rightLungAeration",
      "airwayObstructionRisk",
      "cardiacReserve",
      "arrhythmiaBurden",
      "painControl",
    ],
  },
  "communication-access": {
    title: "Communication access",
    domainKeys: ["communicationAccess"],
  },
  "disability-rights": {
    title: "Disability rights",
    domainKeys: ["restraintExposure", "authorshipControl", "publicTrust"],
  },
  "family-and-labour": {
    title: "Family and labour",
    domainKeys: ["familyBurden"],
  },
  "home-and-school": {
    title: "Home and school continuity",
    domainKeys: ["homeReadiness", "schoolAccess", "privacyProtection"],
  },
  "authorship-and-trust": {
    title: "Authorship and trust",
    domainKeys: ["authorshipControl", "publicTrust", "privacyProtection"],
  },
};

function deltaFor(
  deltas: Partial<Record<SimulationStateKey, number>>,
  key: SimulationStateKey,
): number {
  return deltas[key] ?? 0;
}

function pickStrongClinical(history: AppliedChoiceRecord[]): AppliedChoiceRecord | null {
  if (history.length === 0) return null;
  let best: AppliedChoiceRecord | null = null;
  let bestScore = -Infinity;
  for (const entry of history) {
    const d = entry.domainDeltas;
    const score =
      deltaFor(d, "infectionControl") +
      deltaFor(d, "respiratoryStability") +
      deltaFor(d, "cardiacReserve") +
      deltaFor(d, "renalReserve") -
      Math.max(0, deltaFor(d, "airwayObstructionRisk")) -
      Math.max(0, deltaFor(d, "arrhythmiaBurden"));
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return best;
}

function pickRightsPreserving(
  history: AppliedChoiceRecord[],
): AppliedChoiceRecord | null {
  if (history.length === 0) return null;
  let best: AppliedChoiceRecord | null = null;
  let bestScore = -Infinity;
  for (const entry of history) {
    const d = entry.domainDeltas;
    const score =
      deltaFor(d, "communicationAccess") +
      deltaFor(d, "authorshipControl") +
      deltaFor(d, "privacyProtection") +
      deltaFor(d, "schoolAccess") +
      deltaFor(d, "homeReadiness") -
      Math.max(0, deltaFor(d, "restraintExposure")) +
      (deltaFor(d, "familyBurden") < 0 ? 4 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return best;
}

function pickDelayedHarm(
  history: AppliedChoiceRecord[],
): AppliedChoiceRecord | null {
  if (history.length === 0) return null;
  let worst: AppliedChoiceRecord | null = null;
  let worstScore = -Infinity;
  for (const entry of history) {
    const d = entry.domainDeltas;
    const score =
      Math.max(0, -deltaFor(d, "renalReserve")) +
      Math.max(0, -deltaFor(d, "infectionControl")) +
      Math.max(0, deltaFor(d, "deliriumBurden")) +
      Math.max(0, deltaFor(d, "restraintExposure")) +
      Math.max(0, deltaFor(d, "familyBurden")) +
      Math.max(0, -deltaFor(d, "communicationAccess"));
    if (score > worstScore) {
      worstScore = score;
      worst = entry;
    }
  }
  return worst;
}

function summariseDomains(
  net: Partial<Record<SimulationStateKey, number>>,
  keys: SimulationStateKey[],
): string {
  const parts: string[] = [];
  for (const key of keys) {
    const value = net[key];
    if (typeof value !== "number" || value === 0) continue;
    const worse = HIGHER_IS_WORSE.has(key);
    const direction =
      value > 0
        ? worse
          ? "increased load"
          : "improved"
        : worse
          ? "eased"
          : "declined";
    parts.push(
      `${DOMAIN_LABELS[key]} ${formatDelta(value)} (${direction})`,
    );
  }
  if (parts.length === 0) {
    return "No measurable movement in these domains on this pathway.";
  }
  return parts.join("; ") + ".";
}

function relatedChoicesFor(
  history: AppliedChoiceRecord[],
  keys: SimulationStateKey[],
): string[] {
  return history
    .filter((entry) =>
      keys.some((key) => typeof entry.domainDeltas[key] === "number"),
    )
    .map((entry) => entry.label);
}

function buildCategory(
  id: Exclude<DebriefCategoryId, "next-episode">,
  history: AppliedChoiceRecord[],
  net: ReturnType<typeof computeNetDeltas>,
  extraSummary: string,
): DebriefCategory {
  const meta = CATEGORY_META[id];
  const related = relatedChoicesFor(history, meta.domainKeys);
  const domainHighlights: Partial<Record<SimulationStateKey, number>> = {};
  for (const key of meta.domainKeys) {
    if (typeof net[key] === "number") {
      domainHighlights[key] = net[key];
    }
  }
  return {
    id,
    title: meta.title,
    summary: `${extraSummary} ${summariseDomains(net, meta.domainKeys)}`.trim(),
    relatedChoices: related.length > 0 ? related : history.map((h) => h.label),
    domainHighlights,
  };
}

function collectNotes(history: AppliedChoiceRecord[]): {
  debrief: string[];
  rights: string[];
} {
  const debrief: string[] = [];
  const rights: string[] = [];
  for (const entry of history) {
    for (const note of entry.debriefNotes) {
      if (!debrief.includes(note)) debrief.push(note);
    }
    for (const note of entry.disabilityRightsNotes) {
      if (!rights.includes(note)) rights.push(note);
    }
  }
  return { debrief, rights };
}

type KitPriority = "airway-redundancy" | "communication-kit" | "privacy-governance";

function isKitReadinessEntry(entry: AppliedChoiceRecord): boolean {
  const nodeId = entry.nodeId.toLowerCase();
  const choiceId = entry.choiceId.toLowerCase();
  return (
    nodeId.includes("kit-readiness") ||
    choiceId.includes("kit-readiness") ||
    choiceId.includes("kit-airway") ||
    choiceId.includes("kit-communication") ||
    choiceId.includes("kit-governance") ||
    choiceId.includes("kit-privacy")
  );
}

function classifyKitPriority(entry: AppliedChoiceRecord): KitPriority {
  const id = `${entry.choiceId} ${entry.label}`.toLowerCase();
  if (
    /airway|power|suction|trach|redundan/.test(id)
  ) {
    return "airway-redundancy";
  }
  if (/communicat|aac|cheek|vocab|board/.test(id)) {
    return "communication-kit";
  }
  if (/govern|privacy|handover|docs?|plan|dignity/.test(id)) {
    return "privacy-governance";
  }

  const d = entry.domainDeltas;
  const scores: Record<KitPriority, number> = {
    "airway-redundancy":
      (deltaFor(d, "airwayObstructionRisk") < 0 ? 3 : 0) +
      (deltaFor(d, "homeReadiness") > 0 ? 1 : 0) +
      (deltaFor(d, "respiratoryStability") > 0 ? 1 : 0),
    "communication-kit":
      (deltaFor(d, "communicationAccess") > 0 ? 3 : 0) +
      (deltaFor(d, "authorshipControl") > 0 ? 2 : 0) +
      (deltaFor(d, "schoolAccess") > 0 ? 1 : 0),
    "privacy-governance":
      (deltaFor(d, "privacyProtection") > 0 ? 3 : 0) +
      (deltaFor(d, "publicTrust") > 0 ? 2 : 0) +
      (deltaFor(d, "homeReadiness") > 0 ? 1 : 0),
  };

  let best: KitPriority = "airway-redundancy";
  let bestScore = -Infinity;
  for (const key of Object.keys(scores) as KitPriority[]) {
    if (scores[key] > bestScore) {
      bestScore = scores[key];
      best = key;
    }
  }
  return best;
}

function kitHomeSchoolSummary(kitEntries: AppliedChoiceRecord[]): string {
  if (kitEntries.length === 0) {
    return "Home readiness and school membership remain active concerns during ICU care.";
  }
  const priorities = new Set(kitEntries.map(classifyKitPriority));
  const parts: string[] = [
    "Kit-readiness choices shaped community transfer priorities for Rohan’s personal emergency bag.",
  ];
  if (priorities.has("airway-redundancy")) {
    parts.push(
      "Airway and power redundancy (spares, suction, circuits, batteries) were weighted for paid-responder readiness.",
    );
  }
  if (priorities.has("communication-kit")) {
    parts.push(
      "Communication-access kit items (offline AAC, cheek switch, boards, vocabulary) were weighted for authorship at school and home.",
    );
  }
  if (priorities.has("privacy-governance")) {
    parts.push(
      "Governance docs (airway plan, contacts, handover, privacy/dignity, revision date) were weighted for Evidence Trust continuity.",
    );
  }
  return parts.join(" ");
}

function kitNoticedLines(kitEntries: AppliedChoiceRecord[]): string[] {
  const lines: string[] = [];
  const seen = new Set<KitPriority>();
  for (const entry of kitEntries) {
    const priority = classifyKitPriority(entry);
    if (seen.has(priority)) continue;
    seen.add(priority);
    switch (priority) {
      case "airway-redundancy":
        lines.push(
          `Kit readiness noticed airway redundancy — “${entry.label}” reduced transfer risk around trach spares, suction, and power.`,
        );
        break;
      case "communication-kit":
        lines.push(
          `Kit readiness noticed communication access — “${entry.label}” kept AAC tools in the community bag for when eyes open.`,
        );
        break;
      case "privacy-governance":
        lines.push(
          `Kit readiness noticed privacy governance — “${entry.label}” centred plans, contacts, and dignity docs for home/school handover.`,
        );
        break;
      default: {
        const _exhaustive: never = priority;
        void _exhaustive;
        break;
      }
    }
  }
  return lines;
}

function kitMissedLines(
  history: AppliedChoiceRecord[],
  kitEntries: AppliedChoiceRecord[],
): string[] {
  const lines: string[] = [];
  if (kitEntries.length === 0) {
    const pathMentionsHome =
      history.some(
        (h) =>
          deltaFor(h.domainDeltas, "homeReadiness") !== 0 ||
          deltaFor(h.domainDeltas, "schoolAccess") !== 0 ||
          deltaFor(h.domainDeltas, "privacyProtection") !== 0,
      ) || history.some((h) => /home|school/i.test(h.nodeId));
    if (pathMentionsHome) {
      lines.push(
        "Emergency bag / kit readiness was not rehearsed — airway redundancy, communication kit, and privacy governance remain community-transfer gaps.",
      );
    }
    return lines;
  }

  const priorities = new Set(kitEntries.map(classifyKitPriority));
  if (!priorities.has("airway-redundancy")) {
    lines.push(
      "Kit readiness underweighted airway redundancy (trach spares, suction, circuits, batteries) relative to other bag priorities.",
    );
  }
  if (!priorities.has("communication-kit")) {
    lines.push(
      "Kit readiness underweighted the communication-access kit (offline AAC, cheek switch, boards) for authorship after ICU.",
    );
  }
  if (!priorities.has("privacy-governance")) {
    lines.push(
      "Kit readiness underweighted privacy / governance docs (airway plan, handover, dignity, revision date) for school transfer.",
    );
  }
  return lines;
}

export function generateDebrief(
  session: SimulationSession,
): EnrichedDebriefPayload {
  const net = computeNetDeltas(session.initialState, session.state);
  const history = session.history;
  const notes = collectNotes(history);
  const kitEntries = history.filter(isKitReadinessEntry);

  const strong = pickStrongClinical(history);
  const rights = pickRightsPreserving(history);
  const harm = pickDelayedHarm(history);

  const highlights: DebriefHighlights = {
    clinicallyStrong: strong
      ? `“${strong.label}” — ${strong.immediateConsequence}`
      : "No pathway choices recorded yet.",
    rightsPreserving: rights
      ? `“${rights.label}” — ${rights.delayedConsequence}`
      : "No pathway choices recorded yet.",
    delayedHarm: harm
      ? `“${harm.label}” may carry delayed cost: ${harm.delayedConsequence}`
      : "No delayed-harm signal on an empty pathway.",
    legitimateUncertainty:
      "Infection coverage versus renal reserve remains a legitimate uncertainty — there is no single correct physiological answer, and success is not scored by survival or ambulation alone.",
    rohanQuestion:
      "Rohan would ask: “Did you wait for my answer — slow answer, still answer — or did you fill the silence with someone else’s voice?”",
  };

  const stationLines = summarizeStationHistory(session.stationHistory ?? []);

  const whatNoticed = [
    ...notes.debrief.slice(0, 3),
    ...kitNoticedLines(kitEntries),
    ...stationLines.filter((line) => !line.includes("no station assets")),
    ...(deltaFor(net, "communicationAccess") !== 0
      ? [
          `Communication access moved ${formatDelta(deltaFor(net, "communicationAccess"))} across the episode.`,
        ]
      : []),
    ...(deltaFor(net, "infectionControl") !== 0 ||
    deltaFor(net, "renalReserve") !== 0
      ? [
          "Infection and renal domains moved in tension — a trade-off, not a win/lose score.",
        ]
      : []),
  ];

  const whatMissed: string[] = [...kitMissedLines(history, kitEntries)];
  if ((session.stationHistory ?? []).length === 0) {
    whatMissed.push(
      ...stationLines.filter((line) => line.includes("no station assets")),
    );
  }
  if (deltaFor(net, "schoolAccess") === 0 && deltaFor(net, "homeReadiness") === 0) {
    whatMissed.push(
      "Home and school continuity domains did not move — later episodes will keep membership active mid-ICU.",
    );
  }
  if (deltaFor(net, "restraintExposure") === 0) {
    whatMissed.push(
      "Restraint exposure was not explicitly tested on this stub path; sedation lightening and stop-on-signal remain upcoming.",
    );
  }
  if (history.every((h) => !h.rohanAacLine)) {
    whatMissed.push(
      "Rohan’s AAC lines were not surfaced on chosen branches — address him directly next time.",
    );
  }
  if (whatMissed.length === 0) {
    whatMissed.push(
      kitEntries.length > 0
        ? "Trade-offs remain: the emergency bag cannot weight every axis equally on one pass — revisit airway, AAC, and privacy together before discharge."
        : "On this short stub path, the main gap is depth: fuller consent, pressure-rise, and sedation/AAC restore nodes are still arriving.",
    );
  }

  const categories: DebriefCategory[] = [
    buildCategory(
      "clinical-tradeoffs",
      history,
      net,
      "Respiratory, cardiac, infection, and renal reasoning are read as interacting domains — not a survival score.",
    ),
    buildCategory(
      "communication-access",
      history,
      net,
      "Unavailable communication is an access problem. It is never labelled as incapacity.",
    ),
    buildCategory(
      "disability-rights",
      history,
      net,
      notes.rights[0] ??
        "Rights notes travel with each node; restraint, authorship, and dignity stay in scope after ROSC.",
    ),
    buildCategory(
      "family-and-labour",
      history,
      net,
      "Family are not default unpaid clinical responders. Paid staff own response labour.",
    ),
    buildCategory(
      "home-and-school",
      history,
      net,
      kitHomeSchoolSummary(kitEntries),
    ),
    buildCategory(
      "authorship-and-trust",
      history,
      net,
      "Documentation language and public trust follow how Rohan’s voice was centred — or overwritten.",
    ),
    {
      id: "next-episode",
      title: "Next episode",
      summary:
        "The story continues beyond ROSC. Sedation lightens; pressure may rise again; home and school rights stay on the board.",
      relatedChoices: history.map((h) => h.label),
      domainHighlights: {},
    },
  ];

  const nextEpisodeHook =
    "Next episode: sedation lightens enough for cheek-switch and auditory scanning — a consent conversation where Rohan answers first, then a recurrent right-sided pressure rise forces another imperfect airway choice. School membership paperwork still lands on the ward desk.";

  return {
    episodeId: session.episodeId,
    finalState: session.state,
    initialState: session.initialState,
    netDeltas: net,
    choiceHistory: toChoiceHistory(history),
    categories,
    nextEpisodeHook,
    highlights,
    whatNoticed:
      whatNoticed.length > 0
        ? whatNoticed
        : ["You completed the locked chronology arrival and at least one clinical trade-off."],
    whatMissed,
  };
}
