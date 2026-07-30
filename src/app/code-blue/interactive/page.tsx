import { redirect } from "next/navigation";

/**
 * Phase 8 — kit drill deep-links into PlayShell (shared CodeBluePlaySession).
 * Legacy standalone toy state retired.
 */
export default function CodeBlueInteractivePage() {
  redirect("/code-blue?mode=kit");
}
