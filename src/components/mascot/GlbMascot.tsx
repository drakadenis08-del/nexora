import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { Box3, LoopOnce, LoopRepeat, Vector3, type Group } from 'three';
import { clipFor, resolveClips } from './clips';
import { BLINK_INTERVAL, CLIP_FADE, MODEL_FIT_SIZE, type MascotState } from './mascotConfig';

type Props = { url: string; state: MascotState };

/*
 * The Blender export. Works with any number of clips:
 * - clips named like the states (Idle, Blink, Curious, Thinking, Happy) are used for those states;
 * - a missing state falls back to Idle, then to the first clip;
 * - with no clips at all the model still hovers and follows the pointer.
 */
export function GlbMascot({ url, state }: Props) {
  const { scene, animations } = useGLTF(url);
  const root = useRef<Group>(null);
  const { actions, names } = useAnimations(animations, root);
  const clips = useMemo(() => resolveClips(names), [names]);

  /* Centre the model and scale it to a predictable size, whatever units Blender used. */
  const fit = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const centre = box.getCenter(new Vector3());
    const longest = Math.max(size.x, size.y, size.z) || 1;
    const s = MODEL_FIT_SIZE / longest;
    return { scale: s, offset: centre.multiplyScalar(-s) };
  }, [scene]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const missing = (['idle', 'blink', 'curious', 'thinking', 'happy'] as const).filter(s => !clips[s]);
    console.info('[NEXORA mascot] clips in model:', names.length ? names : 'none', '| matched:', clips, missing.length ? `| missing: ${missing.join(', ')}` : '');
  }, [names, clips]);

  /* Main looping clip for the current state, cross-faded. */
  useEffect(() => {
    const name = clipFor(state, clips, names);
    const action = name ? actions[name] : undefined;
    if (!action) return;
    action.reset().setLoop(LoopRepeat, Infinity).fadeIn(CLIP_FADE).play();
    return () => { action.fadeOut(CLIP_FADE); };
  }, [state, clips, names, actions]);

  /* Blink plays on top of the main clip: on a random timer, and once when the state is set to "blink". */
  useEffect(() => {
    const blink = clips.blink ? actions[clips.blink] : undefined;
    if (!blink) return;
    const once = () => { blink.reset().setLoop(LoopOnce, 1).play(); };
    if (state === 'blink') once();
    let timer = 0;
    const schedule = () => {
      const [a, b] = BLINK_INTERVAL;
      timer = window.setTimeout(() => { once(); schedule(); }, a + Math.random() * (b - a));
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [state, clips.blink, actions]);

  return (
    <group ref={root} scale={fit.scale} position={fit.offset}>
      <primitive object={scene} />
    </group>
  );
}
