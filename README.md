# Breathing Room — Rohan Malik ICU Simulation

Next.js App Router ICU branching simulation for Rohan Malik (Duchenne, trach/vent, AAC, ICD). Phases 1–12: foundation → deterministic engine → Code Blue content → PlayShell → story director → optional LLM → scored debrief → unified kit session → Action Stations → Episode 02 → production narration → season continuity.

## Requirements

- Node.js 20+ (tested with 24)
- npm

## Setup

```bash
npm install
```

Copy `.env.example` for optional story narration settings.

## Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Season map

1. **Episode 01** (`/episode`) — post-ROSC ICU trade-offs, consent, pressure-rise Action Stations, kit readiness, home/school.
2. **Code Blue** (`/code-blue`) — Alarm After ROSC PlayShell + kit evidence mode (`?mode=kit`); scored debrief at `/code-blue/debrief`.
3. **Episode 02** (`/episode-02`) — cardiac instability; optional Code Blue carry-forward projection (does not rewrite chronology).
4. **Authorship** (`/authorship`) — training-cut ownership / lived-experience framing (not clinical victory).
5. **Debrief** (`/debrief`) — Episode pathway reflection; Code Blue has a separate scored export.

Hard locks everywhere: library help → ambulance CPR → bay ROSC → ICU; no doses/energies/vent numbers/gesture CPR; readiness ≠ indication; family/paid support non-clinical; WAIT/silence ≠ consent; draft ≠ mutate; story/LLM never owns clinical truth; no walking/extubation victory; story does not end at ROSC.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run content-lint` | Zod-validate `content/**/*.json` + chronology / representation rules |
| `npm run simulation-test` | Engine + Code Blue + debrief + kit gate + stations bridge tests |
| `npm run story-director-test` | Story director / narration locks + Episode 01 cues + production guards |
| `npm run episode02-smoke` | Episode 02 start → debrief-hook smoke path |

## Routes

- `/` — home + season map + locked chronology
- `/episode` — Episode 01 player (director cues; optional OpenAI auto-enrich)
- `/code-blue` — Code Blue PlayShell (`?mode=kit` for kit focus)
- `/code-blue/interactive` — redirects into PlayShell kit mode
- `/code-blue/debrief` — six-dimension scored debrief + JSON export
- `/episode-02` — Episode 02 cardiac instability
- `/authorship` — authorship / training-cut beat
- `/api/narration` — story narration (rate-limited; feature-flagged; safe logs)
- `/debrief` — episode debrief shell
- `/accessibility` — reduced motion / sensory / captions defaults

## Story director (Phases 5–6 / 11)

Clinical truth lives in `src/engine/simulation`. The story layer (`src/story`) only shapes display narration:

1. **Deterministic director** — `director-cues.json` (Code Blue + Episode 01) + canon phrases + read-only engine framing.
2. **Optional LLM** — `POST /api/narration` with `STORY_LLM_MODE=mock|openai`; lock-validated; never mutates clinical state.
3. **Production** — `STORY_NARRATION_ENABLED`, per-minute rate limit, structured telemetry without PII/vitals dumps.

## Content

Versioned JSON under `content/`:

- `content/episodes/breathing-room/` — Episode 01 + Code Blue pack
- `content/episodes/breathing-room-ep02/` — Episode 02
- `content/episodes/breathing-room-authorship/` — authorship beat
- `content/canon/` — phrases, Action Stations
- `public/media/captions/*.vtt` — real caption tracks for key slots

No exact drug names or doses.

## Design notes

Calm clinical tokens (slate / teal). Avoid pity framing and purple “hero glow” aesthetics.
