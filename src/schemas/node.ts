import { z } from "zod";

import { simulationStateDeltaSchema } from "./simulation-state";

export const mediaAccessibilitySchema = z.object({
  captions: z.string().optional(),
  transcript: z.string().optional(),
  audioDescription: z.string().optional(),
  altText: z.string().optional(),
  extendedAltText: z.string().optional(),
  reducedSensoryAlt: z.string().optional(),
});

export const mediaRefSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["image", "audio", "video", "svg"]),
  src: z.string().min(1),
  title: z.string().optional(),
  accessibility: mediaAccessibilitySchema,
  autoplayForbidden: z.boolean().optional(),
});

export const communicationMethodSchema = z.enum([
  "deep-sedation",
  "cheek-switch",
  "auditory-scanning",
  "aac-board",
  "partner-assisted",
  "voice-output",
  "mixed",
]);

export const simulationChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  immediateConsequence: z.string().min(1),
  delayedConsequence: z.string().min(1),
  domainDeltas: simulationStateDeltaSchema,
  nextNodeId: z.string().min(1).nullable(),
  rohanAacLine: z.string().optional(),
});

export const simulationNodeSchema = z.object({
  id: z.string().min(1),
  phaseId: z.string().min(1),
  title: z.string().min(1),
  openingNarrative: z.string().min(1),
  clinicalState: z.string().min(1),
  communicationMethod: communicationMethodSchema,
  choices: z.array(simulationChoiceSchema).min(1),
  disabilityRightsNotes: z.array(z.string()),
  debriefNotes: z.array(z.string()),
  media: z.array(mediaRefSchema).optional(),
  isEpisodeEnd: z.boolean().optional(),
});

export const episodeManifestSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  chronologyLock: z.array(z.string().min(1)).min(3),
  startNodeId: z.string().min(1),
  nodeIds: z.array(z.string().min(1)).min(1),
  estimatedMinutes: z
    .object({
      min: z.number().positive(),
      max: z.number().positive(),
    })
    .optional(),
  version: z.string().min(1),
  /** Shared simulation engine revision (Phase 2+). Optional for older manifests. */
  simulationEngineRevision: z.number().int().positive().optional(),
});

export type SimulationNodeParsed = z.infer<typeof simulationNodeSchema>;
export type EpisodeManifestParsed = z.infer<typeof episodeManifestSchema>;
