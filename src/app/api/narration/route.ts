import { NextResponse } from "next/server";
import { z } from "zod";

import {
  loadCodeBlueDirectorCues,
  loadEpisode01DirectorCues,
} from "@/lib/content";
import {
  enrichNarration,
  getStoryLlmMode,
  isLlmNarrationConfigured,
  type StoryDirectorInput,
} from "@/story";
import {
  checkNarrationRateLimit,
  isNarrationFeatureEnabled,
  logNarrationTelemetry,
  narrationClientKeyFromRequest,
} from "@/story/production";

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
  cuePack: z.enum(["code-blue", "episode-01"]).optional(),
});

export async function GET() {
  return NextResponse.json({
    configured: isLlmNarrationConfigured(),
    enabled: isNarrationFeatureEnabled(),
    mode: getStoryLlmMode(),
    layer: "story-director",
    phases: ["5-deterministic", "6-optional-llm", "11-production"],
    clinicalTruth: "engine-owned",
    rateLimitPerMin: Number(process.env.STORY_NARRATION_RATE_LIMIT_PER_MIN ?? 20),
  });
}

export async function POST(request: Request) {
  const mode = getStoryLlmMode();
  const started = Date.now();

  if (!isNarrationFeatureEnabled()) {
    logNarrationTelemetry({
      kind: "narration_disabled",
      mode,
      reason: "STORY_NARRATION_ENABLED=false",
      at: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: "Narration feature disabled", mode },
      { status: 503 },
    );
  }

  const clientKey = narrationClientKeyFromRequest(request);
  const rate = checkNarrationRateLimit(clientKey);
  if (!rate.allowed) {
    logNarrationTelemetry({
      kind: "narration_rate_limited",
      mode,
      reason: "rate_limit",
      at: new Date().toISOString(),
    });
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfterSeconds: rate.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    logNarrationTelemetry({
      kind: "narration_invalid",
      mode,
      reason: "invalid_json",
      at: new Date().toISOString(),
    });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    logNarrationTelemetry({
      kind: "narration_invalid",
      mode,
      reason: "schema_failed",
      at: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: "Invalid narration request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const cuePack = parsed.data.cuePack ?? "code-blue";
  const cues =
    cuePack === "episode-01"
      ? await loadEpisode01DirectorCues()
      : await loadCodeBlueDirectorCues();
  const input = parsed.data as StoryDirectorInput;

  logNarrationTelemetry({
    kind: "narration_request",
    mode,
    nodeId: input.nodeId,
    at: new Date().toISOString(),
  });

  const narration = await enrichNarration(input, { cues });
  const durationMs = Date.now() - started;

  if (narration.fallbackReason) {
    logNarrationTelemetry({
      kind: "narration_fallback",
      mode,
      nodeId: input.nodeId,
      source: narration.source,
      reason: narration.fallbackReason,
      durationMs,
      at: new Date().toISOString(),
    });
  } else {
    logNarrationTelemetry({
      kind: "narration_success",
      mode,
      nodeId: input.nodeId,
      source: narration.source,
      durationMs,
      at: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    narration,
    llmConfigured: isLlmNarrationConfigured(),
    mode,
    cuePack,
  });
}
