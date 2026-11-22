import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let started: Promise<void> | null = null;

/*
 * Loads the original NEXORA modules in the same order as the old <script> tags.
 * They are IIFEs that publish their APIs on window (NX, NXD, NXL, NXApp, NXLanding...),
 * so each one is imported only after the previous one has run.
 * Guarded so React StrictMode (which runs effects twice in development) starts them once.
 */
export function bootLegacy(): Promise<void> {
  if (started) return started;
  started = (async () => {
    gsap.registerPlugin(ScrollTrigger);
    window.gsap = gsap;
    window.ScrollTrigger = ScrollTrigger;

    await import('./i18n.js');
    await import('./i18n-dict.js');
    await import('./engine.js');
    await import('./data.js');
    await import('./ui.js');
    await import('./graph.js');
    await import('./app.js');
    await import('./landing.js');

    if (!window.NXL) throw new Error('i18n module did not load');
    window.NXL.start();
  })();
  return started;
}
