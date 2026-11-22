import { memo } from 'react';

/*
 * Mount points owned by the legacy NEXORA modules:
 *   #land   landing page (src/legacy/landing.js)
 *   #shell  app shell and all routes (src/legacy/app.js)
 *   #dlg    dialogs (src/legacy/ui.js)
 *   #toast  status toasts with Undo (src/legacy/ui.js)
 * React must never re-render these nodes, so the component is memoised and has no props or state.
 */
export const AppShell = memo(function AppShell() {
  return (
    <>
      <div id="land" hidden />
      <div id="shell" hidden />
      <div id="dlg" />
      <div className="toast" id="toast" role="status" aria-live="polite">
        <span id="toastT" />
        <button id="toastB" hidden>
          Undo
        </button>
      </div>
    </>
  );
});
