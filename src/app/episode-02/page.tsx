import { EpisodePlayer } from "@/components/EpisodePlayer";
import {
  loadActionStations,
  loadEpisode02Manifest,
  loadEpisode02Nodes,
} from "@/lib/content";

export default async function Episode02Page() {
  const [manifest, nodes, actionStations] = await Promise.all([
    loadEpisode02Manifest(),
    loadEpisode02Nodes(),
    loadActionStations(),
  ]);

  return (
    <EpisodePlayer
      manifest={manifest}
      nodes={nodes}
      actionStations={actionStations}
      enableCodeBlueCarryForward
      debriefHref="/debrief"
    />
  );
}
