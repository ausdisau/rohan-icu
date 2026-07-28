# Disability-rights review — Episode 01

**Scope:** Episode 01 nodes, consent dialogue, debrief framing, and player copy against representation / rights rules locked in the build plan and `content-lint`.  
**Date:** 2026-07-29

---

## Method

Reviewed all ten playable nodes, `content/dialogues/ep01-consent-conversation.json`, canon phrases, and consent rules. Flagged scenes that could violate disability rights even when clinically “reasonable.”

---

## Findings

### No blocking rights violations remaining

Content-lint banned patterns (nonverbal-with-AAC, hand-squeeze as capacity, parents as unpaid responders, victory-as-walking/extubation, story-ends-at-ROSC, unavailable-as-incapacity) are clean across Episode 01 JSON.

### Serious — resolved this gate

| Scene / quote | Why it violated / risked | Replacement applied |
| --- | --- | --- |
| Branch C: “partner-assisted scanning restored after fatigue pause” without naming who partners | Learners could read “partner” as parent/Jay default unpaid labour | Opening + clinicalState + immediateConsequence now state **staff / communication specialist** partner-assisted scanning; family not substituted |

### Moderate — monitor (not violating as written)

| Scene | Risk | Guidance |
| --- | --- | --- |
| Infection node: “There is no single correct answer” | Meta-instruction is fine; avoid implying all harms are equal | Keep debrief naming trade-offs without “correct path” badges — already true |
| Sedation choice “Keep deeper sedation… with a written review time” | Could be chosen as convenience if review time is ignored in play | Domain deltas punish access/authorship; debrief must surface missed review — engine already flags rights vs clinical |
| Home/school privacy choice raises `familyBurden` | Correct that refusing video may spike family fear | Do not vilify Samira; copy already balances fear vs seizure of Rohan’s privacy |
| Instructional phrases containing “correct answer” in *negation* | Lint does not ban the words; tone must stay instructional | Keep “not framed as the gentle correct answer” style; never score UI as Correct |

### Strengths (rights-preserving scenes)

| Scene | Quote / behaviour | Why it holds |
| --- | --- | --- |
| Arrival | “Silence now is sedation, not a judgement about capacity.” | Barrier ≠ incapacity |
| Consent dialogue | Intensivist to Rohan first; Samira: “I will wait.” | Direct address; family fear without takeover |
| Consent rules canon | “Rohan’s identity, voice, and authored framing require consent.” | Authorship explicit |
| Pressure rise | Rohan reports `RIGHT MIDDLE`; staff do not speak over him | Symptom authorship |
| Sedation wake | Stop-on-signal; reaching checked as pain/position before restraint | Restraint minimisation |
| Home/school | “Instability may move dates. It does not erase legal orders…” | Rights active mid-ICU |
| Debrief hook | Continues beyond ROSC; “Survival alone is not the score.” | Rejects survival-only success |

---

## Representation checklist (Episode 01)

| Rule | Result |
| --- | --- |
| Chronology lock preserved | Pass |
| No victory as walking / extubation / trach removal | Pass |
| No “nonverbal” while AAC available | Pass |
| Unavailable access ≠ incapacity | Pass |
| No hand-squeeze capacity test | Pass |
| Parents/Jay not default unpaid responders | Pass (Branch C clarified) |
| Story does not end at ROSC | Pass |
| Samira does not answer first in decision dialogue | Pass |
| Rohan addressed in decision conversations | Pass (player header + dialogue) |

---

## Verdict

Episode 01 is **rights-safe to ship** for the scripted content slice after the Branch C partner-labour clarification. Remaining work is production ethics (voice licence, likeness, shortened training cuts) governed by `content/canon/consent-rules.json`, not further narrative rewrites.
