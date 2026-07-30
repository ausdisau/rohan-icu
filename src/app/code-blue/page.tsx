import { PlayShell } from "@/components/code-blue/PlayShell";
import {
  loadCodeBlueActions,
  loadCodeBlueDebrief,
  loadCodeBlueDirectorCues,
  loadCodeBlueEvents,
  loadCodeBlueManifest,
  loadCodeBlueNodes,
} from "@/lib/content";
import { getStoryLlmMode, isLlmNarrationConfigured } from "@/story";

export default async function CodeBluePage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const uiMode = params.mode === "kit" ? "kit" : "standard";

  const [manifest, nodes, actions, events, debrief, directorCues] =
    await Promise.all([
      loadCodeBlueManifest(),
      loadCodeBlueNodes(),
      loadCodeBlueActions(),
      loadCodeBlueEvents(),
      loadCodeBlueDebrief(),
      loadCodeBlueDirectorCues(),
    ]);

  return (
    <PlayShell
      manifest={manifest}
      nodes={nodes}
      actions={actions}
      events={events}
      debrief={debrief}
      directorCues={directorCues}
      llmNarrationConfigured={isLlmNarrationConfigured()}
      storyLlmMode={getStoryLlmMode()}
      initialUiMode={uiMode}
    />
  );
}
