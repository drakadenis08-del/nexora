/*
 * Mascot settings in one place.
 * Drop the Blender export at public/models/hummingbird.glb and it is picked up automatically.
 * Until that file exists, a lightweight procedural preview is shown instead.
 */
export const MASCOT_MODEL_URL = '/models/hummingbird.glb';

export const MASCOT_STATES = ['idle', 'blink', 'curious', 'thinking', 'happy'] as const;
export type MascotState = (typeof MASCOT_STATES)[number];

/*
 * Clip names are matched case-insensitively. A clip matches a state if its name equals
 * one of these words or contains it (e.g. "Hummingbird_Idle", "idle_loop", "Armature|Happy").
 */
export const CLIP_KEYWORDS: Record<MascotState, string[]> = {
  idle: ['idle', 'hover', 'fly'],
  blink: ['blink'],
  curious: ['curious', 'look', 'tilt'],
  thinking: ['thinking', 'think', 'ponder'],
  happy: ['happy', 'joy', 'celebrate']
};

/* Seconds for cross-fading between looping clips. */
export const CLIP_FADE = 0.35;
/* Random pause between automatic blinks, in milliseconds. */
export const BLINK_INTERVAL: [number, number] = [2800, 6200];
/* Longest side of the model after normalising, in scene units. */
export const MODEL_FIT_SIZE = 1.8;
