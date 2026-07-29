import { EpisodePlayer } from "@/components/EpisodePlayer";
import {
  loadActionStations,
  loadEpisodeManifest,
  loadEpisodeNodes,
} from "@/lib/content";

export default async function EpisodePage() {
  const [manifest, nodes, actionStations] = await Promise.all([
    loadEpisodeManifest(),
    loadEpisodeNodes(),
    loadActionStations(),
  ]);

  return (
    <EpisodePlayer
      manifest={manifest}
      nodes={nodes}
      actionStations={actionStations}
    />
  );
}
