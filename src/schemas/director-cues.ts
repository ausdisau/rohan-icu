import { z } from "zod";

export const directorNodeCueSchema = z.object({
  intent: z.string().min(1),
  bridge: z.string().min(1),
  canonPhraseIds: z.array(z.string().min(1)).default([]),
  mustRetain: z.array(z.string().min(1)).default([]),
});

export const directorCuesFileSchema = z.object({
  id: z.literal("code-blue-director-cues"),
  version: z.string().min(1),
  phase: z.literal(5),
  notes: z.string().optional(),
  globalCanonPhraseIds: z.array(z.string().min(1)).default([]),
  nodes: z.record(z.string(), directorNodeCueSchema),
});

export type DirectorNodeCue = z.infer<typeof directorNodeCueSchema>;
export type DirectorCuesFile = z.infer<typeof directorCuesFileSchema>;
