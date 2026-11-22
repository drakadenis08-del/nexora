import { CLIP_KEYWORDS, MASCOT_STATES, type MascotState } from './mascotConfig';

export type ClipMap = Partial<Record<MascotState, string>>;

/* Pick the best clip name for each state. Exact matches win over partial matches. */
export function resolveClips(names: readonly string[]): ClipMap {
  const lower = names.map(n => ({ name: n, key: n.toLowerCase().replace(/^.*\|/, '') }));
  const map: ClipMap = {};
  for (const state of MASCOT_STATES) {
    const words = CLIP_KEYWORDS[state];
    const exact = lower.find(c => words.includes(c.key));
    const partial = exact ?? lower.find(c => words.some(w => c.key.includes(w)));
    if (partial) map[state] = partial.name;
  }
  return map;
}

/* Clip used for a state: the state's own clip, otherwise Idle, otherwise the first clip. */
export function clipFor(state: MascotState, map: ClipMap, names: readonly string[]): string | undefined {
  if (state !== 'blink' && map[state]) return map[state];
  return map.idle ?? names[0];
}
