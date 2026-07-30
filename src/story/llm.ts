/**
 * Phase 6 — Optional narration enricher (OpenAI or mock).
 * Server-only. Display-only. Never mutates clinical truth.
 */

import { z } from "zod";

import type { DirectorCuesFile } from "@/schemas/director-cues";

import { directSceneDeterministic } from "./director";
import { lintNarrationViewModel } from "./locks";
import { mergeWithDeterministicAnchors } from "./merge";
import type {
  LlmNarrationResponse,
  NarrationViewModel,
  StoryDirectorInput,
} from "./types";

const llmResponseSchema = z.object({
  summary: z.string().min(1).max(1200),
  dialogue: z
    .array(
      z.object({
        speaker: z.string().min(1).max(80),
        line: z.string().min(1).max(400),
        aac: z.boolean().optional(),
      }),
    )
    .max(8)
    .optional(),
  captions: z.array(z.string().min(1).max(240)).max(6).optional(),
  framingNotes: z.array(z.string().min(1).max(280)).max(8).optional(),
});

export type StoryLlmMode = "off" | "mock" | "openai";

export function getStoryLlmMode(): StoryLlmMode {
  const explicit = process.env.STORY_LLM_MODE?.trim().toLowerCase();
  if (explicit === "off" || explicit === "mock" || explicit === "openai") {
    return explicit;
  }
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  return "off";
}

export function isLlmNarrationConfigured(): boolean {
  const mode = getStoryLlmMode();
  return mode === "mock" || mode === "openai";
}

function systemPrompt(): string {
  return [
    "You are a story director for Breathing Room, a disability-aware ICU simulation.",
    "Rewrite ONLY scene flavour: summary, optional dialogue, captions, framing notes.",
    "Keep the director bridge intent and any MUST RETAIN tokens if provided.",
    "You MUST NOT change clinical truth, invent vitals, doses, shock energies, ventilator settings, or gesture CPR.",
    "You MUST NOT assign family or paid support to airway, ventilation, suction, or cardiac tasks.",
    "Respect WAIT/STOP. Silence is not consent. Readiness is not indication.",
    "Keep locked chronology: library called help; ambulance performed CPR; resuscitation bay restored sustained circulation; ICU after ROSC.",
    "Do not end the story at ROSC. Return strict JSON matching the schema.",
  ].join(" ");
}

function userPrompt(
  input: StoryDirectorInput,
  deterministic: NarrationViewModel,
  cues: DirectorCuesFile | null,
): string {
  const cue = cues?.nodes[input.nodeId];
  return JSON.stringify(
    {
      task: "Enrich scene narration for display only",
      educationalBoundary: input.educationalBoundary,
      chronologyLock: input.chronologyLock,
      node: {
        id: input.nodeId,
        title: input.title,
        phase: input.phase,
        lens: input.scene.lens,
        location: input.scene.location,
      },
      directorCue: cue ?? null,
      authored: {
        summary: input.scene.summary,
        dialogue: input.scene.dialogue ?? [],
        captions: input.scene.captions ?? [],
      },
      deterministicBaseline: {
        summary: deterministic.summary,
        framingNotes: deterministic.framingNotes,
      },
      engineCompactReadOnly: input.compact,
      constraints: {
        clinicalTruthUnchanged: true,
        noDosesOrEnergies: true,
        familyNonClinical: true,
      },
    },
    null,
    2,
  );
}

function mockEnrich(
  input: StoryDirectorInput,
  deterministic: NarrationViewModel,
  cues: DirectorCuesFile | null,
): LlmNarrationResponse {
  const cue = cues?.nodes[input.nodeId];
  const intent = cue?.intent ?? "Hold educational framing without inventing clinical truth.";
  return {
    summary: `${deterministic.summary} [Mock director colour: ${intent}]`,
    dialogue: deterministic.dialogue,
    captions: [
      ...deterministic.captions,
      "Mock Phase 6 enrichment — display only; engine vitals unchanged.",
    ],
    framingNotes: [
      `Mock LLM paraphrase of intent: ${intent}`,
      ...deterministic.framingNotes.slice(0, 4),
    ],
  };
}

async function callOpenAiJson(
  system: string,
  user: string,
): Promise<LlmNarrationResponse> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const controller = new AbortController();
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS ?? 12000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI HTTP ${response.status}: ${detail.slice(0, 240)}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned empty content");
    }
    return llmResponseSchema.parse(JSON.parse(content));
  } finally {
    clearTimeout(timer);
  }
}

export interface EnrichNarrationOptions {
  cues?: DirectorCuesFile | null;
}

/**
 * Enrich narration via mock/OpenAI when configured; otherwise deterministic.
 * Always merges required anchors and validates locks.
 */
export async function enrichNarration(
  input: StoryDirectorInput,
  options: EnrichNarrationOptions = {},
): Promise<NarrationViewModel> {
  const cues = options.cues ?? null;
  const deterministic = directSceneDeterministic(input, { cues });
  const mode = getStoryLlmMode();

  if (mode === "off") {
    return {
      ...deterministic,
      fallbackReason: "STORY_LLM_MODE=off (or no OPENAI_API_KEY) — Phase 5 only.",
    };
  }

  try {
    const raw =
      mode === "mock"
        ? mockEnrich(input, deterministic, cues)
        : await callOpenAiJson(
            systemPrompt(),
            userPrompt(input, deterministic, cues),
          );

    const merged = mergeWithDeterministicAnchors(
      input,
      deterministic,
      {
        summary: raw.summary,
        dialogue: raw.dialogue,
        captions: raw.captions,
        framingNotes: raw.framingNotes,
      },
      "llm-enriched",
      mode === "mock"
        ? "Phase 6 mock enrichment — display only; clinical truth unchanged."
        : `Phase 6 LLM enrichment (${process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini"}) — display only.`,
    );

    const lint = lintNarrationViewModel(merged, input.compact, "llm-narration");
    if (!lint.ok) {
      return {
        ...deterministic,
        fallbackReason: `LLM narration rejected by locks: ${lint.findings
          .map((finding) => finding.ruleId)
          .join(", ")}`,
      };
    }
    return merged;
  } catch (err) {
    return {
      ...deterministic,
      fallbackReason: `LLM enrichment failed: ${(err as Error).message}`,
    };
  }
}
