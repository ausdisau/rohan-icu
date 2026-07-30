/**
 * content-lint — Zod-validate episode JSON + run continuity / rights rules.
 * Exit 1 on any error.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PHASE2_ACTION_CATALOG } from "../src/engine/simulation/catalog";
import {
  episodeManifestSchema,
  formatContinuityFindings,
  lintActionStations,
  lintChronologyLock,
  lintCodeBluePack,
  lintContinuityText,
  lintEmergencyKitInventory,
  simulationNodeSchema,
  type ContinuityFinding,
} from "../src/schemas/index";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "content");
const publicRoot = path.join(root, "public");
const KIT_INVENTORY_BASENAME = "emergency-kit-inventory.json";
const ACTION_STATIONS_BASENAME = "action-stations.json";
const CODE_BLUE_DIR = path.join(
  contentRoot,
  "episodes",
  "breathing-room",
  "code-blue",
);

function isCodeBluePath(filePath: string): boolean {
  const rel = path.relative(CODE_BLUE_DIR, filePath);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

async function lintCodeBlueContentPack(): Promise<ContinuityFinding[]> {
  const findings: ContinuityFinding[] = [];
  const manifestPath = path.join(CODE_BLUE_DIR, "manifest.json");
  const actionsPath = path.join(CODE_BLUE_DIR, "actions.json");
  const eventsPath = path.join(CODE_BLUE_DIR, "events.json");
  const debriefPath = path.join(CODE_BLUE_DIR, "debrief.json");
  const nodesDir = path.join(CODE_BLUE_DIR, "nodes");

  async function readJson(filePath: string): Promise<unknown> {
    return JSON.parse(await readFile(filePath, "utf8")) as unknown;
  }

  let manifest: unknown;
  let actions: unknown;
  let events: unknown;
  let debrief: unknown;
  try {
    manifest = await readJson(manifestPath);
    actions = await readJson(actionsPath);
    events = await readJson(eventsPath);
    debrief = await readJson(debriefPath);
  } catch (err) {
    findings.push({
      ruleId: "code-blue-pack-missing",
      severity: "error",
      message: `Unable to read code-blue pack files: ${(err as Error).message}`,
      path: path.relative(root, CODE_BLUE_DIR),
    });
    return findings;
  }

  const nodeEntries = await readdir(nodesDir, { withFileTypes: true });
  const nodes: Array<{ id: string; data: unknown; path: string }> = [];
  for (const entry of nodeEntries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const full = path.join(nodesDir, entry.name);
    const id = entry.name.replace(/\.json$/, "");
    nodes.push({
      id,
      data: await readJson(full),
      path: path.relative(root, full),
    });
  }

  findings.push(
    ...lintCodeBluePack({
      manifest,
      actions,
      events,
      debrief,
      nodes,
      catalogActionIds: Object.keys(PHASE2_ACTION_CATALOG),
      manifestPath: path.relative(root, manifestPath),
      actionsPath: path.relative(root, actionsPath),
      eventsPath: path.relative(root, eventsPath),
      debriefPath: path.relative(root, debriefPath),
    }),
  );

  const chronology =
    manifest &&
    typeof manifest === "object" &&
    Array.isArray((manifest as { chronologyLock?: unknown }).chronologyLock)
      ? ((manifest as { chronologyLock: string[] }).chronologyLock)
      : null;
  if (chronology) {
    findings.push(
      ...lintChronologyLock(chronology, path.relative(root, manifestPath)),
    );
  }

  return findings;
}

async function walkJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJsonFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(full);
    }
  }
  return files;
}

function collectTextFromUnknown(value: unknown, parts: string[]): void {
  if (typeof value === "string") {
    parts.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectTextFromUnknown(item, parts);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectTextFromUnknown(v, parts);
    }
  }
}

/** Episode / production media must ship access equivalents. */
function lintMediaAccessibility(
  node: {
    id: string;
    openingNarrative: string;
    clinicalState: string;
    media?: Array<{
      id: string;
      kind: string;
      accessibility: {
        captions?: string;
        transcript?: string;
        audioDescription?: string;
        altText?: string;
        extendedAltText?: string;
        reducedSensoryAlt?: string;
      };
    }>;
  },
  filePath: string,
): ContinuityFinding[] {
  const findings: ContinuityFinding[] = [];
  const media = node.media ?? [];
  const nodeText = `${node.openingNarrative}\n${node.clinicalState}`;
  const nodeMentionsAlarm = /\balarm\b/i.test(nodeText);

  for (const item of media) {
    const a = item.accessibility;
    const loc = `${filePath}#${item.id}`;

    if (item.kind === "image" || item.kind === "svg") {
      if (!a.altText || a.altText.trim().length < 8) {
        findings.push({
          ruleId: "media-alt-required",
          severity: "error",
          message: `Image/SVG media "${item.id}" requires concise altText.`,
          path: loc,
        });
      }
    }

    if (item.kind === "audio" || item.kind === "video") {
      if (!a.transcript && !a.captions) {
        findings.push({
          ruleId: "media-timed-text-required",
          severity: "error",
          message: `Audio/video media "${item.id}" requires captions and/or transcript.`,
          path: loc,
        });
      }
      const mentionsAlarm =
        nodeMentionsAlarm ||
        /\balarm\b/i.test(
          [a.captions, a.transcript, a.audioDescription, a.reducedSensoryAlt]
            .filter(Boolean)
            .join("\n"),
        );
      if (mentionsAlarm && !a.reducedSensoryAlt) {
        findings.push({
          ruleId: "media-alarm-reduced-sensory",
          severity: "error",
          message: `Alarm-bearing media "${item.id}" requires reducedSensoryAlt.`,
          path: loc,
        });
      }
    }
  }

  return findings;
}

async function main(): Promise<void> {
  const findings: ContinuityFinding[] = [];
  let schemaErrors = 0;

  const jsonFiles = await walkJsonFiles(contentRoot);
  if (jsonFiles.length === 0) {
    console.error("content-lint: no JSON files under content/");
    process.exit(1);
  }

  // Code Blue pack uses its own Zod schemas — validate as a unit, then
  // still run continuity text rules on each file below.
  findings.push(...(await lintCodeBlueContentPack()));

  for (const file of jsonFiles) {
    const rel = path.relative(root, file);
    const raw = await readFile(file, "utf8");
    let data: unknown;
    try {
      data = JSON.parse(raw) as unknown;
    } catch (err) {
      schemaErrors += 1;
      console.error(`JSON parse error: ${rel}: ${(err as Error).message}`);
      continue;
    }

    const base = path.basename(file);
    const textParts: string[] = [];
    collectTextFromUnknown(data, textParts);
    const text = textParts.join("\n");
    const inCodeBlue = isCodeBluePath(file);

    if (base === KIT_INVENTORY_BASENAME) {
      findings.push(
        ...(await lintEmergencyKitInventory(data, rel, publicRoot)),
      );
      // Still run banned-phrase continuity on framing / alt copy.
      findings.push(...lintContinuityText({ path: rel, text }));
      continue;
    }

    if (base === ACTION_STATIONS_BASENAME) {
      findings.push(...lintActionStations(data, rel));
      findings.push(...lintContinuityText({ path: rel, text }));
      continue;
    }

    if (inCodeBlue) {
      findings.push(
        ...lintContinuityText({
          path: rel,
          text,
          meta: {
            mentionsAac: textParts.some((t) => /\baac\b/i.test(t)),
          },
        }),
      );
      continue;
    }

    if (
      base === "episode.json" ||
      (base !== "canon-runtime.json" &&
        data &&
        typeof data === "object" &&
        "chronologyLock" in (data as object) &&
        "nodeIds" in (data as object))
    ) {
      const parsed = episodeManifestSchema.safeParse(data);
      if (!parsed.success) {
        schemaErrors += 1;
        console.error(`Zod episode manifest failed: ${rel}`);
        console.error(parsed.error.message);
      } else {
        findings.push(...lintChronologyLock(parsed.data.chronologyLock, rel));
      }
    }

    if (
      data &&
      typeof data === "object" &&
      "choices" in (data as object) &&
      "openingNarrative" in (data as object)
    ) {
      const parsed = simulationNodeSchema.safeParse(data);
      if (!parsed.success) {
        schemaErrors += 1;
        console.error(`Zod simulation node failed: ${rel}`);
        console.error(parsed.error.message);
      } else {
        findings.push(
          ...lintContinuityText({
            path: rel,
            text,
            meta: {
              isEpisodeEnd: parsed.data.isEpisodeEnd,
              communicationMethod: parsed.data.communicationMethod,
              mentionsAac: textParts.some((t) => /\baac\b/i.test(t)),
            },
          }),
        );
        findings.push(...lintMediaAccessibility(parsed.data, rel));
        continue;
      }
    }

    // Canon / other JSON: still run text continuity rules
    findings.push(...lintContinuityText({ path: rel, text }));
  }

  if (findings.length > 0) {
    console.error(formatContinuityFindings(findings));
  }

  const total = schemaErrors + findings.length;
  if (total > 0) {
    console.error(
      `\ncontent-lint failed: ${schemaErrors} schema error(s), ${findings.length} continuity finding(s).`,
    );
    process.exit(1);
  }

  console.log(`content-lint passed (${jsonFiles.length} file(s)).`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
