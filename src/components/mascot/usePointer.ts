import { useEffect, useRef, type RefObject } from 'react';

export type PointerTarget = { x: number; y: number };

/*
 * Pointer position relative to the mascot box, as -1..1 on each axis (clamped).
 * Stored in a ref so moving the mouse never re-renders React; the 3D loop reads it every frame.
 */
export function usePointer(anchor: RefObject<HTMLElement | null>, reach = 520) {
  const target = useRef<PointerTarget>({ x: 0, y: 0 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const el = anchor.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / reach;
      const dy = (e.clientY - (r.top + r.height / 2)) / reach;
      target.current.x = Math.max(-1, Math.min(1, dx));
      target.current.y = Math.max(-1, Math.min(1, dy));
    };
    const leave = () => { target.current.x = 0; target.current.y = 0; };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    return () => { window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); };
  }, [anchor, reach]);
  return target;
}
