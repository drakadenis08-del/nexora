/* NEXORA shared UI helpers: icons (Lucide-style strokes), logo, status meta, dialogs, toast. */
(function (root) {
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    briefcase: '<rect x="2.5" y="7" width="19" height="13.5" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2.5 13h19"/>',
    file: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    wallet: '<path d="M19 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H5"/><circle cx="16.5" cy="14" r="1.2"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.3-4.3"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1.5 14h5M9.5 8h5M17.5 16h5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    branch: '<circle cx="6" cy="5" r="2.5"/><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="8" r="2.5"/><path d="M6 7.5v9M18 10.5a7 7 0 0 1-7 7H8.5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    circle: '<circle cx="12" cy="12" r="8.5"/>',
    half: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/>',
    alert: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>', chevL: '<path d="m15 18-6-6 6-6"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 15V3M7 8l5-5 5 5M5 21h14"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowUR: '<path d="M7 17 17 7M8 7h9v9"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    archive: '<rect x="2.5" y="3.5" width="19" height="5" rx="1"/><path d="M4.5 8.5v10.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8.5M10 13h4"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    dots: '<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 16v-4.5M12 8h.01"/>',
    help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.5 9.5a2.5 2.5 0 0 1 4.8 1c0 1.7-2.3 2-2.3 3.5M12 17h.01"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    shield: '<path d="M12 3 4.5 6v6c0 4.6 3.2 7.8 7.5 9 4.3-1.2 7.5-4.4 7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
    compass: '<circle cx="12" cy="12" r="9.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    split: '<path d="M16 3h5v5M8 3H3v5M21 3l-7 7M3 3l7 7M12 22v-8"/>'
  };
  const I = (n, s) => `<svg class="ic" viewBox="0 0 24 24" width="${s || 18}" height="${s || 18}" aria-hidden="true">${P[n] || P.circle}</svg>`;

  const LOGO = (s, id) => {
    id = id || 'nxg' + Math.random().toString(36).slice(2, 6);
    return `<svg viewBox="0 0 32 32" width="${s}" height="${s}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8B7CFF"/><stop offset="1" stop-color="#64B5F6"/></linearGradient></defs>
      <path d="M10.6 11.4 21.4 20.6" stroke="url(#${id})" stroke-width="5.2" stroke-linecap="round"/>
      <rect x="2" y="2.5" width="13" height="13" rx="4" fill="#8B7CFF"/><rect x="17" y="16.5" width="13" height="13" rx="4" fill="#64B5F6"/>
      <rect x="6.5" y="7" width="4" height="4" rx="1.3" fill="#fff" opacity=".9"/><rect x="21.5" y="21" width="4" height="4" rx="1.3" fill="#fff" opacity=".9"/></svg>`;
  };
  const LOCKUP = s => `<span style="display:inline-flex;align-items:center;gap:10px">${LOGO(s)}<b style="font-family:var(--fh);font-weight:800;letter-spacing:.16em;font-size:${Math.round(s * 0.5)}px;color:var(--ink)">NEXORA</b></span>`;

  const STATUS = {
    todo: { label: 'To do', icon: 'circle' },
    in_progress: { label: 'In progress', icon: 'half' },
    done: { label: 'Done', icon: 'check' },
    needs_review: { label: 'Needs review', icon: 'alert' },
    blocked: { label: 'Blocked', icon: 'lock' }
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let toastTimer, toastUndo;
  function toast(text, undo) {
    const t = document.getElementById('toast'), b = document.getElementById('toastB');
    document.getElementById('toastT').textContent = text;
    toastUndo = undo || null; b.hidden = !undo;
    t.classList.add('on'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('on'), undo ? 6500 : 3200);
  }
  document.addEventListener('click', e => { if (e.target.id === 'toastB' && toastUndo) { const u = toastUndo; toastUndo = null; document.getElementById('toast').classList.remove('on'); u(); } });

  /* modal dialog with focus trap; resolves with the clicked action value */
  function dialog(o) {
    return new Promise(res => {
      const host = document.getElementById('dlg'), prev = document.activeElement;
      host.innerHTML = `<div class="dlg-bg"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgT">
        <h2 id="dlgT">${esc(o.title)}</h2>${o.body ? `<div class="muted">${o.body}</div>` : ''}${o.html || ''}
        <div class="acts">${(o.actions || [{ v: false, t: 'Cancel' }, { v: true, t: 'Confirm', p: true }]).map(a => `<button class="btn${a.p ? ' p' : ''}" data-v="${esc(String(a.v))}">${esc(a.t)}</button>`).join('')}</div></div></div>`;
      const box = host.querySelector('.dlg');
      const close = v => { host.innerHTML = ''; document.removeEventListener('keydown', key); prev && prev.focus && prev.focus(); res(v); };
      const vals = (o.actions || [{ v: false }, { v: true }]).map(a => a.v);
      host.querySelectorAll('[data-v]').forEach((b, i) => b.addEventListener('click', () => close(o.collect ? { v: vals[i], form: o.collect(box) } : vals[i])));
      host.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close(b.dataset.close)));
      host.querySelector('.dlg-bg').addEventListener('click', e => { if (e.target.classList.contains('dlg-bg')) close(o.collect ? { v: false } : false); });
      const key = e => {
        if (e.key === 'Escape') close(o.collect ? { v: false } : false);
        if (e.key === 'Tab') { const f = [...box.querySelectorAll('button,input,select,textarea,[tabindex="0"]')]; if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
      };
      document.addEventListener('keydown', key);
      setTimeout(() => { const f = box.querySelector('input,select,textarea') || box.querySelector('.btn.p') || box.querySelector('button'); f && f.focus(); }, 30);
    });
  }

  root.NXI = I; root.NXLOGO = LOGO; root.NXLOCKUP = LOCKUP; root.NXSTATUS = STATUS; root.esc = esc; root.toast = toast; root.dialog = dialog;
})(typeof window !== "undefined" ? window : globalThis);

// ES module marker for Vite and TypeScript; the file still publishes its API on window.
export {};
