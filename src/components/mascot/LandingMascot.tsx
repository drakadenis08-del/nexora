import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mascot3D } from './Mascot3D';
import type { MascotState } from './mascotConfig';

const SLOT_ID = 'nxMascot';
const READY_EVENT = 'nx:landing-ready';

/*
 * Puts the mascot into the landing hero. The legacy landing builds its HTML on first show
 * and announces it with "nx:landing-ready"; the mascot is rendered into the empty slot it leaves.
 * Reactions: curious when the pointer comes close, thinking then happy after "Move to June 15".
 */
export function LandingMascot() {
  const [slot, setSlot] = useState<HTMLElement | null>(() => document.getElementById(SLOT_ID));
  const [state, setState] = useState<MascotState>('idle');

  useEffect(() => {
    const find = () => setSlot(document.getElementById(SLOT_ID));
    window.addEventListener(READY_EVENT, find);
    find();
    return () => window.removeEventListener(READY_EVENT, find);
  }, []);

  useEffect(() => {
    if (!slot) return;
    let near = false;
    let busyUntil = 0;
    const timers: number[] = [];
    const set = (s: MascotState) => setState(s);

    const move = (e: PointerEvent) => {
      if (performance.now() < busyUntil) return;
      const r = slot.getBoundingClientRect();
      const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      const now = d < Math.max(r.width, 160) * 1.6;
      if (now !== near) { near = now; set(now ? 'curious' : 'idle'); }
    };
    const react = (e: Event) => {
      if (!(e.target instanceof Element) || !e.target.closest('#hBtn')) return;
      timers.forEach(clearTimeout); timers.length = 0;
      busyUntil = performance.now() + 2600;
      set('thinking');
      timers.push(window.setTimeout(() => set('happy'), 700));
      timers.push(window.setTimeout(() => { near = false; set('idle'); }, 2600));
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('click', react);
    return () => {
      window.removeEventListener('pointermove', move);
      document.removeEventListener('click', react);
      timers.forEach(clearTimeout);
    };
  }, [slot]);

  return slot ? createPortal(<Mascot3D state={state} />, slot) : null;
}
