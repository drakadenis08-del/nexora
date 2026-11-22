import { Suspense, useRef, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MathUtils, type Group } from 'three';
import { GlbMascot } from './GlbMascot';
import { PreviewMascot } from './PreviewMascot';
import { MASCOT_MODEL_URL, type MascotState } from './mascotConfig';
import { useModelAvailable } from './useModelAvailable';
import { usePointer, type PointerTarget } from './usePointer';

type Props = {
  state: MascotState;
  active: boolean;
  anchor: RefObject<HTMLDivElement | null>;
};

/* Turns and drifts the whole bird toward the pointer with damping, plus a gentle hover. */
function Follow({ pointer, state, children }: { pointer: RefObject<PointerTarget>; state: MascotState; children: ReactNode }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }, dt) => {
    const o = g.current;
    if (!o) return;
    const p = pointer.current ?? { x: 0, y: 0 };
    const t = clock.elapsedTime;
    const k = state === 'curious' ? 1.25 : state === 'thinking' ? 0.4 : 1;
    const lambda = 4;
    o.rotation.y = MathUtils.damp(o.rotation.y, p.x * 0.7 * k, lambda, dt);
    o.rotation.x = MathUtils.damp(o.rotation.x, p.y * 0.35 * k, lambda, dt);
    o.position.x = MathUtils.damp(o.position.x, p.x * 0.18, 3, dt);
    const hop = state === 'happy' ? Math.abs(Math.sin(t * 6)) * 0.12 : 0;
    o.position.y = MathUtils.damp(o.position.y, -p.y * 0.1 + Math.sin(t * 2.1) * 0.06 + hop, 6, dt);
  });
  return <group ref={g}>{children}</group>;
}

function Bird({ state }: { state: MascotState }) {
  const available = useModelAvailable(MASCOT_MODEL_URL);
  if (available === null) return null;
  return available ? (
    <Suspense fallback={<PreviewMascot state={state} />}>
      <GlbMascot url={MASCOT_MODEL_URL} state={state} />
    </Suspense>
  ) : (
    <PreviewMascot state={state} />
  );
}

export default function MascotScene({ state, active, anchor }: Props) {
  const pointer = usePointer(anchor);
  return (
    <Canvas
      className="mascot-canvas"
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.1, 4.6], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#F3F0FF', '#7EE6D8', 0.8]} />
      <directionalLight position={[2.5, 3, 4]} intensity={1.6} />
      <Follow pointer={pointer} state={state}>
        <Bird state={state} />
      </Follow>
    </Canvas>
  );
}
