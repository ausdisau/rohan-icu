import { z } from "zod";

import type { ContinuityFinding } from "./continuity";

export const narrativeLensSchema = z.enum([
  "bedside-clinical",
  "airway-equipment",
  "cardiac-monitor",
  "aac-access",
  "family-corridor",
  "handover",
  "governance-meeting",
  "post-event-reflection",
]);

export const dialogueLineSchema = z.object({
  speaker: z.string().min(1),
  line: z.string().min(1),
  aac: z.boolean().optional(),
});

export const evidenceItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().min(1),
  assessed: z.boolean().optional(),
});

export const communicationBeatSchema = z.object({
  instruction: z.enum(["WAIT", "STOP"]).nullable().optional(),
  questionActive: z.boolean(),
  note: z.string().min(1),
  pauseScenarioForAac: z.boolean().optional(),
});

export const familyBeatSchema = z.object({
  members: z.array(z.enum(["samira", "arvind", "leela"])).min(1),
  roles: z.array(z.string().min(1)).min(1),
  clinicalAssignmentForbidden: z.literal(true),
  note: z.string().min(1),
});

export const exitConditionSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  nextNodeId: z.string().min(1).nullable(),
  requiresActions: z.array(z.string().min(1)).optional(),
  requiresEvent: z.string().min(1).optional(),
  emergencyOverride: z.boolean().optional(),
});

export const codeBlueNodeSchema = z.object({
  id: z.string().min(1),
  phase: z.enum([
    "observe",
    "plan",
    "commit",
    "resolve",
    "reflect",
    "emergency-override",
  ]),
  title: z.string().min(1),
  scene: z.object({
    location: z.string().min(1),
    summary: z.string().min(1),
    lens: narrativeLensSchema,
    dialogue: z.array(dialogueLineSchema).optional(),
    captions: z.array(z.string().min(1)).optional(),
  }),
  clinicalTruth: z.object({
    airway: z.string().min(1),
    breathing: z.string().min(1),
    circulation: z.string().min(1),
    communicationAccess: z.string().min(1),
  }),
  visibleEvidence: z.array(evidenceItemSchema).min(1),
  hiddenState: z
    .object({
      primaryCause: z.string().min(1),
      notes: z.array(z.string().min(1)).optional(),
    })
    .optional(),
  availableActions: z.array(z.string().min(1)),
  interruptEvents: z.array(z.string().min(1)),
  communicationBeat: communicationBeatSchema.optional(),
  familyBeat: familyBeatSchema.optional(),
  exitConditions: z.array(exitConditionSchema).min(1),
  debriefTags: z.array(z.string().min(1)).min(1),
  canonDecisionCodes: z.array(z.string().min(1)).optional(),
});

export const codeBlueControlContractSchema = z.object({
  draftDoesNotMutate: z.literal(true),
  commitAdvancesRevision: z.literal(true),
  duplicatesAreConfirmation: z.literal(true),
});

export const codeBlueManifestSchema = z.object({
  id: z.literal("alarm-after-rosc"),
  slug: z.literal("code-blue"),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  version: z.string().min(1),
  simulationEngineRevision: z.literal(2),
  startNodeId: z.string().min(1),
  nodeIds: z.array(z.string().min(1)).min(1),
  chronologyLock: z.array(z.string().min(1)).min(3),
  controlContract: codeBlueControlContractSchema,
  educationalBoundary: z.string().min(1),
  estimatedMinutes: z
    .object({
      min: z.number().positive(),
      max: z.number().positive(),
    })
    .optional(),
});

export const codeBlueActionRefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  domain: z.enum([
    "airway",
    "breathing",
    "circulation",
    "communication-access",
  ]),
  catalogId: z.string().min(1),
  bundleTags: z.array(z.string().min(1)).optional(),
  notes: z.string().optional(),
});

export const codeBlueActionsFileSchema = z.object({
  id: z.literal("code-blue-actions"),
  version: z.string().min(1),
  actions: z.array(codeBlueActionRefSchema).min(1),
  bundles: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        actionIds: z.array(z.string().min(1)).min(1),
        notes: z.string().optional(),
      }),
    )
    .optional(),
});

export const codeBlueEventSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["clock", "state", "accumulated-pressure", "interrupt"]),
  label: z.string().min(1),
  summary: z.string().min(1),
  revealsEvidenceIds: z.array(z.string().min(1)).optional(),
  nextNodeId: z.string().min(1).optional(),
  emergencyOverride: z.boolean().optional(),
  hidesNonUrgentPlanning: z.boolean().optional(),
});

export const codeBlueEventsFileSchema = z.object({
  id: z.literal("code-blue-events"),
  version: z.string().min(1),
  events: z.array(codeBlueEventSchema).min(1),
});

export const codeBlueDebriefFileSchema = z.object({
  id: z.literal("code-blue-debrief"),
  version: z.string().min(1),
  dimensions: z.array(z.string().min(1)).min(6),
  reflectionPrompts: z.array(z.string().min(1)).min(4),
  tags: z.array(z.string().min(1)).min(1),
  noSinglePerfectPath: z.literal(true),
});

/** Alias used by loaders and the Phase 3 plan. */
export const codeBlueScenarioNodeSchema = codeBlueNodeSchema;

export type CodeBlueManifestParsed = z.infer<typeof codeBlueManifestSchema>;
export type CodeBlueNodeParsed = z.infer<typeof codeBlueNodeSchema>;
export type CodeBlueActionsFileParsed = z.infer<
  typeof codeBlueActionsFileSchema
>;
export type CodeBlueEventsFileParsed = z.infer<typeof codeBlueEventsFileSchema>;
export type CodeBlueDebriefFileParsed = z.infer<
  typeof codeBlueDebriefFileSchema
>;

export type CodeBlueManifest = CodeBlueManifestParsed;
export type CodeBlueScenarioNode = CodeBlueNodeParsed;
export type CodeBlueActionsFile = CodeBlueActionsFileParsed;
export type CodeBlueEventsFile = CodeBlueEventsFileParsed;
export type CodeBlueDebriefFile = CodeBlueDebriefFileParsed;

export interface CodeBluePackInput {
  manifest: unknown;
  actions: unknown;
  events: unknown;
  debrief: unknown;
  nodes: Array<{ id: string; data: unknown; path: string }>;
  catalogActionIds: string[];
  manifestPath: string;
  actionsPath: string;
  eventsPath: string;
  debriefPath: string;
}

export function lintCodeBluePack(input: CodeBluePackInput): ContinuityFinding[] {
  const findings: ContinuityFinding[] = [];

  const manifestParsed = codeBlueManifestSchema.safeParse(input.manifest);
  if (!manifestParsed.success) {
    findings.push({
      ruleId: "code-blue-manifest-schema",
      severity: "error",
      message: `code-blue manifest failed Zod: ${manifestParsed.error.message}`,
      path: input.manifestPath,
    });
    return findings;
  }
  const manifest = manifestParsed.data;

  const actionsParsed = codeBlueActionsFileSchema.safeParse(input.actions);
  if (!actionsParsed.success) {
    findings.push({
      ruleId: "code-blue-actions-schema",
      severity: "error",
      message: `code-blue actions failed Zod: ${actionsParsed.error.message}`,
      path: input.actionsPath,
    });
  }

  const eventsParsed = codeBlueEventsFileSchema.safeParse(input.events);
  if (!eventsParsed.success) {
    findings.push({
      ruleId: "code-blue-events-schema",
      severity: "error",
      message: `code-blue events failed Zod: ${eventsParsed.error.message}`,
      path: input.eventsPath,
    });
  }

  const debriefParsed = codeBlueDebriefFileSchema.safeParse(input.debrief);
  if (!debriefParsed.success) {
    findings.push({
      ruleId: "code-blue-debrief-schema",
      severity: "error",
      message: `code-blue debrief failed Zod: ${debriefParsed.error.message}`,
      path: input.debriefPath,
    });
  }

  const catalog = new Set(input.catalogActionIds);
  const actionIds = new Set<string>();
  if (actionsParsed.success) {
    for (const action of actionsParsed.data.actions) {
      actionIds.add(action.id);
      if (!catalog.has(action.catalogId)) {
        findings.push({
          ruleId: "code-blue-action-catalog",
          severity: "error",
          message: `Action ${action.id} catalogId "${action.catalogId}" is not in PHASE2_ACTION_CATALOG.`,
          path: input.actionsPath,
        });
      }
    }
    for (const bundle of actionsParsed.data.bundles ?? []) {
      for (const actionId of bundle.actionIds) {
        if (!actionIds.has(actionId)) {
          findings.push({
            ruleId: "code-blue-bundle-action",
            severity: "error",
            message: `Bundle ${bundle.id} references unknown action "${actionId}".`,
            path: input.actionsPath,
          });
        }
      }
    }
  }

  const eventIds = new Set<string>();
  if (eventsParsed.success) {
    for (const event of eventsParsed.data.events) {
      eventIds.add(event.id);
    }
    if (!eventIds.has("h5-emergency-override")) {
      findings.push({
        ruleId: "code-blue-h5-event",
        severity: "error",
        message: 'events.json must include interrupt id "h5-emergency-override".',
        path: input.eventsPath,
      });
    }
  }

  const nodeMap = new Map<string, CodeBlueNodeParsed>();
  for (const node of input.nodes) {
    const parsed = codeBlueNodeSchema.safeParse(node.data);
    if (!parsed.success) {
      findings.push({
        ruleId: "code-blue-node-schema",
        severity: "error",
        message: `Node ${node.id} failed Zod: ${parsed.error.message}`,
        path: node.path,
      });
      continue;
    }
    if (parsed.data.id !== node.id) {
      findings.push({
        ruleId: "code-blue-node-id-mismatch",
        severity: "error",
        message: `Node file id "${node.id}" does not match data.id "${parsed.data.id}".`,
        path: node.path,
      });
    }
    nodeMap.set(parsed.data.id, parsed.data);

    for (const actionId of parsed.data.availableActions) {
      if (actionsParsed.success && !actionIds.has(actionId)) {
        findings.push({
          ruleId: "code-blue-node-action",
          severity: "error",
          message: `Node ${parsed.data.id} lists unknown action "${actionId}".`,
          path: node.path,
        });
      }
    }
    for (const eventId of parsed.data.interruptEvents) {
      if (eventsParsed.success && !eventIds.has(eventId)) {
        findings.push({
          ruleId: "code-blue-node-event",
          severity: "error",
          message: `Node ${parsed.data.id} lists unknown interrupt "${eventId}".`,
          path: node.path,
        });
      }
    }
  }

  for (const nodeId of manifest.nodeIds) {
    if (!nodeMap.has(nodeId)) {
      findings.push({
        ruleId: "code-blue-missing-node",
        severity: "error",
        message: `Manifest nodeIds includes "${nodeId}" but no node file was loaded.`,
        path: input.manifestPath,
      });
    }
  }

  if (!manifest.nodeIds.includes(manifest.startNodeId)) {
    findings.push({
      ruleId: "code-blue-start-node",
      severity: "error",
      message: `startNodeId "${manifest.startNodeId}" is not listed in nodeIds.`,
      path: input.manifestPath,
    });
  }

  if (!nodeMap.has(manifest.startNodeId)) {
    findings.push({
      ruleId: "code-blue-start-reachable",
      severity: "error",
      message: `startNodeId "${manifest.startNodeId}" file is missing.`,
      path: input.manifestPath,
    });
  }

  const requiredG1 = [
    "assess-borrowed-circuit",
    "assign-suction-bedside-reserve",
    "assign-paid-support-continuity",
  ];
  if (actionsParsed.success) {
    for (const id of requiredG1) {
      if (!actionIds.has(id)) {
        findings.push({
          ruleId: "code-blue-g1-actions",
          severity: "error",
          message: `G1 requires action id "${id}" in actions.json.`,
          path: input.actionsPath,
        });
      }
    }
  }

  return findings;
}
