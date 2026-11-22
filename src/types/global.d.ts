import type { gsap as Gsap } from 'gsap';
import type { ScrollTrigger as ScrollTriggerType } from 'gsap/ScrollTrigger';

/* Globals published by the legacy modules in src/legacy. Typed loosely until each module is migrated. */
declare global {
  interface Window {
    gsap: typeof Gsap;
    ScrollTrigger: typeof ScrollTriggerType;
    NXL?: { start(): void; setLang(lang: string): void; readonly lang: string; t(text: string): string; loc(): string };
    NX?: Record<string, unknown>;
    NXD?: Record<string, unknown>;
    NXApp?: { route(): void } & Record<string, unknown>;
    NXLanding?: { show(): void; hide(): void };
    NXDICT?: Record<string, Record<string, string>>;
    NXPAT?: unknown[];
  }
}

export {};
