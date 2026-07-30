import { EpisodePlayer } from "@/components/EpisodePlayer";
import {
  loadActionStations,
  loadAuthorshipManifest,
  loadAuthorshipNodes,
} from "@/lib/content";

export default async function AuthorshipPage() {
  const [manifest, nodes, actionStations] = await Promise.all([
    loadAuthorshipManifest(),
    loadAuthorshipNodes(),
    loadActionStations(),
  ]);

  return (
    <EpisodePlayer
      manifest={manifest}
      nodes={nodes}
      actionStations={actionStations}
      debriefHref="/debrief"
    />
  );
}
