# Acceptance checklist — Episode 01

**Episode:** Breathing Room: After the Bay (`breathing-room-ep01`)  
**Date:** 2026-07-29  
**Commands:** `npm run content-lint` · `npm run build` (Node v24.13.0)

| Criterion | Result | Evidence |
| --- | --- | --- |
| Chronology cannot drift | **PASS** | `content-lint` chronology lock + drift rules; `episode.json` lock phrases |
| Media paths have captions / transcript / alt / visual equivalents as applicable | **PASS** | Node media a11y fields; lint enforces alt for image/svg and captions/transcript for audio/video |
| Alarm scenes have reduced-sensory alternatives | **PASS** | Wake audio + pressure/consequence videos; lint fails if alarm media lacks `reducedSensoryAlt` |
| Rohan addressed directly in decision conversations | **PASS** | Player header “Decision with Rohan”; consent dialogue addresses Rohan first |
| Trade-off decisions exist | **PASS** | Infection↑/renal↓ triad; airway A/B/C; sedation access vs synchrony; home/school/privacy |
| Home/school rights active mid-ICU | **PASS** | `ep01-home-school` with `homeReadiness` / `schoolAccess` / privacy domains |
| Learner can review why decisions produced outcomes | **PASS** | Immediate + delayed consequence panel; domain meters; debrief pathway highlights |
| Debrief continues beyond ROSC | **PASS** | `ep01-debrief-hook` + `/debrief` “Beyond ROSC”; next-episode hook |
| Consent rules explicit | **PASS** | `content/canon/consent-rules.json` (media, voice, likeness, symptom language, shortened cuts) |
| Full 10-node path wired from `episode.json` | **PASS** | All 10 `nodeIds` reachable from `startNodeId`; `/episode` loads via `loadEpisodeNodes()` |
| `npm run content-lint` | **PASS** | 26 files |
| `npm run build` | **PASS** | Next.js 16.2.12 production build |

## Overall

**Episode 01 acceptance: PASS** (scripted content + player slice). Non-blocking gaps: licensed WAV/video assets still slots; caption fields often reference multimedia JSON packages pending VTT embed; optional episode progress landmark.

## Review docs

- `docs/accessibility-audit.md`
- `docs/disability-rights-review.md`
- `docs/clinical-continuity-review.md`
