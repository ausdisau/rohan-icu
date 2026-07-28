# Accessibility audit — Episode 01 (*Breathing Room: After the Bay*)

**Scope:** Playable Episode 01 UI (`/episode`, `/debrief`, `/accessibility`) and wired node media against WCAG-oriented simulation requirements (keyboard, screen reader, focus, captions, AD, reduced-sensory, time limits, communication-barrier recreation).  
**Date:** 2026-07-29  
**Build audited:** `content/episodes/breathing-room/` + `src/components/*`

Severity key: **Blocking** (must fix before release) · **Serious** · **Moderate** · **Strength**

---

## Summary

After fixes applied in this gate, **no blocking accessibility failures remain** in the Episode 01 player path. Serious items are limited to production-slot media (WAV/video not yet recorded). Moderate items are polish for future episodes.

---

## Blocking (resolved this gate)

| Finding | Evidence | Fix applied |
| --- | --- | --- |
| Reduced-sensory mode hid captions, transcript, and AD | `AccessibleMediaPlayer` gated all text tracks behind `!useReducedSensory` | Caption / transcript / AD toggles and panels remain available when reduced-sensory substitutes alarm audio |
| Focus lost after choice → consequence | Consequence panel appeared without moving keyboard focus | `DecisionNodeView` focuses `#consequence-heading` (`tabIndex={-1}`) when a consequence is pending |
| Skip-link / `sr-only` unreliable under Tailwind v4 alone | Layout skip link used `sr-only` / `focus:not-sr-only` | Explicit `.sr-only` focus-reveal rules added in `globals.css` |
| AAC panel previewed first branch’s line before choose | Could mislead learners / SR users about Rohan’s answer | AAC line shown only after a choice is committed |

---

## Serious

| Finding | Notes | Status |
| --- | --- | --- |
| Timed media `src` points at `.txt` production slots | Audio/video elements cannot play real media until licensed assets replace slots | Accepted for Episode 01 content slice; captions/transcript/AD strings and reduced-sensory alts are present |
| Caption/transcript fields often *point to* JSON packages (`See content/multimedia/...`) rather than inlining full timed text | Learner UI shows the pointer string unless production embeds full caption files | Non-blocking for scripted slots; replace with VTT / inlined text before public media release |
| Space / `k` shortcuts bound on `<figure>` which is not naturally focusable | Playback still fully operable via Play / Replay buttons | Moderate-to-serious polish: optional `tabIndex={0}` on control region if shortcuts are advertised |

---

## Moderate

| Finding | Notes |
| --- | --- |
| Domain meter chips on choice cards are dense for SR | Mitigated by `aria-describedby` on each choice button listing deltas |
| No landmark `nav` for episode progress through 10 nodes | Chronology gate + Restart exist; a step list would help orientation |
| Debrief empty state requires completed session in `sessionStorage` | Clear empty-state copy; no silent failure |
| `partner-assisted` method label needs staff clarification in UI copy | Content now states staff labour; method display label could echo that |

---

## Strengths

- Skip link to `#main`; visible `:focus-visible` outline globally.
- Choice controls are native `<button>`s with focus rings; no mouse-only paths.
- No forced autoplay; media player documents learner-started playback.
- Accessibility settings page: reduced motion, reduced sensory, captions / transcript / AD defaults persist in `localStorage` and drive the player.
- Alarm scenes (`ep01-sedation-delirium` wake audio; pressure / consequence videos) declare `reducedSensoryAlt`.
- Images/SVGs ship concise + extended alt (diagram uses pattern, not colour-only).
- Communication status panel explicitly separates access barriers from capacity findings.
- No timed auto-advance; learner controls pace (critical — does not recreate scanning time pressure).
- Decision header addresses Rohan directly on every node (“Decision with Rohan”).
- Immediate + delayed consequence review before Continue supports outcome literacy.
- Content-lint now fails build if image/SVG lack alt or alarm-bearing timed media lack reduced-sensory alts.

---

## Does the UI recreate communication barriers?

| Risk | Assessment |
| --- | --- |
| Forcing spoken-voice answers | No — choices are learner UI; Rohan answers via AAC panel after choice |
| Treating silence / delay as timeout failure | No time limits on decisions |
| Defaulting answers to family | Copy and dialogue forbid Samira answering first |
| Hiding access when sensory settings change | **Was blocking; fixed** — text access remains under reduced-sensory |
| Previewing / inventing Rohan’s line | **Was serious; fixed** — AAC waits until choice |

**Verdict:** UI does **not** recreate the barriers the narrative critiques, provided reduced-sensory and focus fixes remain in place.

---

## Residual acceptance note

Full WCAG AA certification of *produced* audio/video still requires licensed assets, real caption tracks, and an SR pass on the live build after media swap. Content and player contracts for Episode 01 are in place.
