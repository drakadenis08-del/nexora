import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type Group, type Mesh } from 'three';
import { BLINK_INTERVAL, type MascotState } from './mascotConfig';

type Props = { state: MascotState };

const C = { body: '#8B7CFF', head: '#64B5F6', throat: '#7EE6D8', wing: '#B9AFFF', beak: '#2B3553', eye: '#1D2440' };

/*
 * Temporary preview made of primitives, so the integration can be tested before the Blender model exists.
 * It acts out every state procedurally. It is replaced automatically once public/models/hummingbird.glb is added.
 */
export function PreviewMascot({ state }: Props) {
  const head = useRef<Group>(null);
  const wingL = useRef<Group>(null);
  const wingR = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const body = useRef<Group>(null);
  const lids = useRef<Mesh[]>([]);
  const blinkAt = useRef(0);

  useEffect(() => {
    if (state === 'blink') blinkAt.current = performance.now();
    let timer = 0;
    const schedule = () => {
      const [a, b] = BLINK_INTERVAL;
      timer = window.setTimeout(() => { blinkAt.current = performance.now(); schedule(); }, a + Math.random() * (b - a));
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [state]);

  const flat = useMemo(() => ({ flatShading: true, roughness: 0.55, metalness: 0.05 }), []);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const speed = state === 'thinking' ? 9 : state === 'happy' ? 22 : 16;
    const flap = Math.sin(t * speed) * 0.9;
    if (wingL.current) wingL.current.rotation.x = flap;
    if (wingR.current) wingR.current.rotation.x = -flap;
    if (tail.current) tail.current.rotation.x = MathUtils.damp(tail.current.rotation.x, Math.sin(t * 3) * 0.12 + (state === 'happy' ? 0.3 : 0), 6, dt);
    if (head.current) {
      const tilt = state === 'curious' ? 0.35 : state === 'thinking' ? -0.2 : 0;
      const look = state === 'thinking' ? 0.35 : 0;
      head.current.rotation.z = MathUtils.damp(head.current.rotation.z, tilt, 5, dt);
      head.current.rotation.x = MathUtils.damp(head.current.rotation.x, -look + Math.sin(t * 1.3) * 0.04, 5, dt);
    }
    if (body.current) body.current.rotation.z = MathUtils.damp(body.current.rotation.z, state === 'happy' ? Math.sin(t * 6) * 0.18 : 0, 6, dt);
    const since = (performance.now() - blinkAt.current) / 1000;
    const closed = since < 0.16 ? 1 - Math.abs(since / 0.08 - 1) : 0;
    lids.current.forEach(l => { l.scale.y = Math.max(0.02, closed); });
  });

  const eye = (x: number, i: number) => (
    <group position={[x, 0.08, 0.22]}>
      <mesh><sphereGeometry args={[0.055, 12, 10]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <mesh position={[0, 0, 0.035]}><sphereGeometry args={[0.032, 10, 8]} /><meshStandardMaterial color={C.eye} /></mesh>
      <mesh ref={m => { if (m) lids.current[i] = m; }} position={[0, 0, 0.012]} scale={[1, 0.02, 1]}><sphereGeometry args={[0.062, 12, 10]} /><meshStandardMaterial color={C.head} {...flat} /></mesh>
    </group>
  );

  return (
    <group ref={body} rotation={[0.1, -0.35, 0]} scale={0.95}>
      <mesh scale={[0.42, 0.5, 0.36]} position={[0, -0.12, 0]} rotation={[0.35, 0, 0]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={C.body} {...flat} />
      </mesh>
      <mesh scale={[0.3, 0.3, 0.24]} position={[0, 0.05, 0.22]} rotation={[0.5, 0, 0]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={C.throat} {...flat} />
      </mesh>
      <group ref={head} position={[0, 0.42, 0.08]}>
        <mesh scale={0.3}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color={C.head} {...flat} /></mesh>
        <mesh position={[0, -0.02, 0.48]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.035, 0.5, 8]} /><meshStandardMaterial color={C.beak} /></mesh>
        {eye(-0.14, 0)}
        {eye(0.14, 1)}
      </group>
      <group ref={wingL} position={[-0.32, 0.08, -0.05]}>
        <mesh position={[-0.42, 0.12, 0]} rotation={[0, 0, 0.45]} scale={[0.5, 0.14, 0.03]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color={C.wing} transparent opacity={0.85} {...flat} /></mesh>
      </group>
      <group ref={wingR} position={[0.32, 0.08, -0.05]}>
        <mesh position={[0.42, 0.12, 0]} rotation={[0, 0, -0.45]} scale={[0.5, 0.14, 0.03]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color={C.wing} transparent opacity={0.85} {...flat} /></mesh>
      </group>
      <group ref={tail} position={[0, -0.58, -0.22]}>
        <mesh rotation={[-0.6, 0, 0]} position={[0, -0.16, -0.05]}><coneGeometry args={[0.16, 0.42, 5]} /><meshStandardMaterial color={C.head} {...flat} /></mesh>
      </group>
    </group>
  );
}
