import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  episodeManifestSchema,
  simulationNodeSchema,
} from "@/schemas/node";
import type { EpisodeManifest, SimulationNode } from "@/types/node";

const episodeDir = path.join(
  process.cwd(),
  "content",
  "episodes",
  "breathing-room",
);

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
