import { useEffect, useState } from 'react';

const query = '(prefers-reduced-motion: reduce)';

/* The system setting, or NEXORA's own "Reduce motion" setting (it adds the .rm class on <html>). */
function read(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(query).matches || document.documentElement.classList.contains('rm');
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(read);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setReduced(read());
    mq.addEventListener('change', update);
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => { mq.removeEventListener('change', update); mo.disconnect(); };
  }, []);
  return reduced;
}
