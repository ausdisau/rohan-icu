# Breathing Room — Rohan Malik ICU Simulation

Phase 1 foundation for *Between the Lines* / *Breathing Room*: Next.js App Router, typed multi-domain state, Zod content schemas, and chronology continuity lint.

## Requirements

- Node.js 20+ (tested with 24)
- npm

## Setup

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run content-lint` | Zod-validate `content/**/*.json` + chronology / representation rules |
| `npm run simulation-test` | Phase 2 engine + Code Blue pack smoke tests |
| `npm run story-director-test` | Phase 5–6 story director / narration lock tests |

## Routes

- `/` — home + locked chronology
- `/episode` — Episode 01 player shell
- `/code-blue` — The Alarm After ROSC PlayShell (engine + content + story director + kit evidence)
- `/code-blue/interactive` — ChatGPT interactive Code Blue kit drill (standalone)
- `/api/narration` — Phase 5–6 narration (deterministic; optional OpenAI if `OPENAI_API_KEY` set)
- `/debrief` — debrief shell
- `/accessibility` — reduced motion / sensory / captions defaults

## Story director (Phase 5–6)

Clinical truth lives in `src/engine/simulation`. The story layer (`src/story`) only shapes display narration:

1. **Phase 5** — deterministic director composes authored scene text with read-only engine framing (WAIT, readiness≠indication, provisional ROSC, family non-clinical).
2. **Phase 6** — optional OpenAI enrichment via `POST /api/narration` when `OPENAI_API_KEY` is set. Output is lock-validated; failures fall back to Phase 5. LLM text never mutates `RichSimulationState`.

## Locked chronology

1. The library called help.
2. The ambulance performed CPR.
3. The resuscitation bay restored sustained circulation.
4. ICU care begins after sustained ROSC.

## Content

Versioned JSON lives under `content/`. Episode 01 stubs:

- `content/episodes/breathing-room/episode.json`
- `content/episodes/breathing-room/nodes/*.json`
- `content/canon/rohan-phrases.json`

No exact drug names or doses.

## Design notes

Calm clinical tokens (slate / teal). Avoid pity framing and purple “hero glow” aesthetics.
