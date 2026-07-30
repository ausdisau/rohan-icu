/**
 * Phase 11 — Production narration hardening.
 * Rate limits, feature flag, safe structured logging (no PII / vitals dumps).
 */

import type { StoryLlmMode } from "./llm";

export interface NarrationTelemetryEvent {
  kind:
    | "narration_request"
    | "narration_success"
    | "narration_fallback"
    | "narration_rate_limited"
    | "narration_disabled"
    | "narration_invalid";
  mode: StoryLlmMode;
  nodeId?: string;
  source?: string;
  reason?: string;
  durationMs?: number;
  at: string;
}

const rateBuckets = new Map<string, number[]>();

export function isNarrationFeatureEnabled(): boolean {
  const flag = process.env.STORY_NARRATION_ENABLED?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  return true;
}

export function getNarrationRateLimitPerMinute(): number {
  const raw = Number(process.env.STORY_NARRATION_RATE_LIMIT_PER_MIN ?? 20);
  if (!Number.isFinite(raw) || raw <= 0) return 20;
  return Math.floor(raw);
}

/** Client key is opaque (IP hash / session id) — never log raw PII. */
export function checkNarrationRateLimit(clientKey: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const limit = getNarrationRateLimitPerMinute();
  const now = Date.now();
  const windowMs = 60_000;
  const key = clientKey.slice(0, 64) || "anonymous";
  const stamps = (rateBuckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (stamps.length >= limit) {
    rateBuckets.set(key, stamps);
    const oldest = stamps[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowMs - (now - oldest)) / 1000),
    );
    return { allowed: false, retryAfterSeconds };
  }
  stamps.push(now);
  rateBuckets.set(key, stamps);
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Reset buckets — test helper only. */
export function resetNarrationRateLimits(): void {
  rateBuckets.clear();
}

/**
 * Structured log without vitals, names, or free-text clinical dumps.
 * Safe fields only: kind, mode, nodeId, source, reason codes, duration.
 */
export function logNarrationTelemetry(event: NarrationTelemetryEvent): void {
  const safe = {
    channel: "story-narration",
    kind: event.kind,
    mode: event.mode,
    nodeId: event.nodeId ? sanitizeNodeId(event.nodeId) : undefined,
    source: event.source,
    reason: event.reason ? sanitizeReason(event.reason) : undefined,
    durationMs: event.durationMs,
    at: event.at,
  };
  // eslint-disable-next-line no-console
  console.info(JSON.stringify(safe));
}

function sanitizeNodeId(nodeId: string): string {
  return nodeId.replace(/[^\w.-]/g, "").slice(0, 80);
}

function sanitizeReason(reason: string): string {
  // Drop anything that might echo vitals / PII from upstream errors.
  return reason
    .replace(/\b\d{2,3}\s*\/\s*\d{2,3}\b/g, "[redacted-bp]")
    .replace(/\b\d{2,3}\s*bpm\b/gi, "[redacted-hr]")
    .replace(/\b[\w.+-]+@[\w.-]+\b/g, "[redacted-email]")
    .slice(0, 240);
}

export function narrationClientKeyFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return `ip:${first.slice(0, 64)}`;
  const ua = request.headers.get("user-agent") ?? "unknown";
  return `ua:${ua.slice(0, 48)}`;
}
