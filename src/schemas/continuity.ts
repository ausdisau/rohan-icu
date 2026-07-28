/**
 * Chronology continuity + representation lint rules.
 * Failures are content-validation errors (build / content-lint).
 */

export interface ContinuityFinding {
  ruleId: string;
  severity: "error";
  message: string;
  path?: string;
  excerpt?: string;
}

export interface ContinuityLintInput {
  /** Absolute or relative file path for reporting. */
  path: string;
  /** Concatenated searchable text from the content unit. */
  text: string;
  /** Optional structured flags from parsers. */
  meta?: {
    isEpisodeEnd?: boolean;
    communicationMethod?: string;
    mentionsAac?: boolean;
  };
}

/** Locked emergency chronology — ICU begins only after resus-bay ROSC. */
export const LOCKED_CHRONOLOGY_PHRASES = [
  "library called help",
  "ambulance performed cpr",
  "resuscitation bay restored sustained circulation",
] as const;

const BANNED_PATTERNS: Array<{
  ruleId: string;
  pattern: RegExp;
  message: string;
}> = [
  {
    ruleId: "banned-nonverbal-with-aac",
    pattern: /\bnon[\s-]?verbal\b/i,
    message:
      'Do not label Rohan "nonverbal" while AAC is available; describe access methods or temporary barriers instead.',
  },
  {
    ruleId: "banned-hand-squeeze-capacity",
    pattern: /\bhand[\s-]?squeeze\b.{0,60}\b(capacit|consent|competent|understand)/i,
    message:
      "Hand-squeeze must not be used as a capacity / consent test.",
  },
  {
    ruleId: "banned-hand-squeeze-capacity-reverse",
    pattern: /\b(capacit|consent|competent).{0,60}\bhand[\s-]?squeeze\b/i,
    message:
      "Hand-squeeze must not be used as a capacity / consent test.",
  },
  {
    ruleId: "banned-parents-unpaid-responders",
    pattern:
      /\b(parents?|mum|dad|mother|father|jay)\b.{0,80}\b(unpaid|default)\b.{0,40}\b(responder|staff|carer|caregiver|nurse|interpret)/i,
    message:
      "Parents / Jay must not be cast as default unpaid clinical responders.",
  },
  {
    ruleId: "banned-parents-unpaid-responders-alt",
    pattern:
      /\b(rely on|use|ask)\b.{0,40}\b(parents?|jay|family)\b.{0,40}\b(instead of staff|as staff|to respond|to interpret clinically)/i,
    message:
      "Parents / Jay must not be cast as default unpaid clinical responders.",
  },
  {
    ruleId: "banned-victory-walking",
    pattern: /\b(victory|win|triumph|success|cured|recovered).{0,50}\b(walk|walking)\b/i,
    message: "Victory must not be framed as walking.",
  },
  {
    ruleId: "banned-victory-extubation",
    pattern:
      /\b(victory|win|triumph|success|goal|happy ending).{0,50}\b(extubat|trach(?:eostomy)?\s*remov)/i,
    message: "Victory must not be framed as extubation or trach removal.",
  },
  {
    ruleId: "banned-victory-extubation-reverse",
    pattern:
      /\b(extubat|trach(?:eostomy)?\s*remov).{0,50}\b(victory|win|triumph|success|goal|happy ending)\b/i,
    message: "Victory must not be framed as extubation or trach removal.",
  },
  {
    ruleId: "banned-story-ends-at-rosc",
    pattern:
      /\b(story|episode|simulation)\b.{0,40}\b(ends?|ending|conclude[sd]?)\b.{0,40}\brosc\b/i,
    message:
      "The story must not end at ROSC; ICU care and debrief continue after sustained circulation.",
  },
  {
    ruleId: "banned-unavailable-as-incapacity",
    pattern:
      /\b(cannot communicate|unable to communicate|no way to communicate|incapable of communicat)\b/i,
    message:
      "Unavailable or interrupted communication access must not be labelled as incapacity.",
  },
];

const CHRONOLOGY_DRIFT_PATTERNS: Array<{
  ruleId: string;
  pattern: RegExp;
  message: string;
}> = [
  {
    ruleId: "chronology-library-arrest",
    pattern:
      /\blibrary\b(?![^.!?\n]{0,80}\bcalled help\b).{0,60}\b(cardiac\s+arrest|went into arrest|arrested|cpr|rosc)\b/i,
    message:
      "Chronology drift: cardiac arrest / CPR / ROSC must not be placed at the library. The library called help.",
  },
  {
    ruleId: "chronology-library-rosc-or-cpr",
    pattern:
      /\b(cpr|rosc|cardiac\s+arrest)\b.{0,60}\bat (the )?library\b/i,
    message:
      "Chronology drift: cardiac arrest / CPR / ROSC must not be placed at the library. The library called help.",
  },
  {
    ruleId: "chronology-ambulance-rosc",
    pattern:
      /\bambulance\b(?![^.!?\n]{0,80}\b(performed|did|continued)\s+cpr\b).{0,60}\brosc\b/i,
    message:
      "Chronology drift: ROSC is restored in the resuscitation bay, not in the ambulance. The ambulance performed CPR.",
  },
  {
    ruleId: "chronology-rosc-in-ambulance",
    pattern: /\brosc\b.{0,50}\b(in|on|aboard)\s+(the\s+)?ambulance\b/i,
    message:
      "Chronology drift: ROSC is restored in the resuscitation bay, not in the ambulance.",
  },
  {
    ruleId: "chronology-icu-before-rosc",
    pattern: /\bicu\b.{0,80}\b(before|prior to|awaiting)\b.{0,40}\brosc\b/i,
    message:
      "Chronology drift: ICU play begins only after sustained ROSC in the resuscitation bay.",
  },
];

function collectMatches(
  text: string,
  path: string,
  rules: Array<{ ruleId: string; pattern: RegExp; message: string }>,
): ContinuityFinding[] {
  const findings: ContinuityFinding[] = [];
  for (const rule of rules) {
    const flags = rule.pattern.flags.includes("g")
      ? rule.pattern.flags
      : `${rule.pattern.flags}g`;
    const global = new RegExp(rule.pattern.source, flags);
    let match: RegExpExecArray | null;
    while ((match = global.exec(text)) !== null) {
      findings.push({
        ruleId: rule.ruleId,
        severity: "error",
        message: rule.message,
        path,
        excerpt: match[0].slice(0, 120),
      });
    }
  }
  return findings;
}

/**
 * Lint a single content text blob for banned framing and chronology drift.
 */
export function lintContinuityText(input: ContinuityLintInput): ContinuityFinding[] {
  const findings: ContinuityFinding[] = [];
  const { path, text, meta } = input;

  findings.push(...collectMatches(text, path, BANNED_PATTERNS));
  findings.push(...collectMatches(text, path, CHRONOLOGY_DRIFT_PATTERNS));

  if (meta?.isEpisodeEnd && /\brosc\b/i.test(text) && !/\b(icu|debrief|after)\b/i.test(text)) {
    findings.push({
      ruleId: "banned-episode-end-at-rosc",
      severity: "error",
      message:
        "Episode end nodes must not terminate the story at ROSC; continue into ICU / debrief framing.",
      path,
    });
  }

  const aacPresent =
    meta?.mentionsAac === true ||
    /\baac\b/i.test(text) ||
    meta?.communicationMethod === "aac-board" ||
    meta?.communicationMethod === "voice-output" ||
    meta?.communicationMethod === "auditory-scanning" ||
    meta?.communicationMethod === "cheek-switch";

  if (aacPresent && /\bnon[\s-]?verbal\b/i.test(text)) {
    findings.push({
      ruleId: "banned-nonverbal-with-aac-context",
      severity: "error",
      message:
        'Content mentions AAC / access methods alongside "nonverbal" framing — remove incapacity language.',
      path,
    });
  }

  return findings;
}

/**
 * Validate that an episode manifest encodes the locked chronology.
 */
export function lintChronologyLock(
  chronologyLock: string[],
  path: string,
): ContinuityFinding[] {
  const joined = chronologyLock.join(" ").toLowerCase();
  const findings: ContinuityFinding[] = [];

  const required: Array<{ ruleId: string; needles: string[]; message: string }> = [
    {
      ruleId: "lock-library-help",
      needles: ["library", "help"],
      message: 'Chronology lock must state that the library called help.',
    },
    {
      ruleId: "lock-ambulance-cpr",
      needles: ["ambulance", "cpr"],
      message: "Chronology lock must state that the ambulance performed CPR.",
    },
    {
      ruleId: "lock-bay-rosc",
      needles: ["resuscitation", "circulation"],
      message:
        "Chronology lock must state that the resuscitation bay restored sustained circulation.",
    },
    {
      ruleId: "lock-icu-after-rosc",
      needles: ["icu"],
      message: "Chronology lock must place ICU care after ROSC.",
    },
  ];

  for (const req of required) {
    if (!req.needles.every((n) => joined.includes(n))) {
      findings.push({
        ruleId: req.ruleId,
        severity: "error",
        message: req.message,
        path,
      });
    }
  }

  return findings;
}

export function formatContinuityFindings(findings: ContinuityFinding[]): string {
  if (findings.length === 0) return "No continuity findings.";
  return findings
    .map((f) => {
      const loc = f.path ? `${f.path}: ` : "";
      const excerpt = f.excerpt ? ` — "${f.excerpt}"` : "";
      return `[${f.severity}] ${f.ruleId}: ${loc}${f.message}${excerpt}`;
    })
    .join("\n");
}
