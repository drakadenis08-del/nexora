import { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { BootError } from './components/BootError';
import { LandingMascot } from './components/mascot';
import { bootLegacy } from './legacy/boot';

/*
 * NEXORA is still driven by the original vanilla modules in src/legacy.
 * React renders the mount points once, then the legacy code takes over those nodes.
 * New features (for example a React Three Fiber mascot) can be added as React components
 * next to AppShell and migrated screen by screen.
 */
export default function App() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    bootLegacy().catch((e: unknown) => {
      console.error(e);
      setError(e instanceof Error ? e.message : String(e));
    });
  }, []);

  return (
    <>
      <AppShell />
      <LandingMascot />
      {error && <BootError message={error} />}
    </>
  );
}
