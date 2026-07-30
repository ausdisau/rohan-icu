import { z } from "zod";

export const directorNodeCueSchema = z.object({
  intent: z.string().min(1),
  bridge: z.string().min(1),
  canonPhraseIds: z.array(z.string().min(1)).default([]),
  mustRetain: z.array(z.string().min(1)).default([]),
});

export const directorCuesFileSchema = z.object({
  id: z.enum(["code-blue-director-cues", "episode-01-director-cues"]),
  version: z.string().min(1),
  phase: z.union([z.literal(5), z.literal(11)]),
  notes: z.string().optional(),
  globalCanonPhraseIds: z.array(z.string().min(1)).default([]),
  nodes: z.record(z.string(), directorNodeCueSchema),
});

export type DirectorNodeCue = z.infer<typeof directorNodeCueSchema>;
export type DirectorCuesFile = z.infer<typeof directorCuesFileSchema>;
