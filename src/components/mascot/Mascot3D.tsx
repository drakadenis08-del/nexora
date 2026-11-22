import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { MascotState } from './mascotConfig';
import { MascotErrorBoundary } from './MascotErrorBoundary';
import { MascotFallback } from './MascotFallback';
import { useReducedMotion } from './useReducedMotion';

/* three.js, React Three Fiber and Drei live in this chunk; it is downloaded only when the mascot is about to be seen. */
const MascotScene = lazy(() => import('./MascotScene'));

export type Mascot3DProps = {
  state?: MascotState;
  className?: string;
};

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function Mascot3D({ state = 'idle', className }: Mascot3DProps) {
  const box = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [webgl] = useState(hasWebGL);
  const [seen, setSeen] = useState(false);
  const [visible, setVisible] = useState(false);

  /* Load on first approach, pause rendering whenever it is off screen or the landing is hidden. */
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      setVisible(e.isIntersecting);
      if (e.isIntersecting) setSeen(true);
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const fallback = <MascotFallback />;
  const live = webgl && !reduced && seen;

  return (
    <div ref={box} className={className ?? 'mascot3d'} aria-hidden="true">
      {live ? (
        <MascotErrorBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <MascotScene state={state} active={visible} anchor={box} />
          </Suspense>
        </MascotErrorBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}
