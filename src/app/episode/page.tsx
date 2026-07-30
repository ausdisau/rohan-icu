import { EpisodePlayer } from "@/components/EpisodePlayer";
import {
  loadActionStations,
  loadEpisode01DirectorCues,
  loadEpisodeManifest,
  loadEpisodeNodes,
} from "@/lib/content";
import { getStoryLlmMode, isLlmNarrationConfigured } from "@/story";

export default async function EpisodePage() {
  const [manifest, nodes, actionStations, directorCues] = await Promise.all([
    loadEpisodeManifest(),
    loadEpisodeNodes(),
    loadActionStations(),
    loadEpisode01DirectorCues(),
  ]);

  return (
    <EpisodePlayer
      manifest={manifest}
      nodes={nodes}
      actionStations={actionStations}
      directorCues={directorCues}
      llmNarrationConfigured={isLlmNarrationConfigured()}
      storyLlmMode={getStoryLlmMode()}
    />
  );
}
