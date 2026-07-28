import { EpisodePlayer } from "@/components/EpisodePlayer";
import { loadEpisodeManifest, loadEpisodeNodes } from "@/lib/content";

export default async function EpisodePage() {
  const [manifest, nodes] = await Promise.all([
    loadEpisodeManifest(),
    loadEpisodeNodes(),
  ]);

  return <EpisodePlayer manifest={manifest} nodes={nodes} />;
}
