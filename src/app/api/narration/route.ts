import { NextResponse } from "next/server";
import { z } from "zod";

import {
  enrichNarration,
  isLlmNarrationConfigured,
  type StoryDirectorInput,
} from "@/story";

export const runtime = "nodejs";

const compactSchema = z.object({
  playPhase: z.string(),
  pulse: z.string(),
  rhythm: z.string(),
  airwayRoute: z.string(),
  chestMovement: z.string(),
  defibrillatorReady: z.boolean(),
  aacInstruction: z.string().nullable(),
  aacVisible: z.boolean(),
  crisisDebtLevel: z.string(),
  provisionalRoscNeedsConfirm: z.boolean(),
  postRoscReassessmentDue: z.boolean(),
});

const requestSchema = z.object({
  nodeId: z.string().min(1),
  phase: z.string().min(1),
  title: z.string().min(1),
  scene: z.object({
    location: z.string(),
    summary: z.string(),
    lens: z.string(),
    dialogue: z
      .array(
        z.object({
          speaker: z.string(),
          line: z.string(),
          aac: z.boolean().optional(),
        }),
      )
      .optional(),
    captions: z.array(z.string()).optional(),
  }),
  communicationBeat: z
    .object({
      instruction: z.enum(["WAIT", "STOP"]).nullable().optional(),
      questionActive: z.boolean(),
      note: z.string(),
    })
    .optional(),
  familyBeat: z
    .object({
      clinicalAssignmentForbidden: z.literal(true),
      note: z.string(),
    })
    .optional(),
  educationalBoundary: z.string(),
  chronologyLock: z.array(z.string()).min(1),
  compact: compactSchema,
  emergencyOverride: z.boolean(),
});

export async function GET() {
  return NextResponse.json({
    configured: isLlmNarrationConfigured(),
    layer: "story-director",
    phases: ["5-deterministic", "6-optional-llm"],
    clinicalTruth: "engine-owned",
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid narration request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data as StoryDirectorInput;
  const narration = await enrichNarration(input);

  return NextResponse.json({
    narration,
    llmConfigured: isLlmNarrationConfigured(),
  });
}
