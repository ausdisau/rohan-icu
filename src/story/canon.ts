/**
 * Canon phrase helpers for the story director (verbatim reuse).
 */

import phrasesJson from "../../content/canon/rohan-phrases.json";

export interface CanonPhrase {
  id: string;
  text: string;
  usage: string;
}

const phrases = (phrasesJson as { phrases: CanonPhrase[] }).phrases;
const byId = new Map(phrases.map((phrase) => [phrase.id, phrase]));

export function getCanonPhrase(id: string): CanonPhrase | undefined {
  return byId.get(id);
}

export function resolveCanonPhrases(ids: string[]): CanonPhrase[] {
  const out: CanonPhrase[] = [];
  for (const id of ids) {
    const phrase = byId.get(id);
    if (phrase) out.push(phrase);
  }
  return out;
}

/** Format canon lines for captions / framing — keep uppercase text intact. */
export function formatCanonCaption(phrase: CanonPhrase): string {
  return `Canon: ${phrase.text}`;
}
