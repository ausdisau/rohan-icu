/**
 * Prognosis engine — multi-domain outlook from SimulationState.
 *
 * Non-goals (enforced by design, not scored away):
 * - No single survival percentage or overall health score
 * - No miraculous recovery language
 * - No walking / extubation / trach-removal victory framing
 */
import { DOMAIN_LABELS, HIGHER_IS_WORSE } from "@/engine/state";
import type {
  DomainOutlook,
  OutlookBand,
  PrognosisGroup,
  PrognosisGroupId,
  PrognosisReport,
} from "@/types/prognosis";
import type {
  SimulationState,
  SimulationStateDelta,
  SimulationStateKey,
} from "@/types/simulation";

const PROGNOSIS_DISCLAIMER =
  "Outlook is multi-domain and provisional. It is not a survival score, and it does not treat walking, extubation, or equipment removal as victory.";

interface GroupDef {
  id: PrognosisGroupId;
  title: string;
  keys: SimulationStateKey[];
}

const GROUPS: GroupDef[] = [
  {
    id: "respiratory-airway",
    title: "Respiratory / airway",
    keys: [
      "respiratoryStability",
      "rightLungAeration",
      "airwayObstructionRisk",
    ],
  },
  {
    id: "cardiac",
    title: "Cardiac",
    keys: ["cardiacReserve", "arrhythmiaBurden"],
  },
  {
    id: "infection-renal",
    title: "Infection–renal trade-off",
    keys: ["infectionControl", "antibioticResistance", "renalReserve"],
  },
  {
    id: "communication-sedation",
    title: "Communication & sedation",
    keys: [
      "communicationAccess",
      "sedationDepth",
      "deliriumBurden",
      "painControl",
      "restraintExposure",
    ],
  },
  {
    id: "rights-continuity",
    title: "Rights continuity",
    keys: [
      "privacyProtection",
      "homeReadiness",
      "schoolAccess",
      "authorshipControl",
      "publicTrust",
      "familyBurden",
    ],
  },
];

/** Higher-is-better domain: map value + optional delta → band. */
function bandForHigherIsBetter(
  value: number,
  delta: number | undefined,
): OutlookBand {
  if (typeof delta === "number") {
    if (delta <= -8) return "worsening";
    if (delta >= 8) return "improving";
  }
  if (value < 35) return "fragile";
  if (value < 50) return "worsening";
  if (value >= 70) return "stable";
  return "stable";
}

/** Higher-is-worse domain (risk/burden). */
function bandForHigherIsWorse(
  value: number,
  delta: number | undefined,
): OutlookBand {
  if (typeof delta === "number") {
    if (delta >= 8) return "worsening";
    if (delta <= -8) return "improving";
  }
  if (value >= 70) return "fragile";
  if (value >= 55) return "worsening";
  if (value <= 30) return "stable";
  return "stable";
}

export function outlookBandForDomain(
  key: SimulationStateKey,
  value: number,
  delta?: number,
): OutlookBand {
  if (HIGHER_IS_WORSE.has(key)) {
    return bandForHigherIsWorse(value, delta);
  }
  return bandForHigherIsBetter(value, delta);
}

const BAND_RANK: Record<OutlookBand, number> = {
  improving: 0,
  stable: 1,
  fragile: 2,
  worsening: 3,
};

function worstBand(bands: OutlookBand[]): OutlookBand {
  return bands.reduce((worst, band) =>
    BAND_RANK[band] > BAND_RANK[worst] ? band : worst,
  );
}

function domainOutlook(
  key: SimulationStateKey,
  state: SimulationState,
  net?: SimulationStateDelta,
): DomainOutlook {
  const value = state[key];
  const delta = net?.[key];
  return {
    key,
    value,
    delta,
    band: outlookBandForDomain(key, value, delta),
  };
}

function groupSummary(group: GroupDef, domains: DomainOutlook[]): string {
  const fragile = domains.filter(
    (d) => d.band === "fragile" || d.band === "worsening",
  );
  const improving = domains.filter((d) => d.band === "improving");

  switch (group.id) {
    case "respiratory-airway": {
      const risk = domains.find((d) => d.key === "airwayObstructionRisk");
      const stab = domains.find((d) => d.key === "respiratoryStability");
      if (risk && (risk.band === "fragile" || risk.band === "worsening")) {
        return "Airway obstruction risk remains elevated; right-lung aeration needs watching.";
      }
      if (stab && stab.band === "improving") {
        return "Respiratory stability is trending up without treating equipment removal as the goal.";
      }
      return "Respiratory support continues; outlook is provisional across aeration and obstruction risk.";
    }
    case "cardiac": {
      const reserve = domains.find((d) => d.key === "cardiacReserve");
      const arr = domains.find((d) => d.key === "arrhythmiaBurden");
      if (
        (reserve && reserve.band === "fragile") ||
        (arr && (arr.band === "fragile" || arr.band === "worsening"))
      ) {
        return "Cardiac reserve is limited; arrhythmia burden can rise with respiratory stress.";
      }
      return "Cardiac outlook is guarded — reserve and ectopy tracked separately from survival language.";
    }
    case "infection-renal": {
      const infection = domains.find((d) => d.key === "infectionControl");
      const renal = domains.find((d) => d.key === "renalReserve");
      if (
        infection &&
        renal &&
        (infection.band === "improving" || infection.value >= 55) &&
        (renal.band === "fragile" || renal.band === "worsening")
      ) {
        return "Infection control may hold while renal reserve stays fragile — a legitimate trade-off.";
      }
      if (renal && (renal.band === "fragile" || renal.band === "worsening")) {
        return "Renal reserve is under pressure; infection strategy remains a live uncertainty.";
      }
      return "Infection and renal domains move independently; neither collapses into one score.";
    }
    case "communication-sedation": {
      const access = domains.find((d) => d.key === "communicationAccess");
      const sed = domains.find((d) => d.key === "sedationDepth");
      if (access && access.band === "improving") {
        return "Communication access is recovering; slow answers remain valid answers.";
      }
      if (sed && sed.value >= 65) {
        return "Sedation still deep — silence now is access timing, not incapacity.";
      }
      if (access && access.value < 40) {
        return "Communication access is limited; restore channels before inferring capacity.";
      }
      return "Communication and sedation outlooks stay separate from capacity judgements.";
    }
    case "rights-continuity": {
      if (fragile.length > 0 && improving.length === 0) {
        return "Rights domains need attention — privacy, home, school, or authorship may be under pressure.";
      }
      if (improving.length > 0) {
        return "Rights continuity is strengthening in places; instability still must not erase membership or consent.";
      }
      return "Home, school, privacy, and authorship remain active planning domains mid-ICU.";
    }
    default: {
      const _exhaustive: never = group.id;
      return _exhaustive;
    }
  }
}

export function buildPrognosisReport(
  state: SimulationState,
  net?: SimulationStateDelta,
): PrognosisReport {
  const groups: PrognosisGroup[] = GROUPS.map((group) => {
    const domains = group.keys.map((key) => domainOutlook(key, state, net));
    const band = worstBand(domains.map((d) => d.band));
    return {
      id: group.id,
      title: group.title,
      band,
      summary: groupSummary(group, domains),
      domains,
    };
  });

  return {
    groups,
    summaryLines: buildPrognosisSummary(state, net, groups),
    disclaimer: PROGNOSIS_DISCLAIMER,
  };
}

export function buildPrognosisSummary(
  state: SimulationState,
  net?: SimulationStateDelta,
  prebuiltGroups?: PrognosisGroup[],
): string[] {
  const groups = prebuiltGroups ?? buildPrognosisReport(state, net).groups;
  const lines: string[] = [];

  const infectionRenal = groups.find((g) => g.id === "infection-renal");
  if (infectionRenal) lines.push(infectionRenal.summary);

  const comm = groups.find((g) => g.id === "communication-sedation");
  if (comm) lines.push(comm.summary);

  const rights = groups.find((g) => g.id === "rights-continuity");
  const cardiac = groups.find((g) => g.id === "cardiac");
  const resp = groups.find((g) => g.id === "respiratory-airway");

  const priority = [resp, cardiac, rights].filter(
    (g): g is PrognosisGroup =>
      g !== undefined &&
      (g.band === "fragile" || g.band === "worsening"),
  );
  for (const g of priority.slice(0, 2)) {
    if (!lines.includes(g.summary)) lines.push(g.summary);
  }

  // Always keep to a few lines — never a composite score.
  const capped = lines.slice(0, 3);

  // Guard: reject survival-score phrasing if ever introduced upstream.
  return capped.filter(
    (line) =>
      !/\b(survival|mortality)\s*%|\b%\s*chance\b|\bwill\s+(walk|extubat)/i.test(
        line,
      ),
  );
}

export function outlookBandLabel(band: OutlookBand): string {
  switch (band) {
    case "improving":
      return "Improving";
    case "stable":
      return "Stable";
    case "fragile":
      return "Fragile";
    case "worsening":
      return "Worsening";
    default: {
      const _exhaustive: never = band;
      return _exhaustive;
    }
  }
}

export function domainLabel(key: SimulationStateKey): string {
  return DOMAIN_LABELS[key];
}
