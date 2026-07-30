import { PlayShell } from "@/components/code-blue/PlayShell";
import {
  loadCodeBlueActions,
  loadCodeBlueDebrief,
  loadCodeBlueEvents,
  loadCodeBlueManifest,
  loadCodeBlueNodes,
} from "@/lib/content";
import { isLlmNarrationConfigured } from "@/story";

export default async function CodeBluePage() {
  const [manifest, nodes, actions, events, debrief] = await Promise.all([
    loadCodeBlueManifest(),
    loadCodeBlueNodes(),
    loadCodeBlueActions(),
    loadCodeBlueEvents(),
    loadCodeBlueDebrief(),
  ]);

  return (
    <PlayShell
      manifest={manifest}
      nodes={nodes}
      actions={actions}
      events={events}
      debrief={debrief}
      llmNarrationConfigured={isLlmNarrationConfigured()}
    />
  );
}
