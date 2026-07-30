import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  episodeManifestSchema,
  simulationNodeSchema,
} from "@/schemas/node";
import {
  actionStationsSchema,
  type ActionStationsParsed,
} from "@/schemas/action-stations";
import {
  codeBlueActionsFileSchema,
  codeBlueDebriefFileSchema,
  codeBlueEventsFileSchema,
  codeBlueManifestSchema,
  codeBlueScenarioNodeSchema,
  type CodeBlueActionsFile,
  type CodeBlueDebriefFile,
  type CodeBlueEventsFile,
  type CodeBlueManifest,
  type CodeBlueScenarioNode,
} from "@/schemas/code-blue";
import type { EpisodeManifest, SimulationNode } from "@/types/node";

const episodeDir = path.join(
  process.cwd(),
  "content",
  "episodes",
  "breathing-room",
);

const codeBlueDir = path.join(episodeDir, "code-blue");

export async function loadEpisodeManifest(): Promise<EpisodeManifest> {
  const raw = await readFile(path.join(episodeDir, "episode.json"), "utf8");
  return episodeManifestSchema.parse(JSON.parse(raw));
}

export async function loadNode(nodeId: string): Promise<SimulationNode> {
  const raw = await readFile(
    path.join(episodeDir, "nodes", `${nodeId}.json`),
    "utf8",
  );
  return simulationNodeSchema.parse(JSON.parse(raw));
}

export async function loadEpisodeNodes(): Promise<SimulationNode[]> {
  const manifest = await loadEpisodeManifest();
  return Promise.all(manifest.nodeIds.map((id) => loadNode(id)));
}

export async function loadActionStations(): Promise<ActionStationsParsed> {
  const raw = await readFile(
    path.join(process.cwd(), "content", "canon", "action-stations.json"),
    "utf8",
  );
  return actionStationsSchema.parse(JSON.parse(raw));
}

export async function loadCodeBlueManifest(): Promise<CodeBlueManifest> {
  const raw = await readFile(path.join(codeBlueDir, "manifest.json"), "utf8");
  return codeBlueManifestSchema.parse(JSON.parse(raw));
}

export async function loadCodeBlueNode(
  nodeId: string,
): Promise<CodeBlueScenarioNode> {
  const raw = await readFile(
    path.join(codeBlueDir, "nodes", `${nodeId}.json`),
    "utf8",
  );
  return codeBlueScenarioNodeSchema.parse(JSON.parse(raw));
}

export async function loadCodeBlueNodes(): Promise<CodeBlueScenarioNode[]> {
  const manifest = await loadCodeBlueManifest();
  return Promise.all(manifest.nodeIds.map((id) => loadCodeBlueNode(id)));
}

export async function loadCodeBlueActions(): Promise<CodeBlueActionsFile> {
  const raw = await readFile(path.join(codeBlueDir, "actions.json"), "utf8");
  return codeBlueActionsFileSchema.parse(JSON.parse(raw));
}

export async function loadCodeBlueEvents(): Promise<CodeBlueEventsFile> {
  const raw = await readFile(path.join(codeBlueDir, "events.json"), "utf8");
  return codeBlueEventsFileSchema.parse(JSON.parse(raw));
}

export async function loadCodeBlueDebrief(): Promise<CodeBlueDebriefFile> {
  const raw = await readFile(path.join(codeBlueDir, "debrief.json"), "utf8");
  return codeBlueDebriefFileSchema.parse(JSON.parse(raw));
}
