/**
 * Phase 6 — Optional OpenAI narration enricher.
 * Server-only. Display-only. Never mutates clinical truth.
 */

import { z } from "zod";

import { directSceneDeterministic } from "./director";
import { lintNarrationViewModel } from "./locks";
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

export function isLlmNarrationConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function systemPrompt(): string {
  return [
    "You are a story director for Breathing Room, a disability-aware ICU simulation.",
    "Rewrite ONLY scene flavour: summary, optional dialogue, captions, framing notes.",
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
): string {
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
      authored: {
        summary: input.scene.summary,
        dialogue: input.scene.dialogue ?? [],
        captions: input.scene.captions ?? [],
      },
      deterministicFramingNotes: deterministic.framingNotes,
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

async function callOpenAiJson(
  system: string,
  user: string,
): Promise<LlmNarrationResponse> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
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
  const parsed = llmResponseSchema.parse(JSON.parse(content));
  return parsed;
}

/**
 * Enrich narration via OpenAI when configured; otherwise return deterministic.
 * Always validates locks; on any failure falls back to deterministic director.
 */
export async function enrichNarration(
  input: StoryDirectorInput,
): Promise<NarrationViewModel> {
  const deterministic = directSceneDeterministic(input);

  if (!isLlmNarrationConfigured()) {
    return {
      ...deterministic,
      fallbackReason: "OPENAI_API_KEY unset — using deterministic director.",
    };
  }

  try {
    const raw = await callOpenAiJson(
      systemPrompt(),
      userPrompt(input, deterministic),
    );
    const candidate: NarrationViewModel = {
      source: "llm-enriched",
      summary: raw.summary,
      dialogue: raw.dialogue ?? deterministic.dialogue,
      captions: raw.captions ?? deterministic.captions,
      framingNotes: raw.framingNotes?.length
        ? raw.framingNotes
        : deterministic.framingNotes,
      clinicalTruthUnchanged: true,
      providerNote: `Phase 6 LLM enrichment (${process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini"}) — display only.`,
    };

    const lint = lintNarrationViewModel(candidate, input.compact, "llm-narration");
    if (!lint.ok) {
      return {
        ...deterministic,
        fallbackReason: `LLM narration rejected by locks: ${lint.findings
          .map((finding) => finding.ruleId)
          .join(", ")}`,
      };
    }
    return candidate;
  } catch (err) {
    return {
      ...deterministic,
      fallbackReason: `LLM enrichment failed: ${(err as Error).message}`,
    };
  }
}
