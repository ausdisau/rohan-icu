<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Single self-contained Next.js 16 (App Router, Turbopack) app — no database, backend, or external services. Dependencies install via `npm install` (already run on startup by the update script).

- Dev server: `npm run dev` serves on `http://localhost:3000`. Routes: `/`, `/episode`, `/code-blue`, `/debrief`, `/accessibility`. Core interactive flow is `/code-blue` (the simulation PlayShell).
- Scripts live in `package.json`; several lint aliases (`content-lint`, `chronology-lint`, `access-lint`) run the same `scripts/content-lint.ts`, and `simulation-lint` == `simulation-test`. Content/engine checks are `tsx` scripts and run without the dev server.
- `npm run lint` (ESLint) currently reports pre-existing `react-hooks/set-state-in-effect` errors in `src/components/CanonPrognosisBlade.tsx` and `src/components/DebriefView.tsx`. These are existing code issues, not environment problems; don't treat a nonzero lint exit as a broken setup.
