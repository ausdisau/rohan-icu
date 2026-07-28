# Clinical continuity review — Episode 01

**Scope:** Clinical coherence of the locked chronology and Episode 01 path (arrival → infection/renal → consent → pressure rise → consequence A/B/C → sedation/delirium → home/school → debrief).  
**Date:** 2026-07-29  
**Constraint:** No exact drug names or doses (confirmed throughout).

---

## Confirmed locks

| Lock | Where encoded | Status |
| --- | --- | --- |
| Library called help | `episode.json` chronologyLock; arrival / debrief narratives | Locked |
| Ambulance performed CPR | Same | Locked |
| Resuscitation bay restored sustained circulation | Same | Locked |
| ICU begins after sustained ROSC | chronologyLock + arrival opening | Locked |
| Trach + controlled ventilation are baseline support, not defeat | Arrival framing | Locked |
| Distal plug can coexist with patent tracheostomy / poor suction yield | Pressure-rise clinicalState + diagram | Locked |
| Infection vs renal toxicity is a trade-off triad | `ep01-infection-renal` | Locked |
| Airway triad → A/B/C consequences without “correct” scoring | Pressure-rise + consequence nodes | Locked |
| Sedation reduction aims at communication access | `ep01-sedation-delirium` | Locked |
| Home/school rights remain active mid-ICU | `ep01-home-school` | Locked |
| Debrief continues beyond ROSC | `ep01-debrief-hook` + debrief engine | Locked |

Content-lint `lintChronologyLock` + drift patterns enforce chronology at build time.

---

## Contradictions

| Item | Assessment |
| --- | --- |
| Library arrest / ambulance ROSC | **None found** in Episode 01 nodes or multimedia scripts |
| Wake scene ambulance memory relocating the arrest | Explicitly rejected: “ambulance memories without relocating the arrest to the library” | 
| Victory framed as extubation / walking | **None** |

---

## Ambiguities — corrected this gate

| Ambiguity | Problem | Correction |
| --- | --- | --- |
| ICD therapy in Branch C without Episode 01 prior mention | Learners meet “The ICD paces” without knowing cardiomyopathy/ICD is part of Rohan’s baseline | Arrival `clinicalState` and pressure-rise `clinicalState` now state **severe cardiomyopathy with ICD in situ** (aligned with phase-04 seed) |
| “Partner-assisted” after Branch C | Clinical method ambiguous for staffing | Clarified as **staff communication-specialist** assisted scanning |

---

## Remaining non-blocking ambiguities

| Item | Notes | Suggested later polish |
| --- | --- | --- |
| Exact organism / antibiotic class | Intentionally non-prescriptive | Keep unnamed; debrief already discusses trade-offs |
| Timing between infection choice and pressure rise | Narrative implies same ICU course | Optional: add “hours later” beat label in player chrome |
| Partial improvement in Branch B then later climb | Occurs in opening narrative of consequence-B, not as a second playable node | Acceptable compression for 20–30 min episode |
| Delirium fragments vs capacity | Copy is clear; some learners may still conflate | Debrief category already covers communication access |
| Home vs school as mutually exclusive focus | Domains allow both to move; one choice emphasises one track | Intentional trade-off; do not force both to max |

---

## Path coherence (10-node graph)

```
ep01-arrival-framing
  → ep01-infection-renal
    → ep01-consent-dialogue
      → ep01-pressure-rise
        → ep01-consequence-a|b|c
          → ep01-sedation-delirium
            → ep01-home-school
              → ep01-debrief-hook (isEpisodeEnd → /debrief)
```

All `nextNodeId` edges match `episode.json` `nodeIds`. Branch fan-in at sedation is clinically fine (airway outcome then shared wake/access work).

---

## Corrections checklist applied

1. Document cardiomyopathy + ICD on arrival and before recruitment branch.  
2. Clarify staff vs family in partner-assisted communication after Branch C.  
3. Retain no drug names/doses.  
4. Retain distal-plug + patent trach teaching point.

---

## Verdict

**Clinical continuity is production-ready** for Episode 01 after the ICD baseline lock and partner-assisted clarification. No chronology contradictions remain. Residual items are educational compression, not continuity failures.
