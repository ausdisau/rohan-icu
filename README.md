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

## Routes

- `/` — home + locked chronology
- `/episode` — Episode 01 player shell
- `/code-blue` — The Alarm After ROSC PlayShell (Phase 2 engine + Code Blue content)
- `/debrief` — debrief shell
- `/accessibility` — reduced motion / sensory / captions defaults

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
