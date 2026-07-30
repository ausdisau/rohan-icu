import { CodeBlueDebriefView } from "@/components/code-blue/CodeBlueDebriefView";
import { loadCodeBlueDebrief } from "@/lib/content";

export default async function CodeBlueDebriefPage() {
  const debrief = await loadCodeBlueDebrief();
  return <CodeBlueDebriefView debrief={debrief} />;
}
