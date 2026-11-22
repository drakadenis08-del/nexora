/* NEXORA app: hash router, views, local persistence. Everything runs in this browser. */
(function () {
  const { D } = NX, C = NXD.CATS, I = NXI, ST = NXSTATUS;
  const KEY = 'nexora-demo-v1';
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const pad = n => String(n).padStart(2, '0');
  const now = new Date(), TODAY = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  /* ---------- state ---------- */
  let storageOK = true;
  function load() {
    try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && Array.isArray(s.maps)) return s; } } catch (e) { storageOK = false; }
    return NXD.seed();
  }
  let S = load();
  S.prefs = Object.assign({ dateFmt: 'long', reducedMotion: false, tourDone: false }, S.prefs || {});
  const prevSeen = S.lastSeen || null; S.lastSeen = new Date().toISOString();
  let saveT;
  function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); storageOK = true; } catch (e) { storageOK = false; } }, 120); }
  save();
  const ui = { sel: null, mode: {}, cats: new Set(), q: '', listF: 'all', listSort: 'date', mapsF: 'all', wi: null, undo: {}, redo: {}, dismissed: new Set(), tlMap: 'all' };
  const f = s => D.fmt(s, S.prefs.dateFmt);
  const money = v => v == null ? '—' : '€' + Math.round(v).toLocaleString(NXL.loc());
  const getMap = id => S.maps.find(m => m.id === id);
  const datesOf = m => NX.resolve(m.nodes).dates;
  const main = m => m.nodes.find(n => n.type === 'milestone') || m.nodes[0];
  const nodeOf = (m, id) => m.nodes.find(n => n.id === id);
  function log(text, map) { S.activity.unshift({ t: new Date().toISOString(), text, map }); S.activity = S.activity.slice(0, 40); }
  function touch(m) { m.updatedAt = new Date().toISOString(); save(); }
  function snapshot(m) { (ui.undo[m.id] = ui.undo[m.id] || []).push(JSON.stringify(m)); if (ui.undo[m.id].length > 40) ui.undo[m.id].shift(); ui.redo[m.id] = []; }
  function restore(m, json) { const i = S.maps.indexOf(m); S.maps[i] = JSON.parse(json); touch(S.maps[i]); return S.maps[i]; }

  /* suggestions to verify; not a complete or authoritative list */
  const SUGGEST = {
    move: [['Who needs your new address? Bank, employer, subscriptions.', 'documents'], ['Health insurance cover during and after the move.', 'documents'], ['End or transfer utilities and internet.', 'housing'], ['Notice period for your current home.', 'housing'], ['Records you may need later: medical, school, tax.', 'documents'], ['Pets, plants or a vehicle to plan for.', 'travel']],
    career: [['References: who will vouch for you?', 'people'], ['Gap between last salary and first payday.', 'budget'], ['Benefits you lose or gain when switching.', 'work'], ['Skills to refresh before day one.', 'research']],
    study: [['Course materials and equipment costs.', 'budget'], ['Health cover while studying.', 'documents'], ['Part-time work rules for students, verified with an official source.', 'work'], ['Transport between home and campus.', 'travel']],
    purchase: [['Running costs after the purchase.', 'budget'], ['Return or cancellation terms.', 'research'], ['Delivery or handover date.', 'travel'], ['Insurance for the new item.', 'documents']],
    shared: [['Who decides what? Name an owner per area.', 'people'], ['Backup plan for weather or cancellations.', 'research'], ['Accessibility needs of guests.', 'people'], ['Payment deadlines with each provider.', 'budget']],
    custom: [['What has to be true before the main event?', 'research'], ['Who else is affected by this plan?', 'people'], ['What would it cost?', 'budget']]
  };
  function reviewList(m) {
    if (!m.review) m.review = (SUGGEST[m.template] || SUGGEST.custom).map((x, i) => ({ id: 'r' + i, t: x[0], cat: x[1], state: 'open' }));
    return m.review;
  }

  /* ---------- derived answers ---------- */
  function prereqs(m, id) { return m.deps.filter(e => e.to === id && e.relation === 'finish_to_start').map(e => nodeOf(m, e.from)).filter(Boolean); }
  function waitingOn(m, id) { return prereqs(m, id).filter(n => n.status !== 'done'); }
  function downstream(m, id) {
    const out = {}; m.deps.forEach(e => { (out[e.from] = out[e.from] || []).push(e.to); });
    const seen = new Set(), q = [id]; while (q.length) { const x = q.shift(); (out[x] || []).forEach(y => { if (!seen.has(y)) { seen.add(y); q.push(y); } }); }
    return [...seen].map(x => nodeOf(m, x)).filter(Boolean);
  }
  function upstream(m, id) {
    const inn = {}; m.deps.forEach(e => { (inn[e.to] = inn[e.to] || []).push(e.from); });
    const seen = new Set(), q = [id]; while (q.length) { const x = q.shift(); (inn[x] || []).forEach(y => { if (!seen.has(y)) { seen.add(y); q.push(y); } }); }
    return [...seen].map(x => nodeOf(m, x)).filter(Boolean);
  }
  /* ranked next steps, each with a reason built from status and dependencies */
  function nextSteps(m) {
    const d = datesOf(m), list = [];
    const conf = NX.conflicts(m.nodes, m.deps, d);
    m.nodes.forEach(n => {
      if (n.type === 'milestone' || n.status === 'done') return;
      const wait = waitingOn(m, n.id), unl = downstream(m, n.id).filter(x => x.type !== 'milestone');
      const unlock = unl.length ? `It unlocks ${unl.length} other ${unl.length === 1 ? 'task' : 'tasks'}: ${unl.slice(0, 2).map(x => x.title).join(', ')}${unl.length > 2 ? '…' : ''}.` : '';
      const c = conf.find(x => x.to === n.id);
      let score, why;
      if (n.status === 'needs_review') { score = 0; why = `It is marked Needs review, so its date or details may no longer fit the plan. ${c ? `It is due ${f(d[n.id])} but depends on ${nodeOf(m, c.from).title} (${f(c.fromDate)}). ` : ''}${unlock}`; }
      else if (c) { score = 1; why = `Order conflict: it is due ${f(d[n.id])}, before ${nodeOf(m, c.from).title} finishes on ${f(c.fromDate)}. ${unlock}`; }
      else if (wait.length) return;
      else if (n.status === 'in_progress') { score = 2; why = `You already started it and nothing blocks it. ${unlock}`; }
      else { score = 3; why = `Nothing blocks it${d[n.id] ? ` and it is due ${f(d[n.id])}` : ''}. ${unlock}`; }
      list.push({ node: n, map: m, date: d[n.id], score, why: why.trim(), wait });
    });
    list.sort((a, b) => a.score - b.score || (a.date || '9999').localeCompare(b.date || '9999'));
    return list;
  }
  function attention(m) {
    const d = datesOf(m), out = [];
    NX.conflicts(m.nodes, m.deps, d).forEach(c => out.push({ kind: 'conflict', node: nodeOf(m, c.to), text: `Due ${f(c.toDate)}, before ${nodeOf(m, c.from).title} (${f(c.fromDate)}).` }));
    m.nodes.forEach(n => {
      if (n.status === 'done') return;
      if (n.status === 'needs_review' && !out.find(o => o.node === n)) out.push({ kind: 'review', node: n, text: 'Marked Needs review.' });
      if (d[n.id] && d[n.id] < TODAY && n.type !== 'milestone') out.push({ kind: 'overdue', node: n, text: `Was due ${f(d[n.id])}.` });
      if (!d[n.id]) out.push({ kind: 'missing', node: n, text: 'No due date yet.' });
    });
    return out;
  }
  function budgetOf(m, avail) {
    const tasks = m.nodes.filter(n => n.type !== 'milestone');
    const withEst = tasks.filter(n => typeof n.cost === 'number');
    const sum = withEst.reduce((a, n) => a + n.cost, 0);
    const cont = Math.round(sum * (m.contingency || 0) / 100);
    const total = sum + cont, budget = avail != null ? avail : m.budget;
    return { sum, cont, pct: m.contingency || 0, total, budget, gap: budget != null ? budget - total : null, missing: tasks.filter(n => typeof n.cost !== 'number') };
  }

  /* ---------- small renderers ---------- */
  const stTag = s => `<span class="st st-${s}">${I(ST[s].icon, 13)}${ST[s].label}</span>`;
  const catDot = c => `<span class="catdot" style="--c:${(C[c] || C.research).color}"><i></i>${(C[c] || C.research).label}</span>`;
  function thumb(m) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    m.nodes.forEach(n => { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + 240); y1 = Math.max(y1, n.y + 110); });
    const W = 300, H = 110, s = Math.min((W - 20) / (x1 - x0), (H - 16) / (y1 - y0)), ox = (W - (x1 - x0) * s) / 2 - x0 * s, oy = (H - (y1 - y0) * s) / 2 - y0 * s;
    const ctr = n => [(n.x + (n.type === 'milestone' ? 132 : 116)) * s + ox, (n.y + 50) * s + oy];
    const lines = m.deps.map(e => { const a = nodeOf(m, e.from), b = nodeOf(m, e.to); if (!a || !b) return ''; const p = ctr(a), q = ctr(b); return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#C3CAE6" stroke-width="1.2"/>`; }).join('');
    const rects = m.nodes.map(n => `<rect x="${n.x * s + ox}" y="${n.y * s + oy}" width="${(n.type === 'milestone' ? 264 : 232) * s}" height="${(n.type === 'milestone' ? 120 : 96) * s}" rx="3" fill="${n.status === 'done' ? '#E5F9F6' : '#fff'}" stroke="${(C[n.category] || C.research).color}" stroke-width="1.2"/>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${lines}${rects}</svg>`;
  }
  function progress(m) { const t = m.nodes.filter(n => n.type !== 'milestone'); const d = t.filter(n => n.status === 'done').length; return { done: d, total: t.length, pct: t.length ? Math.round(d / t.length * 100) : 0 }; }

  /* ---------- shell ---------- */
  const NAV = [['app', 'home', 'Home'], ['maps', 'map', 'My Life Maps'], ['timeline', 'calendar', 'Timeline'], ['insights', 'chart', 'Insights'], ['templates', 'grid', 'Templates'], ['prefs', 'sliders', 'Settings']];
  function shell() {
    const sh = $('#shell');
    if (sh.dataset.ready) return;
    sh.dataset.ready = 1;
    sh.innerHTML = `<aside class="side" aria-label="App"><a class="brand" href="#" data-home aria-label="NEXORA home page">${NXLOGO(30)}<b>NEXORA</b></a>
      <nav class="nav" aria-label="Main">${NAV.map(([r, ic, t]) => `<a href="#${r}" data-r="${r}">${I(ic, 19)}<span>${t}</span>${r === 'insights' ? '<em class="cnt" id="navCnt" hidden></em>' : ''}</a>`).join('')}</nav>
      <div class="foot"><span class="concept">${I('info', 13)}Interactive concept</span><span><b>Sample data.</b> Your edits are stored in this browser only. No account, no sync, no AI model.</span><a href="#about" style="font-weight:600">About this concept</a></div></aside>
      <div class="main"><header class="top" id="top"><div id="topL" style="display:flex;align-items:center;gap:10px;min-width:0"></div><span class="sp"></span><div id="topR" style="display:flex;gap:8px;align-items:center"></div>${NXL.picker('top-lang')}<span class="concept">${I('info', 13)}Concept · Sample data</span></header><div id="view"></div></div>
      <nav class="bbar" aria-label="Main">${[['app', 'home', 'Home'], ['maps', 'map', 'Maps'], ['timeline', 'calendar', 'Timeline']].map(([r, ic, t]) => `<a href="#${r}" data-r="${r}">${I(ic, 20)}${t}</a>`).join('')}<button data-act="more" data-r="more">${I('menu', 20)}More</button></nav>`;
    addEventListener('nx-lang', () => { if (!$('#shell').hidden) route(); else { try { sessionStorage.setItem('nx-scroll', String(scrollY)); } catch (e) { } location.reload(); } });
    window.addEventListener('scroll', () => { const t = $('#top'); t && t.classList.toggle('scrolled', scrollY > 4); }, { passive: true });
  }
  function setTop(left, right) { $('#topL').innerHTML = left; $('#topR').innerHTML = right || ''; }
  function setNav(r) {
    $$('#shell [data-r]').forEach(a => a.toggleAttribute('aria-current', false));
    const key = r.startsWith('map-') || r.startsWith('whatif-') ? 'maps' : r === 'new' ? 'maps' : r;
    $$(`#shell [data-r="${key}"]`).forEach(a => a.setAttribute('aria-current', 'page'));
    const n = S.maps.filter(m => m.status === 'active').reduce((a, m) => a + attention(m).filter(x => x.kind !== 'missing').length, 0);
    const c = $('#navCnt'); if (c) { c.hidden = !n; c.textContent = n; }
  }

  /* ---------- router ---------- */
  let graph = null;
  function route() {
    const h = location.hash.slice(1);
    document.documentElement.classList.toggle('rm', !!S.prefs.reducedMotion);
    if (!h || h === 'top') { $('#shell').hidden = true; $('#land').hidden = false; window.NXLanding && NXLanding.show(); document.title = 'NEXORA'; return; }
    if (window.NXLanding) NXLanding.hide();
    $('#land').hidden = true; $('#shell').hidden = false; shell();
    if (graph) { graph.destroy(); graph = null; }
    const v = $('#view'); v.className = ''; v.innerHTML = '';
    if (h !== 'whatif-' + (ui.wi && ui.wi.mapId)) { /* keep scenario draft only while on its page */ }
    let r = h;
    try {
      if (h === 'app') home();
      else if (h === 'maps') maps();
      else if (h.startsWith('map-')) mapView(h.slice(4));
      else if (h.startsWith('whatif-')) whatIf(h.slice(7));
      else if (h === 'timeline') timeline();
      else if (h === 'insights') insights();
      else if (h === 'templates') templates();
      else if (h === 'prefs') prefs();
      else if (h === 'new' || h.startsWith('new-')) onboarding(h.slice(4));
      else if (h === 'about') about();
      else { r = 'app'; notFound(); }
    } catch (e) { console.error(e); errorView(e); }
    setNav(r);
    if (!h.startsWith('map-') && !h.startsWith('whatif-')) scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  const go = h => { if (location.hash === '#' + h) route(); else location.hash = h; };

  function notFound() { setTop('<h1>Page not found</h1>'); $('#view').innerHTML = `<div class="empty"><h3>This page does not exist</h3><p class="muted">The link may be from an older version of the demo.</p><a class="btn p" href="#app">Go to Home</a></div>`; }
  function errorView(e) { setTop('<h1>Something went wrong</h1>'); $('#view').innerHTML = `<div class="empty"><h3>This view could not load</h3><p class="muted">${esc(e.message)}. Your data is still in this browser. You can reset the sample data in Settings.</p><div style="display:flex;gap:8px"><a class="btn" href="#app">Home</a><a class="btn p" href="#prefs">Settings</a></div></div>`; }

  /* ---------- HOME ---------- */
  function featured() { return S.maps.filter(m => m.status === 'active').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]; }
  function home() {
    setTop('<h1>Home</h1>', `<a class="btn p sm" href="#new">${I('plus', 16)}New plan</a>`);
    const m = featured(), v = $('#view');
    if (!m) { v.innerHTML = `<div class="empty"><h3>No active plans yet</h3><p class="muted">Start with a life event. Templates give you an editable first draft.</p><a class="btn p" href="#new">${I('plus', 16)}Start with a life event</a></div>`; return; }
    const d = datesOf(m), ms = main(m), steps = nextSteps(m).filter(s => !ui.dismissed.has(s.node.id));
    const top = steps[0], alts = steps.slice(1, 3);
    const att = S.maps.filter(x => x.status === 'active').flatMap(x => attention(x).filter(a => a.kind !== 'missing').map(a => Object.assign(a, { map: x })));
    const upcoming = S.maps.filter(x => x.status === 'active').flatMap(x => { const dd = datesOf(x); return x.nodes.filter(n => n.status !== 'done' && dd[n.id] && dd[n.id] >= TODAY).map(n => ({ n, d: dd[n.id], map: x })); }).sort((a, b) => a.d.localeCompare(b.d));
    const week = upcoming.filter(u => D.diff(TODAY, u.d) <= 7), month = upcoming.filter(u => D.diff(TODAY, u.d) <= 30);
    const since = prevSeen ? S.activity.filter(a => a.t > prevSeen) : [];
    const pr = progress(m);
    v.innerHTML = `<div class="hello"><span class="kick">${new Date().toLocaleDateString(NXL.loc(), { weekday: 'long', month: 'long', day: 'numeric' })}</span><h2>Hi ${esc(S.user.alias.split(' ')[0])}, here is what matters now.</h2>
      <p class="muted">Focus plan: <b style="color:var(--ink)">${esc(m.title)}</b> · ${esc(ms.title)} on ${f(d[ms.id])} · ${pr.done} of ${pr.total} tasks done</p></div>
      <div class="grid2"><div class="stack">
        ${top ? `<section class="next" aria-labelledby="nbT"><span class="kick" style="color:var(--pri-ink)">${I('compass', 14)} Do this next</span>
          <h3 id="nbT">${esc(top.node.title)}</h3><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">${catDot(top.node.category)}${stTag(top.node.status)}<span class="muted" style="font-size:.86rem">${top.date ? 'Due ' + f(top.date) : 'No date yet'}</span></div>
          <div class="why"><b>Why now</b><span>${esc(top.why)}</span><small class="muted">Based on the status and dependencies in your plan.</small></div>
          <div class="acts">${top.node.status === 'todo' ? `<button class="btn p" data-act="start" data-m="${m.id}" data-n="${top.node.id}">${I('play', 15)}Start this task</button>` : top.node.status === 'needs_review' ? `<button class="btn p" data-act="open" data-m="${m.id}" data-n="${top.node.id}">${I('eye', 15)}Review it</button>` : `<button class="btn p" data-act="done" data-m="${m.id}" data-n="${top.node.id}">${I('check', 15)}Mark done</button>`}
            <button class="btn" data-act="open" data-m="${m.id}" data-n="${top.node.id}">${I('map', 15)}Show on map</button>
            <button class="btn" data-act="blockers" data-m="${m.id}" data-n="${top.node.id}">${I('link', 15)}What it unlocks</button>
            <button class="btn q" data-act="dismiss" data-n="${top.node.id}">Not now</button></div>
          ${alts.length ? `<div class="alts"><span class="kick">Other good options</span>${alts.map(a => `<button data-act="open" data-m="${m.id}" data-n="${a.node.id}">${I('chevR', 15)}<span><b style="font-weight:600">${esc(a.node.title)}</b> <span class="muted">· ${a.date ? f(a.date) : 'no date'}</span></span></button>`).join('')}</div>` : ''}
        </section>` : `<section class="next"><span class="kick">Do this next</span><h3>Everything ready is done</h3><p class="muted">Remaining tasks wait on others, or the plan is complete.</p></section>`}
        <section class="ask" aria-labelledby="askT"><span class="kick">${I('branch', 14)} What If?</span><h3 id="askT">What if your ${esc(ms.title.toLowerCase())} changes?</h3>
          <p class="muted">Try a new date. NEXORA shows what moves and what needs your review. Your plan stays as it is until you apply changes.</p>
          <form id="askF"><label class="f">New date for ${esc(ms.title)}<input type="date" id="askD" value="${D.add(d[ms.id], 31)}" required></label><button class="btn g" type="submit">${I('eye', 16)}Preview the impact</button></form>
          <small class="muted">Current date: ${f(d[ms.id])}</small></section>
        <section><div class="sec-h"><h2>Needs attention</h2><a class="btn q sm" href="#insights">All insights ${I('chevR', 14)}</a></div>
          ${att.length ? `<div class="att">${att.slice(0, 5).map(a => `<button class="row" data-act="open" data-m="${a.map.id}" data-n="${a.node.id}"><span class="ico">${I(a.kind === 'conflict' ? 'split' : a.kind === 'overdue' ? 'clock' : 'alert', 17)}</span><span><b>${esc(a.node.title)}</b><small>${a.kind === 'conflict' ? 'Order conflict. ' : a.kind === 'overdue' ? 'Overdue. ' : 'Needs review. '}${esc(a.text)} · ${esc(a.map.title)}</small></span>${I('chevR', 16)}</button>`).join('')}</div>` : `<div class="explain m">${I('check', 15)} Nothing needs review right now. Conflicts and items you mark for review appear here.</div>`}
        </section>
        <section><div class="sec-h"><h2>Active plans</h2><a class="btn q sm" href="#maps">All maps ${I('chevR', 14)}</a></div><div class="plans">${S.maps.filter(x => x.status === 'active').map(planCard).join('')}</div></section>
      </div>
      <div class="stack">
        <section class="card pad"><div class="sec-h"><h2>This week and next</h2></div>
          <p style="margin-bottom:10px">${week.length ? `<b>${week.length}</b> ${week.length === 1 ? 'task is' : 'tasks are'} due in the next 7 days.` : 'Nothing is due in the next 7 days.'} ${month.length ? `${month.length} in the next 30 days.` : upcoming[0] ? `Next due date: <b>${f(upcoming[0].d)}</b>.` : ''}</p>
          <ul class="feed">${upcoming.slice(0, 5).map(u => `<li><span class="dot" style="background:${(C[u.n.category] || C.research).color}"></span><span><button class="btn q sm" style="padding:0;min-height:0;font-weight:600" data-act="open" data-m="${u.map.id}" data-n="${u.n.id}">${esc(u.n.title)}</button><time>${f(u.d)} · ${esc(u.map.title)}</time></span></li>`).join('')}</ul>
          <a class="btn sm" href="#timeline" style="margin-top:10px">${I('calendar', 15)}Open timeline</a></section>
        <section class="card pad"><div class="sec-h"><h2>What changed</h2><span class="muted" style="font-size:.8rem">${prevSeen ? 'Since your last visit' : 'Recent activity'}</span></div>
          ${prevSeen && !since.length ? '<p class="muted" style="margin-bottom:8px">No changes since your last visit.</p>' : ''}
          <ul class="feed">${S.activity.slice(0, 6).map(a => `<li><span class="dot${prevSeen && a.t > prevSeen ? ' new' : ''}"></span><span>${esc(a.text)}<time>${new Date(a.t).toLocaleString(NXL.loc(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}${prevSeen && a.t > prevSeen ? ' · New' : ''}</time></span></li>`).join('')}</ul>
          <small class="muted">Only changes made in this browser are recorded.</small></section>
      </div></div>`;
    $('#askF').addEventListener('submit', e => { e.preventDefault(); const val = $('#askD').value; if (!D.valid(val)) return; ui.wi = { mapId: m.id, anchor: ms.id, date: val }; go('whatif-' + m.id); });
  }
  function planCard(m) {
    const d = datesOf(m), ms = main(m), pr = progress(m), att = attention(m).filter(a => a.kind !== 'missing').length;
    return `<button class="plan" data-go="map-${m.id}"><div class="thumb">${thumb(m)}</div><div><h3>${esc(m.title)}</h3><span class="muted" style="font-size:.84rem">${esc(ms.title)} · ${f(d[ms.id])}</span></div>
      <div class="bar" role="img" aria-label="${pr.pct}% done"><i style="width:${pr.pct}%"></i></div><div class="row"><span>${pr.done}/${pr.total} done</span>${att ? `<span class="tag t-rev">${I('alert', 13)}${att} to review</span>` : `<span class="tag t-ok">${I('check', 13)}On track</span>`}</div></button>`;
  }

  /* ---------- MAPS LIBRARY ---------- */
  function maps() {
    setTop('<h1>My Life Maps</h1>', `<a class="btn p sm" href="#new">${I('plus', 16)}New map</a>`);
    const F = [['all', 'All'], ['active', 'Active'], ['draft', 'Draft'], ['completed', 'Completed'], ['archived', 'Archived']];
    const list = S.maps.filter(m => ui.mapsF === 'all' ? m.status !== 'archived' : m.status === ui.mapsF);
    $('#view').innerHTML = `<div class="toolbar" role="group" aria-label="Filter maps">${F.map(([k, t]) => `<button class="chip" aria-pressed="${ui.mapsF === k}" data-act="mapsF" data-v="${k}">${t} <span class="muted">${k === 'all' ? S.maps.filter(m => m.status !== 'archived').length : S.maps.filter(m => m.status === k).length}</span></button>`).join('')}<span class="sp"></span><a class="btn sm" href="#templates">${I('grid', 15)}Templates</a></div>
      ${list.length ? `<div class="plans">${list.map(m => `<div class="mcard">${planCard(m).replace('class="plan"', 'class="plan" style="width:100%"')}<div class="menu"><span class="tag ${m.status === 'active' ? 't-ok' : 't-mut'}">${m.status[0].toUpperCase() + m.status.slice(1)}</span><button class="btn icon sm" aria-label="Actions for ${esc(m.title)}" data-act="mapMenu" data-m="${m.id}">${I('more', 16)}</button></div></div>`).join('')}</div>`
        : `<div class="empty"><h3>${ui.mapsF === 'all' ? 'No maps yet. Start with a life event.' : 'No maps here'}</h3><p class="muted">${ui.mapsF === 'all' ? 'A template gives you an editable first draft with dependencies.' : 'Change the filter to see other maps.'}</p><a class="btn p" href="#new">${I('plus', 16)}Create a map</a></div>`}`;
  }
  async function mapMenu(id) {
    const m = getMap(id);
    const r = await dialog({ title: m.title, html: `<label class="f">Name<input type="text" id="mmName" value="${esc(m.title)}" maxlength="80"></label><label class="f">Status<select id="mmSt">${['active', 'draft', 'completed', 'archived'].map(s => `<option value="${s}"${m.status === s ? ' selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select></label>`,
      actions: [{ v: 'delete', t: 'Delete' }, { v: 'dup', t: 'Duplicate' }, { v: false, t: 'Cancel' }, { v: 'save', t: 'Save', p: true }], collect: b => ({ name: $('#mmName', b).value.trim(), st: $('#mmSt', b).value }) });
    if (r.v === 'save') { if (!r.form.name) { toast('A map needs a name.'); return; } m.title = r.form.name; m.status = r.form.st; log(`Updated “${m.title}”`, m.id); touch(m); route(); toast('Map saved'); }
    if (r.v === 'dup') { const c = JSON.parse(JSON.stringify(m)); const nid = NXD.uid('m'); const rep = s => s.replace(new RegExp('^' + m.id + '_'), nid + '_'); c.id = nid; c.title = m.title + ' (copy)'; c.status = 'draft'; c.nodes.forEach(n => { n.id = rep(n.id); if (n.rule.anchor) n.rule.anchor = rep(n.rule.anchor); if (n.reviewWith) n.reviewWith = rep(n.reviewWith); }); c.deps.forEach(e => { e.id = rep(e.id); e.from = rep(e.from); e.to = rep(e.to); }); c.scenarios = []; c.updatedAt = new Date().toISOString(); S.maps.push(c); log(`Duplicated “${m.title}”`, nid); save(); route(); toast('Copy created as a draft'); }
    if (r.v === 'delete') {
      const ok = await dialog({ title: `Delete “${m.title}”?`, body: 'The map and its saved scenarios are removed from this browser. You can undo right after.', actions: [{ v: false, t: 'Cancel' }, { v: true, t: 'Delete map', p: true }] });
      if (!ok) return; const idx = S.maps.indexOf(m); S.maps.splice(idx, 1); save(); route();
      toast(`Deleted “${m.title}”`, () => { S.maps.splice(idx, 0, m); save(); route(); toast('Map restored'); });
    }
  }

  /* ---------- LIFE MAP ---------- */
  function mapView(id) {
    const m = getMap(id); if (!m) return notFound();
    const mode = ui.mode[id] || (innerWidth < 760 ? 'list' : 'map');
    if (ui.mapId !== id) { ui.sel = null; ui.cats = new Set(); ui.q = ''; ui.mapId = id; }
    const open = reviewList(m).filter(r => r.state === 'open').length;
    setTop(`<a class="crumb" href="#maps">${I('chevL', 16)}<span>Maps</span></a><h1 title="${esc(m.title)}">${esc(m.title)}</h1>`,
      `<a class="btn g sm" href="#whatif-${id}">${I('branch', 16)}What If?</a>`);
    const v = $('#view'); v.className = 'full';
    v.innerHTML = `<div class="mhead"><div class="seg" role="group" aria-label="View">${[['map', 'map', 'Map'], ['list', 'list', 'List'], ['timeline', 'calendar', 'Timeline']].map(([k, ic, t]) => `<button aria-pressed="${mode === k}" data-act="mode" data-v="${k}">${I(ic, 15)}${t}</button>`).join('')}</div>
      <button class="btn sm" data-act="review" data-m="${id}">${I('help', 15)}Things to review${open ? ` <span class="tag t-rev">${open}</span>` : ''}</button>
      <button class="btn sm" data-act="budget" data-m="${id}">${I('wallet', 15)}Budget</button>
      <span class="sp"></span><span class="muted" style="font-size:.82rem">${esc(main(m).title)}: <b style="color:var(--ink)">${f(datesOf(m)[main(m).id])}</b></span></div><div id="mbody" class="mbody"></div>`;
    if (mode === 'map') mapCanvas(m); else if (mode === 'list') listView(m); else tlView(m);
    if (mode === 'map' && !S.prefs.tourDone) tour(m);
  }

  function mapCanvas(m) {
    const body = $('#mbody');
    body.innerHTML = `<div class="canvas-wrap"><div id="gc" style="position:absolute;inset:0"></div>
      <div class="g-ui mtools" role="toolbar" aria-label="Map tools">
        <div class="grp"><button class="btn icon sm" data-act="zoomOut" aria-label="Zoom out" title="Zoom out (-)">${I('minus', 16)}</button><button class="btn icon sm" data-act="zoomIn" aria-label="Zoom in" title="Zoom in (+)">${I('plus', 16)}</button><button class="btn icon sm" data-act="fit" aria-label="Fit to view" title="Fit (F)">${I('fit', 16)}</button></div>
        <div class="grp"><button class="btn icon sm" data-act="undo" aria-label="Undo" title="Undo (Ctrl+Z)" ${(ui.undo[m.id] || []).length ? '' : 'disabled'}>${I('undo', 16)}</button><button class="btn icon sm" data-act="redo" aria-label="Redo" title="Redo" ${(ui.redo[m.id] || []).length ? '' : 'disabled'}>${I('redo', 16)}</button></div>
        <div class="grp"><button class="btn sm" data-act="addNode">${I('plus', 15)}Add task</button></div>
        <div class="grp"><label class="sr" for="gq">Search tasks</label><input type="search" id="gq" placeholder="Search tasks" value="${esc(ui.q)}"></div>
      </div>
      <div class="g-ui cats" role="group" aria-label="Filter by category">${[...new Set(m.nodes.map(n => n.category))].map(c => `<button class="chip" style="--c:${(C[c] || C.research).color}" aria-pressed="${ui.cats.has(c)}" data-act="cat" data-v="${c}"><i></i>${(C[c] || C.research).label}</button>`).join('')}</div>
      <div class="g-ui legend" aria-label="Legend"><b>HOW TO READ THE MAP</b>
        <div><svg viewBox="0 0 34 10"><path d="M1 5h28" stroke="#AEB6D6" stroke-width="2"/><path d="M27 1l6 4-6 4z" fill="#9AA3C7"/></svg>A → B: B depends on A</div>
        <div><svg viewBox="0 0 34 10"><path d="M1 5h30" stroke="#AEB6D6" stroke-width="2" stroke-dasharray="5 4"/></svg>Linked for information only</div>
        <div><svg viewBox="0 0 34 10"><path d="M1 5h30" stroke="#8B7CFF" stroke-width="1.6" stroke-dasharray="2 5" stroke-linecap="round"/></svg>Date set relative to a milestone</div>
        <div>${I('lock', 13)} Fixed date · ${I('link', 13)} Relative date</div></div>
    </div><aside class="insp" id="insp" ${ui.sel ? '' : 'hidden'} aria-label="Task details"></aside>`;
    graph = new NXGraph($('#gc'), {
      onSelect: id => { ui.sel = id; paintGraph(m); inspector(m); if (id) setTimeout(() => { const h = $('#insp h3'); h && h.focus({ preventScroll: true }); }, 10); },
      onMove: (id, x, y) => { const n = nodeOf(m, id); if (n.x === x && n.y === y) return; snapshot(m); n.x = x; n.y = y; touch(m); refreshTools(m); }
    });
    paintGraph(m); inspector(m);
    $('#gq').addEventListener('input', e => { ui.q = e.target.value; paintGraph(m); });
  }
  function paintGraph(m) {
    if (!graph) return;
    const d = datesOf(m), q = ui.q.trim().toLowerCase();
    const dim = new Set(m.nodes.filter(n => (ui.cats.size && !ui.cats.has(n.category)) || (q && !n.title.toLowerCase().includes(q))).map(n => n.id));
    let lit = new Set(), rays = [];
    if (ui.sel) { const up = upstream(m, ui.sel).map(n => n.id), dn = downstream(m, ui.sel).map(n => n.id), path = new Set([ui.sel, ...up, ...dn]); m.deps.forEach(e => { if (path.has(e.from) && path.has(e.to)) lit.add(e.id); }); const n = nodeOf(m, ui.sel); if (n && n.rule.kind === 'relative') rays = [n.id]; if (n && n.type === 'milestone') rays = m.nodes.filter(x => x.rule.kind === 'relative' && x.rule.anchor === n.id).map(x => x.id); }
    const confE = new Set(NX.conflicts(m.nodes, m.deps, d).map(c => c.edge));
    const hl = {}; NX.conflicts(m.nodes, m.deps, d).forEach(c => { hl[c.to] = 'conflict'; });
    graph.set({ map: m, dates: d, sel: ui.sel, lit, rays, dim, confEdges: confE, hl, fmt: s => D.fmt(s) });
  }
  function refreshTools(m) { const u = $('[data-act="undo"]'), r = $('[data-act="redo"]'); if (u) u.disabled = !(ui.undo[m.id] || []).length; if (r) r.disabled = !(ui.redo[m.id] || []).length; }

  function inspector(m) {
    const box = $('#insp'); if (!box) return;
    const n = ui.sel && nodeOf(m, ui.sel);
    if (!n) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    const d = datesOf(m), c = C[n.category] || C.research, pre = prereqs(m, n.id), wait = pre.filter(p => p.status !== 'done');
    const after = m.deps.filter(e => e.from === n.id).map(e => ({ e, n: nodeOf(m, e.to) })).filter(x => x.n);
    const before = m.deps.filter(e => e.to === n.id).map(e => ({ e, n: nodeOf(m, e.from) })).filter(x => x.n);
    const dn = downstream(m, n.id), conf = NX.conflicts(m.nodes, m.deps, d).filter(x => x.to === n.id || x.from === n.id);
    const anchor = n.rule.kind === 'relative' && nodeOf(m, n.rule.anchor);
    const dependents = m.nodes.filter(x => x.rule.kind === 'relative' && x.rule.anchor === n.id);
    const rel = n.rule.kind === 'relative' ? `Set ${Math.abs(n.rule.offset)} days ${n.rule.offset < 0 ? 'before' : 'after'} ${anchor ? esc(anchor.title) : 'its anchor'}. It moves when that date moves.` : n.rule.kind === 'fixed' ? 'Fixed date. NEXORA never moves it automatically; changes to linked dates only flag it for review.' : 'Flexible date. You set it by hand.';
    const otherAnchors = m.nodes.filter(x => x.id !== n.id && x.type === 'milestone');
    box.innerHTML = `<div class="insp-in">
      <div class="hd"><span class="tag" style="background:${c.soft};color:var(--ink)">${I(c.icon, 13)}${c.label} · ${n.type}</span><span class="sp"></span><button class="btn icon sm q" data-act="closeInsp" aria-label="Close details">${I('x', 18)}</button></div>
      <h3 tabindex="-1">${esc(n.title)}</h3>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">${stTag(n.status)}<span class="muted" style="font-size:.86rem">${d[n.id] ? 'Due ' + f(d[n.id]) : 'No date'}</span>${n.reviewWith ? `<span class="tag t-rev">${I('eye', 13)}Manual review when ${esc((nodeOf(m, n.reviewWith) || {}).title || 'milestone')} moves</span>` : ''}</div>
      ${conf.length ? `<div class="explain">${I('split', 15)} <b>Order conflict.</b> ${conf.map(x => `${esc(nodeOf(m, x.to).title)} is due ${f(x.toDate)}, but it depends on ${esc(nodeOf(m, x.from).title)}, due ${f(x.fromDate)}.`).join(' ')}</div>` : ''}
      ${wait.length && n.status !== 'done' ? `<div class="explain v">${I('lock', 15)} <b>Waiting on ${wait.length === 1 ? 'one task' : wait.length + ' tasks'}:</b> ${wait.map(x => esc(x.title)).join(', ')}. Finish ${wait.length === 1 ? 'it' : 'them'} first.</div>` : ''}
      <section><b>Details</b>
        <label class="f">Title<input type="text" id="iTitle" value="${esc(n.title)}" maxlength="80"></label>
        <div class="row2"><label class="f">Status<select id="iSt">${Object.keys(ST).map(s => `<option value="${s}"${n.status === s ? ' selected' : ''}>${ST[s].label}</option>`).join('')}</select></label>
          <label class="f">Category<select id="iCat">${Object.keys(C).map(k => `<option value="${k}"${n.category === k ? ' selected' : ''}>${C[k].label}</option>`).join('')}</select></label></div>
        <label class="f">Description<textarea id="iDesc">${esc(n.description)}</textarea></label></section>
      <section><b>Date</b>
        <div class="row2"><label class="f">Date rule<select id="iRule"><option value="fixed"${n.rule.kind === 'fixed' ? ' selected' : ''}>Fixed</option><option value="flexible"${n.rule.kind === 'flexible' ? ' selected' : ''}>Flexible</option>${n.type !== 'milestone' && otherAnchors.length ? `<option value="relative"${n.rule.kind === 'relative' ? ' selected' : ''}>Relative to milestone</option>` : ''}</select></label>
        ${n.rule.kind === 'relative' ? `<label class="f">Days from ${esc(anchor ? anchor.title : 'milestone')}<input type="number" id="iOff" value="${n.rule.offset}" step="1" min="-730" max="730"><small>Negative means before.</small></label>` : `<label class="f">Due date<input type="date" id="iDate" value="${n.rule.date || ''}"></label>`}</div>
        <div class="explain ${n.rule.kind === 'fixed' ? 'v' : ''}">${rel}${dependents.length ? ` ${dependents.length} ${dependents.length === 1 ? 'task is' : 'tasks are'} timed relative to this date.` : ''}</div>
        <label class="f">Cost estimate (€) <small>Your own estimate. Leave empty if unknown.</small><input type="number" id="iCost" min="0" step="10" value="${typeof n.cost === 'number' ? n.cost : ''}" placeholder="No estimate yet"></label>
        <button class="btn p sm" data-act="saveNode" style="justify-self:start">${I('check', 15)}Save changes</button></section>
      <section><b>Depends on (${before.length})</b>
        ${before.length ? before.map(x => `<div class="dep">${I('arrow', 15)}<span class="sp"><a data-act="sel" data-n="${x.n.id}">${esc(x.n.title)}</a> ${x.e.relation === 'informational' ? '<span class="muted">· info link</span>' : ''}</span>${stTag(x.n.status)}<button class="btn icon sm q" data-act="rmDep" data-e="${x.e.id}" aria-label="Remove dependency on ${esc(x.n.title)}">${I('x', 15)}</button></div>`).join('') : '<p class="muted" style="font-size:.86rem">Nothing has to happen before this.</p>'}
        <div style="display:flex;gap:8px"><label class="sr" for="iAddDep">Add a task this depends on</label><select id="iAddDep"><option value="">Add: depends on…</option>${m.nodes.filter(x => x.id !== n.id && !before.find(b => b.n.id === x.id)).map(x => `<option value="${x.id}">${esc(x.title)}</option>`).join('')}</select><button class="btn sm" data-act="addDep">Add</button></div></section>
      <section><b>Needed for (${after.length})</b>
        ${after.length ? after.map(x => `<div class="dep">${I('arrowUR', 15)}<span class="sp"><a data-act="sel" data-n="${x.n.id}">${esc(x.n.title)}</a> ${x.e.relation === 'informational' ? '<span class="muted">· info link</span>' : ''}</span><button class="btn icon sm q" data-act="rmDep" data-e="${x.e.id}" aria-label="Remove link to ${esc(x.n.title)}">${I('x', 15)}</button></div>`).join('') : '<p class="muted" style="font-size:.86rem">No task waits for this one.</p>'}
        ${dn.length > after.length ? `<p class="muted" style="font-size:.84rem">Further downstream: ${dn.filter(x => !after.find(a => a.n.id === x.id)).map(x => esc(x.title)).join(', ')}.</p>` : ''}</section>
      <section><b>Checklist</b>
        ${(n.checklist || []).map((it, i) => `<label class="chk${it.done ? ' done' : ''}"><input type="checkbox" data-act="chk" data-i="${i}" ${it.done ? 'checked' : ''}><span>${esc(it.t)}</span></label>`).join('') || '<p class="muted" style="font-size:.86rem">No checklist items yet.</p>'}
        <form id="chkF" style="display:flex;gap:8px"><label class="sr" for="chkIn">New checklist item</label><input type="text" id="chkIn" placeholder="Add an item" maxlength="80"><button class="btn sm" type="submit">Add</button></form></section>
      <section><b>Attachments</b><p class="muted" style="font-size:.86rem">File attachments need secure storage and are not part of this concept.</p></section>
      <div style="display:flex;flex-wrap:wrap;gap:8px;border-top:1px solid var(--line);padding-top:14px">${n.status !== 'done' ? `<button class="btn sm" data-act="done" data-m="${m.id}" data-n="${n.id}">${I('check', 15)}Mark done</button>` : ''}${n.type !== 'milestone' ? `<button class="btn sm" data-act="delNode">${I('trash', 15)}Delete task</button>` : ''}</div>
    </div>`;
    $('#chkF').addEventListener('submit', e => { e.preventDefault(); const t = $('#chkIn').value.trim(); if (!t) return; snapshot(m); (n.checklist = n.checklist || []).push({ t, done: false }); touch(m); inspector(m); $('#chkIn') && $('#chkIn').focus(); });
    const ruleSel = $('#iRule'); ruleSel.addEventListener('change', () => {
      snapshot(m); const k = ruleSel.value, cur = d[n.id] || main(m) && d[main(m).id];
      if (k === 'relative') { const a = otherAnchors[0]; n.rule = { kind: 'relative', anchor: a.id, offset: cur && d[a.id] ? D.diff(d[a.id], cur) : -14 }; }
      else n.rule = { kind: k, date: cur || TODAY };
      touch(m); paintGraph(m); inspector(m); toast('Date rule changed', () => undoMap(m));
    });
  }
  function saveNode(m) {
    const n = nodeOf(m, ui.sel); if (!n) return;
    const title = $('#iTitle').value.trim(); if (!title) { toast('A task needs a title.'); $('#iTitle').focus(); return; }
    const dateEl = $('#iDate'), offEl = $('#iOff'), costEl = $('#iCost');
    if (dateEl && dateEl.value && !D.valid(dateEl.value)) { toast('Enter a valid date.'); dateEl.focus(); return; }
    snapshot(m);
    const old = n.status;
    n.title = title; n.status = $('#iSt').value; n.category = $('#iCat').value; n.description = $('#iDesc').value;
    if (dateEl) n.rule = Object.assign({}, n.rule, { date: dateEl.value || undefined });
    if (offEl) { const v = parseInt(offEl.value, 10); if (!isNaN(v)) n.rule.offset = Math.max(-730, Math.min(730, v)); }
    n.cost = costEl.value === '' ? undefined : Math.max(0, Number(costEl.value));
    log(`Edited “${n.title}”${old !== n.status ? ` (${ST[n.status].label})` : ''}`, m.id); touch(m);
    paintGraph(m); inspector(m); toast('Saved. Map, list and timeline are updated.', () => undoMap(m));
  }
  function undoMap(m) { const u = ui.undo[m.id] || []; if (!u.length) return; (ui.redo[m.id] = ui.redo[m.id] || []).push(JSON.stringify(m)); const nm = restore(m, u.pop()); rerender(nm); toast('Undone'); }
  function redoMap(m) { const r = ui.redo[m.id] || []; if (!r.length) return; (ui.undo[m.id] = ui.undo[m.id] || []).push(JSON.stringify(m)); const nm = restore(m, r.pop()); rerender(nm); toast('Redone'); }
  function rerender(m) { if (location.hash === '#map-' + m.id && graph && (ui.mode[m.id] || 'map') === 'map') { paintGraph(m); inspector(m); refreshTools(m); graph.d.map.nodes.forEach(n => { graph.pos[n.id] = { x: n.x, y: n.y }; }); graph.layout(); } else route(); }

  async function addDependency(m) {
    const from = $('#iAddDep').value; if (!from) { toast('Pick a task first.'); return; }
    const to = ui.sel, a = nodeOf(m, from), b = nodeOf(m, to);
    if (NX.wouldCycle(m.deps, from, to)) { await dialog({ title: 'This would create a loop', body: `${esc(a.title)} already depends on ${esc(b.title)}, directly or through other tasks. A task cannot wait for itself, so this link was not added.`, actions: [{ v: true, t: 'OK', p: true }] }); return; }
    const r = await dialog({ title: 'Add dependency?', body: `<b>${esc(b.title)}</b> will depend on <b>${esc(a.title)}</b>. On the map the arrow points from ${esc(a.title)} to ${esc(b.title)}.`, html: `<label class="f">Type<select id="dRel"><option value="finish_to_start">Must finish before</option><option value="informational">Related, for information only</option></select></label>`, actions: [{ v: false, t: 'Cancel' }, { v: true, t: 'Add dependency', p: true }], collect: x => $('#dRel', x).value });
    if (!r.v) return;
    snapshot(m); m.deps.push({ id: NXD.uid('e'), from, to, relation: r.form }); log(`Linked “${b.title}” to “${a.title}”`, m.id); touch(m); paintGraph(m); inspector(m); toast('Dependency added', () => undoMap(m));
  }
  async function removeDependency(m, eid) {
    const e = m.deps.find(x => x.id === eid); if (!e) return;
    const a = nodeOf(m, e.from), b = nodeOf(m, e.to);
    const ok = await dialog({ title: 'Remove dependency?', body: `${esc(b.title)} will no longer depend on ${esc(a.title)}.`, actions: [{ v: false, t: 'Cancel' }, { v: true, t: 'Remove', p: true }] });
    if (!ok) return; snapshot(m); m.deps = m.deps.filter(x => x.id !== eid); touch(m); paintGraph(m); inspector(m); toast('Dependency removed', () => undoMap(m));
  }
  function addNode(m, preset) {
    snapshot(m);
    const ms = main(m), b = graph ? graph.bounds() : { x0: 0, y0: 0, w: 600, h: 400 };
    const n = Object.assign({ id: m.id + '_' + NXD.uid('n'), title: 'New task', description: '', type: 'task', category: 'research', status: 'todo', rule: { kind: 'relative', anchor: ms.id, offset: -30 }, x: Math.round(b.x0 + b.w / 2 - 116), y: Math.round(b.y0 + b.h + 40), priority: 'medium', notes: '', checklist: [] }, preset || {});
    m.nodes.push(n);
    if (preset && preset.linkTo) { m.deps.push({ id: NXD.uid('e'), from: n.id, to: preset.linkTo, relation: 'finish_to_start' }); delete n.linkTo; }
    log(`Added “${n.title}”`, m.id); touch(m); return n;
  }
  async function deleteNode(m) {
    const n = nodeOf(m, ui.sel); if (!n) return;
    const deps = m.deps.filter(e => e.from === n.id || e.to === n.id).length;
    const rels = m.nodes.filter(x => x.rule.kind === 'relative' && x.rule.anchor === n.id).length;
    const ok = await dialog({ title: `Delete “${n.title}”?`, body: `${deps ? `${deps} ${deps === 1 ? 'link' : 'links'} will be removed. ` : ''}${rels ? `${rels} tasks timed from it will keep their current dates as fixed dates. ` : ''}You can undo.`, actions: [{ v: false, t: 'Cancel' }, { v: true, t: 'Delete task', p: true }] });
    if (!ok) return;
    snapshot(m); const d = datesOf(m);
    m.nodes.forEach(x => { if (x.rule.kind === 'relative' && x.rule.anchor === n.id) x.rule = { kind: 'fixed', date: d[x.id] }; });
    m.nodes = m.nodes.filter(x => x.id !== n.id); m.deps = m.deps.filter(e => e.from !== n.id && e.to !== n.id);
    ui.sel = null; log(`Deleted “${n.title}”`, m.id); touch(m); paintGraph(m); inspector(m); refreshTools(m); toast('Task deleted', () => undoMap(m));
  }

  /* contextual 3-step tour, skippable */
  function tour(m) {
    const steps = [['This is your main milestone', `${main(m).title} sits at the end of the map. Tasks with a link icon are timed relative to it.`], ['Click any task', 'The panel shows what it depends on, what waits for it, and why its date is what it is.'], ['Try What If?', 'Change the milestone date and preview what moves. Nothing changes until you apply.']];
    let i = 0;
    const el = document.createElement('div'); el.className = 'g-ui card'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Quick tour');
    el.style.cssText = 'right:14px;top:14px;width:min(300px,calc(100% - 28px));padding:16px;display:grid;gap:8px;z-index:6';
    const draw = () => { el.innerHTML = `<span class="kick">Quick tour · ${i + 1} of 3</span><b style="font-family:var(--fh);font-size:1.02rem">${steps[i][0]}</b><p class="muted" style="font-size:.88rem">${esc(steps[i][1])}</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn sm q" data-t="skip">Skip tour</button><button class="btn sm p" data-t="next">${i < 2 ? 'Next' : 'Done'}</button></div>`; };
    draw();
    el.addEventListener('click', e => { const t = e.target.closest('[data-t]'); if (!t) return; if (t.dataset.t === 'next' && i < 2) { i++; draw(); if (i === 1 && graph) graph.center(main(m).id); return; } S.prefs.tourDone = true; save(); el.remove(); });
    $('.canvas-wrap').appendChild(el);
  }

  /* ---------- LIST ---------- */
  function listView(m) {
    const d = datesOf(m), body = $('#mbody'); body.style.display = 'block';
    const conf = new Set(NX.conflicts(m.nodes, m.deps, d).map(c => c.to));
    const F = [['all', 'All'], ['needs_review', 'Needs review'], ['todo', 'To do'], ['in_progress', 'In progress'], ['waiting', 'Waiting on others'], ['done', 'Done']];
    let rows = m.nodes.filter(n => ui.listF === 'all' ? true : ui.listF === 'waiting' ? n.status !== 'done' && waitingOn(m, n.id).length : ui.listF === 'needs_review' ? n.status === 'needs_review' || conf.has(n.id) : n.status === ui.listF);
    const pr = { high: 0, medium: 1, low: 2 };
    rows.sort((a, b) => ui.listSort === 'priority' ? (pr[a.priority] ?? 1) - (pr[b.priority] ?? 1) || (d[a.id] || '9').localeCompare(d[b.id] || '9') : (d[a.id] || '9999').localeCompare(d[b.id] || '9999'));
    body.innerHTML = `<div class="listv"><div class="toolbar" style="margin:0"><div role="group" aria-label="Filter tasks" style="display:flex;flex-wrap:wrap;gap:6px">${F.map(([k, t]) => `<button class="chip" aria-pressed="${ui.listF === k}" data-act="listF" data-v="${k}">${t}</button>`).join('')}</div><span class="sp"></span>
      <label class="f" style="display:flex;align-items:center;gap:8px;font-weight:500">Sort<select id="lSort" style="width:auto"><option value="date"${ui.listSort === 'date' ? ' selected' : ''}>Due date</option><option value="priority"${ui.listSort === 'priority' ? ' selected' : ''}>Priority</option></select></label>
      <button class="btn sm" data-act="addNodeList">${I('plus', 15)}Add task</button></div>
      ${rows.length ? `<div class="tbl-wrap"><table class="t"><caption class="sr">Tasks in ${esc(m.title)}</caption><thead><tr><th scope="col"><span class="sr">Done</span></th><th scope="col">Task</th><th scope="col">Status</th><th scope="col">Due</th><th scope="col">Rule</th><th scope="col">Depends on</th></tr></thead><tbody>
      ${rows.map(n => { const w = waitingOn(m, n.id); return `<tr class="${n.status === 'done' ? 'is-done' : ''}"><td><input type="checkbox" aria-label="Mark ${esc(n.title)} done" data-act="tick" data-n="${n.id}" ${n.status === 'done' ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--primary)"></td>
        <td class="tt"><button class="lk" data-act="openList" data-n="${n.id}">${esc(n.title)}</button><div>${catDot(n.category)}${conf.has(n.id) ? ` <span class="tag t-conf">${I('split', 12)}Order conflict</span>` : ''}</div></td>
        <td><label class="sr" for="ls-${n.id}">Status of ${esc(n.title)}</label><select id="ls-${n.id}" data-act="lstatus" data-n="${n.id}">${Object.keys(ST).map(s => `<option value="${s}"${n.status === s ? ' selected' : ''}>${ST[s].label}</option>`).join('')}</select></td>
        <td>${n.rule.kind === 'relative' ? `<span class="tabnum">${f(d[n.id])}</span>` : `<label class="sr" for="ld-${n.id}">Due date of ${esc(n.title)}</label><input type="date" id="ld-${n.id}" data-act="ldate" data-n="${n.id}" value="${n.rule.date || ''}">`}${d[n.id] && d[n.id] < TODAY && n.status !== 'done' ? ` <span class="tag t-rev">${I('clock', 12)}Overdue</span>` : ''}</td>
        <td>${n.rule.kind === 'relative' ? `<span class="tag t-shift">${I('link', 12)}${n.rule.offset}d from ${esc((nodeOf(m, n.rule.anchor) || {}).title || '?')}</span>` : n.rule.kind === 'fixed' ? `<span class="tag t-mut">${I('lock', 12)}Fixed</span>` : '<span class="tag t-mut">Flexible</span>'}</td>
        <td>${w.length && n.status !== 'done' ? `<span class="tag t-demo">${I('lock', 12)}Waiting on ${esc(w[0].title)}${w.length > 1 ? ' +' + (w.length - 1) : ''}</span>` : prereqs(m, n.id).length ? '<span class="tag t-ok">' + I('check', 12) + 'Ready</span>' : '<span class="muted">—</span>'}</td></tr>`; }).join('')}</tbody></table></div>`
        : `<div class="empty"><h3>No tasks match this filter</h3><p class="muted">${ui.listF === 'needs_review' ? 'Nothing needs review. Items flagged by What If? or marked by you appear here.' : 'Try another filter.'}</p><button class="btn" data-act="listF" data-v="all">Show all tasks</button></div>`}
      <p class="muted" style="font-size:.82rem">Relative dates follow their milestone. To change one, edit the offset in the task details or change the milestone.</p></div><aside class="insp" id="insp" ${ui.sel ? '' : 'hidden'} aria-label="Task details"></aside>`;
    $('#lSort').addEventListener('change', e => { ui.listSort = e.target.value; listView(m); });
    if (ui.sel) inspector(m);
  }

  /* ---------- TIMELINE (map + global) ---------- */
  function tlItems(list) {
    const groups = {};
    list.forEach(it => { const k = it.d ? it.d.slice(0, 7) : 'none'; (groups[k] = groups[k] || []).push(it); });
    return Object.keys(groups).sort((a, b) => a === 'none' ? 1 : b === 'none' ? -1 : a.localeCompare(b)).map(k => `<section class="tl-m"><h3>${k === 'none' ? 'No date yet' : new Date(D.toN(k + '-01') * 864e5).toLocaleDateString(NXL.loc(), { timeZone: 'UTC', month: 'long', year: 'numeric' })}</h3>
      ${groups[k].map(({ n, d, m }) => { const w = waitingOn(m, n.id); return `<div class="tl-i" style="--c:${(C[n.category] || C.research).color}"><time class="tabnum">${d ? D.short(d) : '—'}</time><span class="ln" aria-hidden="true"></span><button class="tl-c" data-act="openTl" data-m="${m.id}" data-n="${n.id}"><b>${esc(n.title)}${n.type === 'milestone' ? ' ⚑' : ''}</b><span style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">${stTag(n.status)}${catDot(n.category)}${d && d < TODAY && n.status !== 'done' ? `<span class="tag t-rev">${I('clock', 12)}Overdue</span>` : ''}</span>${w.length && n.status !== 'done' ? `<small>Waiting on ${w.map(x => esc(x.title)).join(', ')}</small>` : ''}${S.maps.length > 1 && ui.tlShowMap ? `<small>${esc(m.title)}</small>` : ''}</button></div>`; }).join('')}</section>`).join('');
  }
  function tlView(m) {
    const d = datesOf(m), body = $('#mbody'); body.style.display = 'block';
    ui.tlShowMap = false;
    body.innerHTML = `<div class="listv"><div class="tl">${tlItems(m.nodes.map(n => ({ n, d: d[n.id], m })).sort((a, b) => (a.d || '9999').localeCompare(b.d || '9999')))}</div></div><aside class="insp" id="insp" ${ui.sel ? '' : 'hidden'} aria-label="Task details"></aside>`;
    if (ui.sel) inspector(m);
  }
  function timeline() {
    setTop('<h1>Timeline</h1>');
    const act = S.maps.filter(m => m.status === 'active' || m.status === 'draft');
    const list = act.filter(m => ui.tlMap === 'all' || m.id === ui.tlMap).flatMap(m => { const d = datesOf(m); return m.nodes.filter(n => n.status !== 'done').map(n => ({ n, d: d[n.id], m })); }).sort((a, b) => (a.d || '9999').localeCompare(b.d || '9999'));
    const over = list.filter(x => x.d && x.d < TODAY).length, week = list.filter(x => x.d && x.d >= TODAY && D.diff(TODAY, x.d) <= 7).length;
    ui.tlShowMap = true;
    $('#view').innerHTML = `<div class="toolbar"><div role="group" aria-label="Filter by plan" style="display:flex;flex-wrap:wrap;gap:6px"><button class="chip" aria-pressed="${ui.tlMap === 'all'}" data-act="tlMap" data-v="all">All active and draft plans</button>${act.map(m => `<button class="chip" aria-pressed="${ui.tlMap === m.id}" data-act="tlMap" data-v="${m.id}">${esc(m.title)}</button>`).join('')}</div></div>
      <div class="explain" style="margin-bottom:18px">${over ? `<b>${over} overdue.</b> ` : 'Nothing is overdue. '}${week ? `${week} due this week.` : 'Nothing is due this week.'} Open tasks only, ordered by date. Done tasks are hidden.</div>
      ${list.length ? `<div class="tl">${tlItems(list)}</div>` : '<div class="empty"><h3>No open tasks</h3><a class="btn p" href="#new">Create a plan</a></div>'}`;
  }

  /* ---------- WHAT IF? ---------- */
  function whatIf(id) {
    const m = getMap(id); if (!m) return notFound();
    const base = datesOf(m), milestones = m.nodes.filter(n => n.type === 'milestone');
    if (!ui.wi || ui.wi.mapId !== id) ui.wi = { mapId: id, anchor: main(m).id, date: D.add(base[main(m).id], 31) };
    const W = ui.wi; if (!W.anchor || !nodeOf(m, W.anchor)) W.anchor = main(m).id;
    if (W.budget === undefined) W.budget = m.budget;
    if (!W.view) W.view = 'scenario';
    setTop(`<a class="crumb" href="#map-${id}">${I('chevL', 16)}<span>${esc(m.title)}</span></a><h1>What If?</h1>`, `<span class="tag t-demo">${I('branch', 13)}Draft scenario · not applied</span>`);
    const v = $('#view'); v.className = 'full';
    const a = nodeOf(m, W.anchor), b0 = base[a.id];
    v.innerHTML = `<div class="wi"><div class="wi-c"><div id="wg" style="position:absolute;inset:0"></div><div class="g-ui legend" style="max-width:300px"><b>IN THIS PREVIEW</b><div><span class="tag t-shift">${I('arrow', 12)}Date moves</span> relative rule</div><div><span class="tag t-rev">${I('eye', 12)}Review</span> check by hand</div><div><span class="tag t-conf">${I('split', 12)}Conflict</span> order broken</div></div>
        <div class="g-ui mtools"><div class="grp"><button class="btn icon sm" data-act="zoomOut" aria-label="Zoom out">${I('minus', 16)}</button><button class="btn icon sm" data-act="zoomIn" aria-label="Zoom in">${I('plus', 16)}</button><button class="btn icon sm" data-act="fit" aria-label="Fit to view">${I('fit', 16)}</button></div><div class="seg" role="group" aria-label="Show on map" style="background:#fff;box-shadow:var(--sh-1)"><button aria-pressed="${W.view === 'baseline'}" data-act="wView" data-v="baseline">Baseline</button><button aria-pressed="${W.view === 'scenario'}" data-act="wView" data-v="scenario">Scenario</button></div></div></div>
      <aside class="wi-side" aria-label="Scenario"><div class="wi-in wi-inputs">
        <div><span class="kick">Scenario input</span><h2 style="font-size:1.2rem;margin-top:4px">Change a date, see the ripple</h2></div>
        ${milestones.length > 1 ? `<label class="f">Milestone<select id="wAnchor">${milestones.map(x => `<option value="${x.id}"${x.id === W.anchor ? ' selected' : ''}>${esc(x.title)}</option>`).join('')}</select></label>` : ''}
        <div class="row2"><div class="explain v" style="padding:10px 12px">Baseline<br><b>${f(b0)}</b></div><label class="f">New date for ${esc(a.title)}<input type="date" id="wDate" value="${W.date}"></label></div>
        <div class="scrub"><label class="f" for="wRange" style="margin:0">Scrub from baseline <small id="wDelta"></small></label><input type="range" id="wRange" min="-60" max="120" step="1" value="${D.diff(b0, W.date)}"><div class="ends"><span>−60 days</span><span>Baseline</span><span>+120 days</span></div></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px"><button class="btn sm" data-act="wQuick" data-v="-14">−2 weeks</button><button class="btn sm" data-act="wQuick" data-v="31">+1 month</button><button class="btn sm" data-act="wQuick" data-v="0">Reset</button></div>
        <label class="f">Available budget (€) <small>Optional assumption for this scenario.</small><input type="number" id="wBudget" min="0" step="100" value="${W.budget != null ? W.budget : ''}" placeholder="Not set"></label>
        <p class="muted" style="font-size:.78rem">Calculated from the dependencies and date rules in your plan. Not a prediction: NEXORA cannot know rules set by other people or institutions. The baseline stays untouched while you explore.</p>
      </div><div class="wi-in" id="wImpact" aria-live="polite"></div>
        <div class="wi-acts"><button class="btn" data-act="wDiscard">${I('x', 15)}Discard</button><button class="btn" data-act="wSave">${I('copy', 15)}Save scenario</button><button class="btn p" data-act="wApply">${I('check', 15)}Apply selected…</button></div></aside></div>`;
    graph = new NXGraph($('#wg'), { readonly: true, onSelect: nid => { const el = nid && $(`#imp-${nid}`); if (el) { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); el.style.borderColor = 'var(--primary)'; setTimeout(() => { el.style.borderColor = ''; }, 900); } } });
    const upd = (anim) => wiUpdate(m, anim);
    $('#wDate').addEventListener('change', e => { if (!D.valid(e.target.value)) { toast('Enter a valid date.'); return; } W.date = e.target.value; $('#wRange').value = Math.max(-60, Math.min(120, D.diff(b0, W.date))); upd(true); });
    let rq; $('#wRange').addEventListener('input', e => { W.date = D.add(b0, +e.target.value); $('#wDate').value = W.date; cancelAnimationFrame(rq); rq = requestAnimationFrame(() => upd(false)); });
    $('#wRange').addEventListener('change', () => upd(true));
    $('#wBudget').addEventListener('input', e => { W.budget = e.target.value === '' ? null : Math.max(0, Number(e.target.value)); renderImpact(m); });
    const an = $('#wAnchor'); an && an.addEventListener('change', e => { W.anchor = e.target.value; W.date = D.add(base[W.anchor], 31); W.sel = null; whatIf(id); });
    upd(true);
  }
  function wiSim(m) { const W = ui.wi, ov = {}; if (W.date !== datesOf(m)[W.anchor]) ov[W.anchor] = { rule: { kind: 'fixed', date: W.date } }; return { ov, sim: NX.simulate(m, ov, S.prefs.dateFmt) }; }
  function wiUpdate(m, anim) {
    const W = ui.wi, { sim } = wiSim(m);
    W.lastSim = sim;
    if (!W.sel || W.selFor !== W.date) { W.sel = new Set(sim.items.filter(i => i.kinds.includes('shift') || i.kinds.includes('manual') || i.kinds.includes('chain') || i.kinds.includes('conflict')).map(i => i.id).filter(x => x !== W.anchor)); W.selFor = W.date; }
    const delta = D.diff(datesOf(m)[W.anchor], W.date); $('#wDelta').textContent = delta === 0 ? '(same as baseline)' : `(${delta > 0 ? '+' : ''}${delta} days)`;
    const showS = W.view === 'scenario';
    const hl = {}, offsets = {};
    if (showS) sim.items.forEach(it => { hl[it.id] = it.severity === 'source' ? 'source' : it.kinds.includes('conflict') ? 'conflict' : it.kinds.includes('shift') ? 'shift' : 'review'; if (it.kinds.includes('shift') || it.kinds.includes('source')) offsets[it.id] = Math.max(-36, Math.min(36, Math.round(it.delta * 0.9))); });
    const confE = new Set(showS ? sim.conflicts.map(c => c.edge) : []);
    const lit = new Set(showS ? sim.litEdges : []);
    const rays = showS ? sim.items.filter(i => i.kinds.includes('shift')).map(i => i.id) : [];
    const shown = Object.assign({}, m, { nodes: m.nodes });
    const first = !graph.d;
    graph.set({ map: shown, dates: showS ? sim.draft : sim.base, hl, lit, rays, confEdges: confE, offsets: graph.d ? graph.d.offsets : {}, fmt: s => D.fmt(s) });
    const ms = (S.prefs.reducedMotion || matchMedia('(prefers-reduced-motion:reduce)').matches) ? 0 : (anim ? 650 : 0);
    graph.animateTo(offsets, first ? 0 : ms);
    renderImpact(m);
  }
  function renderImpact(m) {
    const W = ui.wi, sim = W.lastSim; if (!sim) return;
    const box = $('#wImpact'), anchor = nodeOf(m, W.anchor);
    const shifts = sim.items.filter(i => i.kinds.includes('shift')), manual = sim.items.filter(i => i.kinds.includes('manual')), chain = sim.items.filter(i => i.kinds.includes('chain') && !i.kinds.includes('shift')), confl = sim.items.filter(i => i.kinds.includes('conflict'));
    const reviewN = new Set([...manual, ...chain].map(i => i.id)).size;
    const unchanged = sim.unchanged.length;
    const bBase = budgetOf(m, m.budget), bScen = budgetOf(m, W.budget);
    const saved = m.scenarios || [];
    const item = it => {
      const k = it.kinds, tags = [k.includes('source') ? `<span class="tag t-src">${I('branch', 12)}Your change</span>` : '', k.includes('shift') ? `<span class="tag t-shift">${I('arrow', 12)}Date moves ${it.delta > 0 ? '+' : ''}${it.delta}d</span>` : '', k.includes('manual') ? `<span class="tag t-rev">${I('eye', 12)}Needs manual review</span>` : '', k.includes('chain') ? `<span class="tag t-rev">${I('link', 12)}Upstream changed</span>` : '', k.includes('conflict') ? `<span class="tag t-conf">${I('split', 12)}Potential conflict</span>` : ''].join('');
      const canSel = !k.includes('source');
      const lbl = k.includes('shift') ? 'Accept the new date' : 'Mark as Needs review';
      return `<div class="imp-i sev-${it.severity}" id="imp-${it.id}"><div class="h">${canSel ? `<input type="checkbox" data-act="wSel" data-n="${it.id}" ${W.sel.has(it.id) ? 'checked' : ''} aria-label="${lbl}: ${esc(it.title)}" title="${lbl}">` : ''}<span class="sp"><b>${esc(it.title)}</b><span style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${tags}</span></span></div>
        <div class="dates tabnum">${it.baseDate !== it.draftDate ? `<s>${f(it.baseDate)}</s>${I('arrow', 14)}<b>${f(it.draftDate)}</b>` : `<span>${f(it.baseDate)}</span><span class="muted">· date unchanged</span>`}</div>
        <div class="why"><em>Why this changed</em>${it.reasons.map(esc).join(' ')}</div>${it.chain && it.chain.length > 2 ? `<div class="chain">Chain: ${it.chain.map(esc).join(' → ')}</div>` : ''}</div>`;
    };
    const noChange = W.date === datesOf(m)[W.anchor];
    box.innerHTML = noChange ? `<div class="ans"><p>This is the baseline date. Pick another date to preview the impact.</p><small>Based on the dependencies in your plan.</small></div>${saved.length ? compareHTML(m) : ''}` : `
      <div class="ans"><p>Moving ${esc(anchor.title)} to ${f(W.date)} changes ${shifts.length} relative ${shifts.length === 1 ? 'task' : 'tasks'}${reviewN ? ` and puts ${reviewN} linked ${reviewN === 1 ? 'item' : 'items'} into review` : ''}${confl.length ? `. ${confl.length} ${confl.length === 1 ? 'task now has' : 'tasks now have'} an order conflict` : ''}.</p>
        <small>Based on the dependencies in your plan. ${unchanged} ${unchanged === 1 ? 'item is' : 'items are'} unchanged. Fixed dates never move on their own.</small></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px"><span class="tag t-shift">${I('arrow', 12)}${shifts.length} date changes</span><span class="tag t-rev">${I('eye', 12)}${reviewN} to review</span><span class="tag t-conf">${I('split', 12)}${confl.length} conflicts</span><span class="tag t-mut">${unchanged} unchanged</span></div>
      <section class="imp" aria-label="Impact list"><span class="kick">Impact, most urgent first · ticked items are included when you apply</span>${sim.items.map(item).join('')}</section>
      ${W.budget != null || m.budget != null ? `<section class="card pad" style="display:grid;gap:8px"><span class="kick">Budget assumption</span><div class="money">
        <div class="r"><span>Your estimates</span><b>${money(bScen.sum)}</b></div><div class="r"><span>Contingency (${bScen.pct}%)</span><b>${money(bScen.cont)}</b></div><hr>
        <div class="r"><span>Baseline budget</span><b>${money(bBase.budget)}</b></div><div class="r"><span>Scenario budget</span><b>${money(bScen.budget)}</b></div>
        <div class="r"><span>Scenario ${bScen.gap >= 0 ? 'surplus' : 'shortfall'}</span><b class="${bScen.gap >= 0 ? 'gap-pos' : 'gap-neg'}">${bScen.gap == null ? '—' : (bScen.gap < 0 ? '−' : '+') + money(Math.abs(bScen.gap))}</b></div></div>
        ${bScen.missing.length ? `<div class="explain v">${I('help', 14)} <b>Missing information:</b> ${bScen.missing.length} ${bScen.missing.length === 1 ? 'task has' : 'tasks have'} no cost estimate (${bScen.missing.slice(0, 3).map(x => esc(x.title)).join(', ')}${bScen.missing.length > 3 ? '…' : ''}), so the real total may be higher.</div>` : ''}</section>` : ''}
      ${saved.length ? compareHTML(m) : ''}`;
  }
  function scenStats(m, sc) {
    const ov = { [sc.anchor]: { rule: { kind: 'fixed', date: sc.date } } };
    const sim = NX.simulate(m, ov, S.prefs.dateFmt), bud = budgetOf(m, sc.budget);
    return { sim, shifts: sim.items.filter(i => i.kinds.includes('shift')).length, review: sim.items.filter(i => !i.kinds.includes('shift') && !i.kinds.includes('source')).length, conf: sim.conflicts.length, gap: bud.gap };
  }
  function compareHTML(m) {
    const W = ui.wi, base = datesOf(m), bb = budgetOf(m, m.budget);
    const cols = [{ name: 'Baseline', date: base[W.anchor], st: { shifts: 0, review: 0, conf: NX.conflicts(m.nodes, m.deps, base).length, gap: bb.gap, sim: { draft: base } } }].concat((m.scenarios || []).filter(s => s.anchor === W.anchor).map(s => ({ name: s.name, date: s.date, sc: s, st: scenStats(m, s) })));
    const rows = m.nodes.filter(n => cols.some(c => c.st.sim.draft[n.id] !== base[n.id]));
    return `<section style="display:grid;gap:10px"><span class="kick">Compare saved scenarios</span><div class="cmp"><table><thead><tr><th scope="col"></th>${cols.map(c => `<th scope="col">${esc(c.name)}</th>`).join('')}</tr></thead><tbody>
      <tr><td>${esc(nodeOf(m, W.anchor).title)}</td>${cols.map(c => `<td class="${c.date !== base[W.anchor] ? 'chg' : ''}">${f(c.date)}</td>`).join('')}</tr>
      <tr><td>Date changes</td>${cols.map(c => `<td>${c.st.shifts}</td>`).join('')}</tr><tr><td>To review</td>${cols.map(c => `<td>${c.st.review}</td>`).join('')}</tr><tr><td>Order conflicts</td>${cols.map(c => `<td>${c.st.conf}</td>`).join('')}</tr>
      <tr><td>Budget gap</td>${cols.map(c => `<td>${c.st.gap == null ? '—' : (c.st.gap < 0 ? '−' : '+') + money(Math.abs(c.st.gap))}</td>`).join('')}</tr>
      ${rows.map(n => `<tr><td>${esc(n.title)}</td>${cols.map(c => `<td class="${c.st.sim.draft[n.id] !== base[n.id] ? 'chg' : ''}">${D.short(c.st.sim.draft[n.id])}</td>`).join('')}</tr>`).join('')}
      <tr><td></td>${cols.map(c => c.sc ? `<td><button class="btn sm" data-act="wLoad" data-s="${c.sc.id}">Open</button> <button class="btn icon sm q" data-act="wDel" data-s="${c.sc.id}" aria-label="Delete scenario ${esc(c.name)}">${I('trash', 14)}</button></td>` : '<td></td>').join('')}</tr></tbody></table></div></section>`;
  }
  async function wiSave(m) {
    const W = ui.wi; if (W.date === datesOf(m)[W.anchor]) { toast('Pick a date different from the baseline first.'); return; }
    const n = (m.scenarios || []).length;
    const r = await dialog({ title: 'Save this scenario', body: 'Saved scenarios keep your assumptions so you can compare them later. The baseline stays unchanged.', html: `<label class="f">Name<input type="text" id="scName" value="Scenario ${String.fromCharCode(65 + n)}: ${esc(D.short(W.date))}" maxlength="60"></label>`, actions: [{ v: false, t: 'Cancel' }, { v: true, t: 'Save scenario', p: true }], collect: b => $('#scName', b).value.trim() });
    if (!r.v) return;
    (m.scenarios = m.scenarios || []).push({ id: NXD.uid('s'), name: r.form || 'Scenario', anchor: W.anchor, date: W.date, budget: W.budget, createdAt: new Date().toISOString() });
    log(`Saved scenario “${r.form}” for ${m.title}`, m.id); touch(m); renderImpact(m); toast('Scenario saved. The baseline is unchanged.');
  }
  async function wiApply(m) {
    const W = ui.wi, sim = W.lastSim; if (!sim || W.date === datesOf(m)[W.anchor]) { toast('There is nothing to apply. Pick a new date first.'); return; }
    const sel = [...W.sel], shifts = sim.items.filter(i => i.kinds.includes('shift')), acc = shifts.filter(i => W.sel.has(i.id)), keep = shifts.filter(i => !W.sel.has(i.id)), rev = sim.items.filter(i => !i.kinds.includes('shift') && !i.kinds.includes('source') && W.sel.has(i.id));
    const ok = await dialog({ title: 'Apply these changes to your plan?', html: `<div class="money">
      <div class="r"><span>${esc(nodeOf(m, W.anchor).title)}</span><b>${f(datesOf(m)[W.anchor])} → ${f(W.date)}</b></div>
      <div class="r"><span>Relative dates that move</span><b>${acc.length}</b></div>
      <div class="r"><span>Relative dates kept as they are (become fixed)</span><b>${keep.length}</b></div>
      <div class="r"><span>Items marked Needs review</span><b>${rev.length}</b></div></div><p class="muted" style="font-size:.86rem">Fixed dates are not changed. You can undo right after applying.</p>`, actions: [{ v: false, t: 'Cancel' }, { v: true, t: 'Apply changes', p: true }] });
    if (!ok) return;
    const before = JSON.stringify(m), { ov } = wiSim(m);
    const nm = NX.applyScenario(m, ov, sim, sel); nm.updatedAt = new Date().toISOString();
    const i = S.maps.indexOf(m); S.maps[i] = nm;
    (ui.undo[nm.id] = ui.undo[nm.id] || []).push(before);
    log(`Applied What If? to ${nm.title}: ${nodeOf(nm, W.anchor).title} → ${f(W.date)}`, nm.id); save();
    ui.wi = null; ui.dismissed.clear();
    go('app');
    toast('Changes applied. Next step updated.', () => { const cur = getMap(nm.id); const j = S.maps.indexOf(cur); S.maps[j] = JSON.parse(before); save(); route(); toast('Plan restored to the baseline'); });
  }

  /* ---------- INSIGHTS ---------- */
  function insights() {
    setTop('<h1>Insights</h1>');
    const act = S.maps.filter(m => m.status === 'active');
    const rows = act.map(m => {
      const d = datesOf(m);
      return {
        m, d,
        conf: NX.conflicts(m.nodes, m.deps, d).map(c => ({ n: nodeOf(m, c.to), t: `Due ${D.short(c.toDate)}, before ${nodeOf(m, c.from).title} (${D.short(c.fromDate)})` })),
        review: m.nodes.filter(n => n.status === 'needs_review').map(n => ({ n, t: 'Marked Needs review' })),
        waiting: m.nodes.filter(n => n.status !== 'done' && n.type !== 'milestone' && waitingOn(m, n.id).length).map(n => ({ n, t: 'Waiting on ' + waitingOn(m, n.id).map(x => x.title).join(', ') })),
        nodate: m.nodes.filter(n => !d[n.id]).map(n => ({ n, t: 'No due date' })),
        overdue: m.nodes.filter(n => n.status !== 'done' && d[n.id] && d[n.id] < TODAY).map(n => ({ n, t: 'Was due ' + D.short(d[n.id]) })),
        bottle: m.nodes.filter(n => n.status !== 'done' && n.type !== 'milestone').map(n => ({ n, k: downstream(m, n.id).filter(x => x.type !== 'milestone').length })).filter(x => x.k >= 2).sort((a, b) => b.k - a.k).map(x => ({ n: x.n, t: `${x.k} tasks depend on it, directly or later` })),
        done: m.nodes.filter(n => n.status === 'done').map(n => ({ n, t: 'Done' })),
        miles: m.nodes.filter(n => n.type === 'milestone').map(n => ({ n, t: f(d[n.id]) }))
      };
    });
    const card = (key, title, icon, explain, empty) => {
      const items = rows.flatMap(r => r[key].map(x => Object.assign({ m: r.m }, x)));
      return `<section class="card ins-c"><h3>${I(icon, 18)}${title}</h3><span class="num tabnum">${items.length}</span><p class="muted" style="font-size:.86rem">${explain}</p>
        ${items.length ? `<ul>${items.slice(0, 6).map(x => `<li><button data-act="open" data-m="${x.m.id}" data-n="${x.n.id}">${I('chevR', 14)}<span><b style="font-weight:600">${esc(x.n.title)}</b> <span class="muted">· ${esc(x.t)}${act.length > 1 ? ' · ' + esc(x.m.title) : ''}</span></span></button></li>`).join('')}${items.length > 6 ? `<li class="muted" style="font-size:.84rem">and ${items.length - 6} more</li>` : ''}</ul>` : `<p class="muted" style="font-size:.86rem">${empty}</p>`}</section>`;
    };
    $('#view').innerHTML = `<p class="muted" style="margin-bottom:18px;max-width:70ch">Every number here is counted from the tasks, dates and links in your active plans. A risk means a conflict in what you entered, not a prediction.</p>
      <div class="ins">
      ${card('conf', 'Order conflicts', 'split', 'A task is due before something it depends on.', 'No conflicts. Every task is due after the tasks it depends on.')}
      ${card('review', 'Needs review', 'eye', 'Items you or a What If? apply flagged for a manual check.', 'Nothing is flagged for review.')}
      ${card('bottle', 'Bottlenecks', 'layers', 'Open tasks that many others wait for. Finishing them unlocks the most.', 'No task blocks two or more others.')}
      ${card('waiting', 'Waiting on others', 'lock', 'Open tasks whose prerequisites are not done yet.', 'Nothing is waiting.')}
      ${card('overdue', 'Overdue', 'clock', `Open tasks with a date before today (${f(TODAY)}).`, 'Nothing is overdue.')}
      ${card('nodate', 'Missing dates', 'help', 'Tasks without a date cannot be checked for conflicts.', 'Every task has a date.')}
      ${card('miles', 'Upcoming milestones', 'flag', 'Main events of your active plans.', 'No milestones.')}
      ${card('done', 'Completed', 'check', 'Finished tasks across active plans.', 'Nothing completed yet. Start with the next best step on Home.')}
      </div>
      <section class="card pad" style="margin-top:20px;display:grid;gap:12px"><div class="sec-h" style="margin:0"><h2>Plan assistant</h2><span class="tag t-demo">${I('info', 12)}Demo answers · no AI model connected</span></div>
        <p class="muted" style="font-size:.88rem">These answers are assembled by fixed rules from the data in ${esc((act[0] || {}).title || 'your plan')}. A real assistant would need a secure backend.</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px">${[['forgot', 'What might I have forgotten?'], ['first', 'What should I review first?'], ['why', 'Explain the order of my plan'], ['draft', 'Turn a goal into a draft plan']].map(([k, t]) => `<button class="btn sm" data-act="ask" data-v="${k}">${t}</button>`).join('')}</div>
        <div id="askOut" aria-live="polite"></div></section>`;
  }
  function assistant(k) {
    const m = featured(); const out = $('#askOut'); if (!m || !out) return;
    const d = datesOf(m);
    let html = '';
    if (k === 'forgot') {
      const cats = ['housing', 'work', 'documents', 'budget', 'travel'].filter(c => m.template === 'move' && !m.nodes.some(n => n.category === c));
      const rl = reviewList(m).filter(r => r.state === 'open');
      const miss = budgetOf(m).missing;
      html = `<p><b>Possible gaps in “${esc(m.title)}”:</b></p><ul>${cats.map(c => `<li>No ${C[c].label} tasks yet.</li>`).join('')}${rl.map(r => `<li>${esc(r.t)}</li>`).join('')}${miss.length ? `<li>${miss.length} tasks have no cost estimate.</li>` : ''}</ul><p class="muted" style="font-size:.84rem">Suggestions to verify, not a complete list. Check legal, immigration and financial requirements with official sources.</p><button class="btn sm" data-act="review" data-m="${m.id}">Open Things to review</button>`;
    } else if (k === 'first') {
      const s = nextSteps(m).slice(0, 3);
      html = `<ol>${s.map(x => `<li><b>${esc(x.node.title)}</b>: ${esc(x.why)}</li>`).join('')}</ol>`;
    } else if (k === 'why') {
      const ms = main(m), rel = m.nodes.filter(n => n.rule.kind === 'relative');
      html = `<p>${rel.length} tasks are timed from ${esc(ms.title)} (${f(d[ms.id])}): ${rel.map(n => `${esc(n.title)} (${Math.abs(n.rule.offset)} days ${n.rule.offset < 0 ? 'before' : 'after'})`).join(', ')}. ${m.deps.filter(e => e.relation === 'finish_to_start').length} links say which task must finish first. Fixed dates: ${m.nodes.filter(n => n.rule.kind === 'fixed' && n.type !== 'milestone').map(n => esc(n.title)).join(', ') || 'none'}.</p>`;
    } else {
      html = `<p>Pick a life event and a target date. NEXORA copies a template with its tasks, relative dates and links, and you edit it from there.</p><a class="btn sm p" href="#new">Start a draft plan</a>`;
    }
    out.innerHTML = `<div class="explain" style="display:grid;gap:8px">${html}<small class="muted">Demo answer from your plan data.</small></div>`;
  }

  /* ---------- THINGS TO REVIEW / BUDGET dialogs ---------- */
  async function reviewDialog(m) {
    const list = reviewList(m);
    const d = datesOf(m), miss = m.nodes.filter(n => !d[n.id]), est = budgetOf(m).missing;
    const cats = m.template === 'move' ? ['housing', 'work', 'documents', 'budget', 'travel'].filter(c => !m.nodes.some(n => n.category === c)) : [];
    const draw = () => `<p class="muted" style="font-size:.88rem">Suggestions to verify. This is not a complete list, and NEXORA does not supply legal, immigration or financial requirements.</p>
      <div style="display:grid;gap:8px">${list.map(r => `<div class="dep" style="align-items:flex-start;${r.state !== 'open' ? 'opacity:.6' : ''}"><span class="sp">${esc(r.t)} <span class="muted">· ${C[r.cat].label}</span>${r.state === 'added' ? ' <span class="tag t-ok">Added as task</span>' : r.state === 'dismissed' ? ' <span class="tag t-mut">Not relevant</span>' : ''}</span>
        ${r.state === 'open' ? `<button class="btn sm" data-r="add" data-i="${r.id}">Add as task</button><button class="btn sm q" data-r="no" data-i="${r.id}">Not relevant</button>` : `<button class="btn sm q" data-r="re" data-i="${r.id}">Reopen</button>`}</div>`).join('')}</div>
      ${miss.length || est.length || cats.length ? `<div class="explain v" style="display:grid;gap:4px"><b>Missing information</b>${cats.map(c => `<span>No ${C[c].label} tasks in this plan.</span>`).join('')}${miss.length ? `<span>${miss.length} ${miss.length === 1 ? 'task has' : 'tasks have'} no date: ${miss.map(n => esc(n.title)).join(', ')}.</span>` : ''}${est.length ? `<span>${est.length} ${est.length === 1 ? 'task has' : 'tasks have'} no cost estimate.</span>` : ''}</div>` : ''}`;
    const host = document.createElement('div');
    const p = dialog({ title: 'Things to review', html: `<div id="rvBox">${draw()}</div>`, actions: [{ v: true, t: 'Done', p: true }] });
    setTimeout(() => {
      const box = $('#rvBox'); if (!box) return;
      box.addEventListener('click', e => {
        const b = e.target.closest('[data-r]'); if (!b) return; const r = list.find(x => x.id === b.dataset.i);
        if (b.dataset.r === 'add') { const n = addNode(m, { title: r.t.split('?')[0].split(':')[0].replace(/\.$/, '').slice(0, 60), category: r.cat, description: r.t + ' (Added from Things to review. Verify details yourself.)', linkTo: main(m).id }); r.state = 'added'; r.node = n.id; toast(`Added “${n.title}” to the map`); }
        if (b.dataset.r === 'no') r.state = 'dismissed';
        if (b.dataset.r === 're') r.state = 'open';
        touch(m); box.innerHTML = draw();
      });
    }, 40);
    await p; route();
    void host;
  }
  async function budgetDialog(m) {
    const b = budgetOf(m);
    const r = await dialog({ title: 'Budget', body: 'All amounts are your own estimates. NEXORA only adds them up.', html: `<div class="row2"><label class="f">Available budget (€)<input type="number" id="bAv" min="0" step="100" value="${m.budget != null ? m.budget : ''}" placeholder="Not set"></label><label class="f">Contingency (%)<input type="number" id="bCo" min="0" max="100" step="1" value="${m.contingency || 0}"></label></div>
      <div class="money"><div class="r"><span>Estimates entered</span><b>${money(b.sum)}</b></div><div class="r"><span>Contingency (${b.pct}%)</span><b>${money(b.cont)}</b></div><div class="r"><span>Total needed</span><b>${money(b.total)}</b></div><hr><div class="r"><span>${b.gap == null ? 'Gap' : b.gap >= 0 ? 'Surplus' : 'Shortfall'}</span><b class="${b.gap >= 0 ? 'gap-pos' : 'gap-neg'}">${b.gap == null ? 'Set a budget to compare' : (b.gap < 0 ? '−' : '+') + money(Math.abs(b.gap))}</b></div></div>
      <div style="display:grid;gap:6px">${m.nodes.filter(n => n.type !== 'milestone').map(n => `<div class="dep"><span class="sp">${esc(n.title)}</span><b class="tabnum">${typeof n.cost === 'number' ? money(n.cost) : '<span class="tag t-rev">No estimate</span>'}</b></div>`).join('')}</div>
      ${b.missing.length ? `<div class="explain v">${b.missing.length} ${b.missing.length === 1 ? 'task has' : 'tasks have'} no estimate. Add them in each task's details, so the total is not understated.</div>` : ''}`,
      actions: [{ v: false, t: 'Close' }, { v: true, t: 'Save', p: true }], collect: x => ({ av: $('#bAv', x).value, co: $('#bCo', x).value }) });
    if (r.v) { snapshot(m); m.budget = r.form.av === '' ? null : Math.max(0, Number(r.form.av)); m.contingency = Math.max(0, Math.min(100, Number(r.form.co) || 0)); touch(m); toast('Budget saved'); }
  }

  /* ---------- TEMPLATES & ONBOARDING ---------- */
  function templates() {
    setTop('<h1>Templates</h1>');
    $('#view').innerHTML = `<p class="muted" style="margin-bottom:18px;max-width:70ch">Templates are editable examples. Using one creates a new copy; your existing maps are never changed. They are not legal, financial or professional checklists.</p>
      <div class="tpls">${NXD.TEMPLATES.map(t => { const m = NXD.fromTemplate(t.key, { id: 'preview_' + t.key }); return `<article class="card tpl"><div class="thumb">${thumb(m)}</div><h3>${esc(t.name)}</h3><p class="muted" style="font-size:.9rem">${esc(t.blurb)}</p><span class="muted" style="font-size:.82rem">${m.nodes.length - 1} tasks · ${m.deps.length} links · ${m.nodes.filter(n => n.rule.kind === 'relative').length} relative dates</span><a class="btn p sm" href="#new-${t.key}" style="justify-self:start">Use template ${I('arrow', 15)}</a></article>`; }).join('')}
      <article class="card tpl"><div class="thumb" style="display:grid;place-items:center;color:var(--muted)">${I('plus', 28)}</div><h3>Custom plan</h3><p class="muted" style="font-size:.9rem">One milestone and two steps. Build the rest yourself.</p><a class="btn sm" href="#new-custom" style="justify-self:start">Start blank ${I('arrow', 15)}</a></article></div>`;
  }
  function onboarding(pre) {
    const GOALS = [['move', 'home', 'Move to a new country', 'Housing, work, documents, budget and travel around one move day.', 'housing'], ['career', 'briefcase', 'Change careers', 'From target role to first day in the new job.', 'work'], ['study', 'book', 'Start studying', 'Application, money and accommodation before day one.', 'study'], ['purchase', 'wallet', 'Plan a major purchase', 'Requirements, affordability and comparison.', 'budget'], ['shared', 'users', 'Plan a joint event', 'Budget, venue, people and coordination.', 'people'], ['custom', 'plus', 'Custom plan', 'Start with one milestone and build your own.', 'research']];
    const st = ui.ob = ui.ob && ui.ob.pre === pre ? ui.ob : { pre, goal: pre || null, step: pre ? 2 : 1 };
    setTop(`<a class="crumb" href="#maps">${I('chevL', 16)}<span>Maps</span></a><h1>New plan</h1>`);
    const t = NXD.TEMPLATES.find(x => x.key === st.goal);
    const v = $('#view');
    if (st.step === 1) {
      v.innerHTML = `<div class="ob"><div class="steps" aria-label="Step 1 of 2"><i class="on"></i><i></i><span>Step 1 of 2</span></div><div><h2 style="font-size:clamp(1.6rem,3vw,2.2rem);font-weight:800">What is changing in your life?</h2><p class="muted" style="margin-top:6px">Pick the closest one. You get an editable first draft with tasks and dependencies.</p></div>
        <div class="goals" role="group" aria-label="Goal">${GOALS.map(([k, ic, tt, dd, c]) => `<button class="goal" aria-pressed="${st.goal === k}" data-act="goal" data-v="${k}" style="--c:${C[c].color};--cs:${C[c].soft}"><span class="gi">${I(ic, 22)}</span><b>${tt}</b><small>${dd}</small>${k === 'move' ? '<span class="tag t-demo rec">Main demo</span>' : ''}</button>`).join('')}</div>
        <div style="display:flex;justify-content:space-between;gap:8px"><a class="btn q" href="#app">Skip, go to Home</a><button class="btn p" data-act="obNext" ${st.goal ? '' : 'disabled'}>Continue ${I('arrow', 15)}</button></div></div>`;
      return;
    }
    const dflt = t ? t.milestone : { title: 'My milestone', date: D.add(TODAY, 120) };
    v.innerHTML = `<div class="ob" style="max-width:620px"><div class="steps" aria-label="Step 2 of 2"><i class="on"></i><i class="on"></i><span>Step 2 of 2</span></div>
      <div><h2 style="font-size:clamp(1.6rem,3vw,2.2rem);font-weight:800">Set your main milestone</h2><p class="muted" style="margin-top:6px">${t ? `Template: ${esc(t.name)}. ` : ''}Tasks are timed relative to this date, so you can change it later and see what moves.</p></div>
      <form id="obF" class="card pad" style="display:grid;gap:14px" novalidate>
        <label class="f">Plan name<input type="text" id="obName" value="${esc(t ? t.name : 'Custom plan')}" maxlength="60" required></label>
        <label class="f">Milestone name<input type="text" id="obMs" value="${esc(dflt.title)}" maxlength="50" required></label>
        <label class="f">Target date<input type="date" id="obDate" value="${dflt.date}" required><small id="obErr" class="muted"></small></label>
        <label class="f">Starting budget (€) <small>Optional. Only your own estimate.</small><input type="number" id="obBud" min="0" step="100" placeholder="Leave empty if unknown"></label>
        <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><button class="btn q" type="button" data-act="obBack">${I('chevL', 15)}Back</button><button class="btn p" type="submit">${I('map', 15)}Create my Life Map</button></div>
      </form><p class="muted" style="font-size:.82rem">The draft is an illustration, not a complete or official checklist. Everything stays editable.</p></div>`;
    $('#obF').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#obName').value.trim(), msn = $('#obMs').value.trim(), date = $('#obDate').value, bud = $('#obBud').value;
      const err = $('#obErr');
      if (!name || !msn) { err.textContent = 'Please fill in both names.'; err.style.color = 'var(--pri-ink)'; return; }
      if (!D.valid(date)) { err.textContent = 'Enter a valid date.'; err.style.color = 'var(--pri-ink)'; $('#obDate').focus(); return; }
      const opts = { title: name, milestoneTitle: msn, date, budget: bud === '' ? null : Math.max(0, Number(bud)) };
      const m = st.goal === 'custom' ? NXD.customMap(opts) : NXD.fromTemplate(st.goal, opts);
      if (m.template === 'move') m.contingency = 10;
      S.maps.unshift(m); log(`Created “${m.title}”`, m.id); save();
      ui.ob = null; ui.sel = main(m).id; ui.mapId = m.id; ui.mode[m.id] = innerWidth < 760 ? 'list' : 'map'; S.prefs.tourDone = false;
      go('map-' + m.id); toast('Your Life Map is ready. The milestone is selected.');
    });
  }

  /* ---------- SETTINGS & ABOUT ---------- */
  function prefs() {
    setTop('<h1>Settings</h1>');
    const json = JSON.stringify(S);
    $('#view').innerHTML = `<div style="max-width:760px;display:grid;gap:18px">
      <section class="card pad" style="display:grid;gap:14px"><h2 style="font-size:1.05rem">Profile and display</h2>
        <label class="f">Display name <small>A fictional alias is fine.</small><input type="text" id="pAlias" value="${esc(S.user.alias)}" maxlength="40"></label>
        <label class="f">Date format<select id="pFmt"><option value="long"${S.prefs.dateFmt === 'long' ? ' selected' : ''}>May 15, 2027</option><option value="eu"${S.prefs.dateFmt === 'eu' ? ' selected' : ''}>15.05.2027</option><option value="iso"${S.prefs.dateFmt === 'iso' ? ' selected' : ''}>2027-05-15</option></select></label>
        <label class="chk"><input type="checkbox" id="pRm" ${S.prefs.reducedMotion ? 'checked' : ''}><span>Reduce motion (also follows your system setting)</span></label>
        <div class="f">Language${NXL.picker('pref-lang')}<small>Switches the whole interface. Names you typed yourself stay as you wrote them.</small></div>
        <button class="btn p sm" data-act="savePrefs" style="justify-self:start">Save settings</button></section>
      <section class="card pad" style="display:grid;gap:12px"><h2 style="font-size:1.05rem">Your data</h2>
        <div class="explain m">${I('shield', 15)} ${storageOK ? 'Stored in this browser only (localStorage). Nothing is sent to a server by this demo. There is no cloud sync or backup.' : 'This browser blocks storage, so changes last only until you close the page.'}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px"><button class="btn sm" data-act="export">${I('download', 15)}Export JSON</button><button class="btn sm" data-act="copyJson">${I('copy', 15)}Copy JSON</button><label class="btn sm" style="cursor:pointer">${I('upload', 15)}Import JSON file<input type="file" id="pImp" accept="application/json,.json" class="sr"></label><button class="btn sm" data-act="reset">${I('refresh', 15)}Reset sample data</button></div>
        <details><summary class="muted" style="cursor:pointer">Paste JSON to import</summary><div style="display:grid;gap:8px;margin-top:8px"><label class="sr" for="pPaste">JSON to import</label><textarea id="pPaste" placeholder="Paste exported JSON here"></textarea><button class="btn sm" data-act="importPaste" style="justify-self:start">Import pasted JSON</button></div></details>
        <small class="muted">Current data: ${S.maps.length} maps, ${(json.length / 1024).toFixed(1)} KB.</small></section>
      <section class="card pad" style="display:grid;gap:8px"><h2 style="font-size:1.05rem">Keyboard</h2><p class="muted" style="font-size:.9rem">On the map: Tab moves between tasks, arrow keys jump to the nearest task in that direction, Enter opens details, Shift + arrows moves a card, Escape closes details, + and − zoom, F fits, Ctrl + Z undoes.</p></section>
    </div>`;
    $('#pImp').addEventListener('change', e => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => importJSON(r.result); r.readAsText(file); });
  }
  async function importJSON(text) {
    let data; try { data = JSON.parse(text); } catch (e) { toast('That file is not valid JSON.'); return; }
    if (!data || data.v !== 1 || !Array.isArray(data.maps) || !data.maps.every(m => Array.isArray(m.nodes) && Array.isArray(m.deps))) { toast('This JSON is not a NEXORA export.'); return; }
    const ok = await dialog({ title: 'Replace your data?', body: `Import ${data.maps.length} maps. Your current data in this browser will be replaced. You can undo right after.`, actions: [{ v: false, t: 'Cancel' }, { v: true, t: 'Import', p: true }] });
    if (!ok) return; const old = S; S = data; S.prefs = Object.assign({ dateFmt: 'long', reducedMotion: false, tourDone: true }, S.prefs || {}); save(); route();
    toast('Data imported', () => { S = old; save(); route(); });
  }
  async function exportJSON() {
    const json = JSON.stringify(S, null, 2), name = 'nexora-plans.json';
    try { if (window.claude && window.claude.use) { const dl = await window.claude.use('downloads'); if (dl) { await dl.save({ filename: name, data: json }); toast('Export ready'); return; } } } catch (e) { if (e && e.code === 'dismissed') return; }
    try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); toast('Export started. If nothing downloads, use Copy JSON.'); } catch (e) { toast('Download is blocked here. Use Copy JSON.'); }
  }
  function about() {
    setTop('<h1>About this concept</h1>');
    const Q = [
      ['What do I need to do to prepare?', 'Template plan grouped by Housing, Work, Documents, Budget, Travel', 'Template + your edits', 'Works · demo template'],
      ['What should I do first?', 'Home: Do this next, with Why now', 'Status + dependencies + dates', 'Works'],
      ['What depends on this decision?', 'Task details: Depends on / Needed for, highlighted path on the map', 'Declared links only', 'Works'],
      ['If I move my target date, what must be reviewed?', 'What If? impact list with Why this changed', 'Relative-date rules, review links, dependency chain', 'Works'],
      ['Which plans risk missing a deadline?', 'Order conflicts on Home, map, list and Insights', 'Due date before a prerequisite', 'Works · conflict, not prediction'],
      ['Which tasks are blocked and why?', 'Waiting on … in list, details and Insights', 'Unfinished prerequisites', 'Works'],
      ['What if I choose A instead of B?', 'Saved scenarios compared side by side', 'Milestone date + budget assumptions', 'Works for dates and budget'],
      ['How much might this cost?', 'Budget panel and scenario budget', 'Sum of your estimates + contingency', 'Works · your numbers only'],
      ['What have I forgotten?', 'Things to review + Missing information', 'Fixed suggestion list per template', 'Demo suggestions, not complete'],
      ['What needs my attention this week?', 'Home: This week and next, Timeline', 'Your dates vs today', 'Works'],
      ['What changed since I last checked?', 'Home: What changed', 'Changes recorded in this browser', 'Works locally · no notifications'],
      ['Can I get the old plan back?', 'Discard, Undo after apply, saved baseline', 'Undo snapshots in this session', 'Works']
    ];
    const R = [['Whimsical', 'https://whimsical.com/', 'Legible connectors and simple diagram cards on the Life Map.'], ['Milanote', 'https://milanote.com/', 'Board-like organisation of My Life Maps and templates.'], ['Heptabase', 'https://newsite.heptabase.com/', 'Linking decisions as connected objects.'], ['Linear', 'https://linear.app/now/behind-the-latest-design-refresh', 'Keyboard-first, calm task details and predictable state.'], ['Rive', 'https://rive.app/use-cases/websites', 'State-driven motion in the landing hero and What If? ripple.']];
    $('#view').innerHTML = `<div style="max-width:980px;display:grid;gap:20px">
      <section class="card pad" style="display:grid;gap:10px"><h2 style="font-size:1.1rem">What NEXORA is</h2><p>A connected life planner concept. It shows what depends on what, and what changes when a date or budget shifts, without changing your plan until you confirm. It is not legal, financial or immigration advice, and it does not predict outcomes.</p>
        <div class="explain v">Interactive concept with sample data. No accounts, no cloud sync, no AI model, no notifications. Collaboration, calendar sync and attachments are future ideas.</div></section>
      <section style="display:grid;gap:10px"><h2 style="font-size:1.1rem">Questions NEXORA answers</h2><div class="tbl-wrap"><table class="t"><thead><tr><th>User question</th><th>Where the answer is</th><th>Data or rule</th><th>State</th></tr></thead><tbody>${Q.map(q => `<tr><td class="tt">${q[0]}</td><td>${q[1]}</td><td class="muted">${q[2]}</td><td>${q[3].startsWith('Works') ? `<span class="tag t-ok">${q[3]}</span>` : `<span class="tag t-demo">${q[3]}</span>`}</td></tr>`).join('')}</tbody></table></div></section>
      <section class="card pad" style="display:grid;gap:10px"><h2 style="font-size:1.1rem">Design references (inspiration only)</h2><ul style="margin:0;padding-left:18px;display:grid;gap:6px">${R.map(r => `<li><a href="${r[1]}" target="_blank" rel="noopener">${r[0]}</a>: ${r[2]}</li>`).join('')}</ul></section>
      <section class="card pad" style="display:grid;gap:10px"><h2 style="font-size:1.1rem">Not built yet</h2><ul style="margin:0;padding-left:18px;display:grid;gap:4px"><li>A real AI planning assistant with a secure backend</li><li>Accounts and sync across devices</li><li>Shared plans for couples, roles and comments</li><li>Calendar integration and reminders</li><li>Private document attachments</li></ul></section></div>`;
  }

  /* ---------- global events ---------- */
  document.addEventListener('click', async e => {
    const g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
    if (e.target.closest('[data-home]')) { e.preventDefault(); location.hash = ''; route(); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act, h = location.hash.slice(1);
    const m = b.dataset.m ? getMap(b.dataset.m) : h.startsWith('map-') ? getMap(h.slice(4)) : h.startsWith('whatif-') ? getMap(h.slice(7)) : null;
    switch (act) {
      case 'more': {
        const r = await dialog({ title: 'More', html: `<div class="att">${[['insights', 'chart', 'Insights'], ['templates', 'grid', 'Templates'], ['prefs', 'sliders', 'Settings'], ['about', 'info', 'About this concept']].map(([k, ic, t]) => `<button class="row" data-close="${k}"><span class="ico">${I(ic, 17)}</span><span><b>${t}</b></span>${I('chevR', 16)}</button>`).join('')}<button class="row" data-close="top"><span class="ico">${I('home', 17)}</span><span><b>Back to the NEXORA site</b></span>${I('chevR', 16)}</button></div>`, actions: [{ v: false, t: 'Close' }] });
        if (r === 'top') { location.hash = ''; route(); } else if (r) go(r); break;
      }
      case 'start': { const n = nodeOf(m, b.dataset.n); snapshot(m); n.status = 'in_progress'; log(`Started “${n.title}”`, m.id); touch(m); route(); toast(`Started “${n.title}”`, () => undoMap(m)); break; }
      case 'done': { const n = nodeOf(m, b.dataset.n); snapshot(m); const old = n.status; n.status = 'done'; log(`Completed “${n.title}”`, m.id); touch(m); if (location.hash === '#map-' + m.id && graph) { paintGraph(m); inspector(m); } else route(); toast(`Done: ${n.title}`, () => { n.status = old; touch(m); route(); }); break; }
      case 'open': case 'openTl': { ui.sel = b.dataset.n; ui.mapId = b.dataset.m; if (act === 'open' && innerWidth >= 760) ui.mode[b.dataset.m] = 'map'; go('map-' + b.dataset.m); setTimeout(() => graph && graph.center(b.dataset.n), 60); break; }
      case 'blockers': { const n = nodeOf(m, b.dataset.n), dn = downstream(m, n.id), w = waitingOn(m, n.id); await dialog({ title: n.title, html: `<div style="display:grid;gap:10px"><div><b>Waiting on</b><p class="muted">${w.length ? w.map(x => esc(x.title)).join(', ') : 'Nothing. It is ready to start.'}</p></div><div><b>What it unlocks</b><p class="muted">${dn.length ? dn.map(x => esc(x.title)).join(' → ') : 'No other task depends on it.'}</p></div><small class="muted">From the links in your plan.</small></div>`, actions: [{ v: true, t: 'Close', p: true }] }); break; }
      case 'dismiss': ui.dismissed.add(b.dataset.n); route(); toast('Hidden for this session', () => { ui.dismissed.delete(b.dataset.n); route(); }); break;
      case 'mapsF': ui.mapsF = b.dataset.v; route(); break;
      case 'mapMenu': mapMenu(b.dataset.m); break;
      case 'mode': ui.mode[m.id] = b.dataset.v; route(); break;
      case 'review': await reviewDialog(m); break;
      case 'budget': await budgetDialog(m); if (location.hash === '#map-' + m.id) route(); break;
      case 'zoomIn': graph && graph.zoomBy(1.2); break;
      case 'zoomOut': graph && graph.zoomBy(1 / 1.2); break;
      case 'fit': graph && graph.fit(true); break;
      case 'undo': undoMap(m); break;
      case 'redo': redoMap(m); break;
      case 'addNode': { const n = addNode(m); ui.sel = n.id; paintGraph(m); inspector(m); refreshTools(m); graph.center(n.id); setTimeout(() => { const t = $('#iTitle'); t && (t.focus(), t.select()); }, 40); toast('Task added. Name it in the panel.', () => undoMap(m)); break; }
      case 'addNodeList': { const n = addNode(m); ui.sel = n.id; listView(m); setTimeout(() => { const t = $('#iTitle'); t && (t.focus(), t.select()); }, 40); break; }
      case 'cat': ui.cats.has(b.dataset.v) ? ui.cats.delete(b.dataset.v) : ui.cats.add(b.dataset.v); b.setAttribute('aria-pressed', ui.cats.has(b.dataset.v)); paintGraph(m); break;
      case 'sel': ui.sel = b.dataset.n; if (graph) { paintGraph(m); graph.center(ui.sel); } inspector(m); break;
      case 'closeInsp': { const was = ui.sel; ui.sel = null; if (graph) paintGraph(m); inspector(m); const c = $(`.g-n[data-id="${was}"]`) || $(`[data-n="${was}"].lk`); c && c.focus(); break; }
      case 'saveNode': saveNode(m); if ((ui.mode[m.id] || 'map') !== 'map') { const s = ui.sel; route(); ui.sel = s; inspector(m); } break;
      case 'addDep': addDependency(m); break;
      case 'rmDep': removeDependency(m, b.dataset.e); break;
      case 'delNode': deleteNode(m).then(() => { if ((ui.mode[m.id] || 'map') !== 'map') route(); }); break;
      case 'listF': ui.listF = b.dataset.v; listView(m); break;
      case 'openList': ui.sel = b.dataset.n; inspector(m); setTimeout(() => { const t = $('#insp h3'); t && t.focus(); }, 20); break;
      case 'tlMap': ui.tlMap = b.dataset.v; route(); break;
      case 'wQuick': { const W = ui.wi, base = datesOf(m)[W.anchor]; W.date = D.add(base, +b.dataset.v); $('#wDate').value = W.date; $('#wRange').value = +b.dataset.v; wiUpdate(m, true); break; }
      case 'wView': ui.wi.view = b.dataset.v; $$('[data-act="wView"]').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === ui.wi.view)); wiUpdate(m, true); break;
      case 'wDiscard': { const ok = await dialog({ title: 'Discard this scenario?', body: 'Your plan stays exactly as it was. Saved scenarios are kept.', actions: [{ v: false, t: 'Keep exploring' }, { v: true, t: 'Discard', p: true }] }); if (ok) { ui.wi = null; go('map-' + m.id); toast('Scenario discarded. Baseline unchanged.'); } break; }
      case 'wSave': wiSave(m); break;
      case 'wApply': wiApply(m); break;
      case 'wLoad': { const sc = m.scenarios.find(s => s.id === b.dataset.s); Object.assign(ui.wi, { anchor: sc.anchor, date: sc.date, budget: sc.budget, sel: null }); whatIf(m.id); toast(`Opened “${sc.name}”`); break; }
      case 'wDel': { const sc = m.scenarios.find(s => s.id === b.dataset.s); const ok = await dialog({ title: `Delete “${sc.name}”?`, body: 'Only the saved scenario is removed. The plan is not affected.', actions: [{ v: false, t: 'Cancel' }, { v: true, t: 'Delete', p: true }] }); if (ok) { m.scenarios = m.scenarios.filter(s => s !== sc); touch(m); renderImpact(m); } break; }
      case 'goal': ui.ob.goal = b.dataset.v; $$('.goal').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === ui.ob.goal)); $('[data-act="obNext"]').disabled = false; break;
      case 'obNext': ui.ob.step = 2; route(); break;
      case 'obBack': ui.ob.step = 1; route(); break;
      case 'ask': assistant(b.dataset.v); break;
      case 'savePrefs': { const a = $('#pAlias').value.trim(); if (a) S.user.alias = a; S.prefs.dateFmt = $('#pFmt').value; S.prefs.reducedMotion = $('#pRm').checked; save(); document.documentElement.classList.toggle('rm', S.prefs.reducedMotion); toast('Settings saved'); break; }
      case 'export': exportJSON(); break;
      case 'copyJson': { const json = JSON.stringify(S, null, 2); try { await navigator.clipboard.writeText(json); toast('JSON copied'); } catch (_) { const t = $('#pPaste'); t.closest('details').open = true; t.value = json; t.select(); toast('Select and copy the JSON from the box.'); } break; }
      case 'importPaste': importJSON($('#pPaste').value); break;
      case 'reset': { const ok = await dialog({ title: 'Reset to sample data?', body: 'All maps, scenarios and settings in this browser go back to the demo state. You can undo right after.', actions: [{ v: false, t: 'Cancel' }, { v: true, t: 'Reset', p: true }] }); if (ok) { const old = S; S = NXD.seed(); S.prefs.tourDone = old.prefs.tourDone; save(); route(); toast('Sample data restored', () => { S = old; save(); route(); }); } break; }
    }
  });
    document.addEventListener('change', e => {
    const t = e.target, h = location.hash.slice(1), m = h.startsWith('map-') ? getMap(h.slice(4)) : h.startsWith('whatif-') ? getMap(h.slice(7)) : null;
    if (!m) return;
    if (t.dataset.act === 'tick') { const n = nodeOf(m, t.dataset.n); snapshot(m); const old = n.status; n.status = t.checked ? 'done' : 'todo'; log(`${t.checked ? 'Completed' : 'Reopened'} “${n.title}”`, m.id); touch(m); listView(m); toast(t.checked ? `Done: ${n.title}` : `Reopened: ${n.title}`, () => { n.status = old; touch(m); listView(m); }); }
    if (t.dataset.act === 'lstatus') { const n = nodeOf(m, t.dataset.n); snapshot(m); n.status = t.value; log(`Set “${n.title}” to ${ST[n.status].label}`, m.id); touch(m); listView(m); toast('Status updated', () => undoMap(m)); }
    if (t.dataset.act === 'ldate') { if (t.value && !D.valid(t.value)) { toast('Enter a valid date.'); return; } const n = nodeOf(m, t.dataset.n); snapshot(m); n.rule = Object.assign({}, n.rule, { date: t.value || undefined }); log(`Changed date of “${n.title}”`, m.id); touch(m); listView(m); toast('Date saved. Map and timeline use the same data.', () => undoMap(m)); }
    if (t.dataset.act === 'chk') { const n = nodeOf(m, ui.sel); n.checklist[+t.dataset.i].done = t.checked; touch(m); t.closest('.chk').classList.toggle('done', t.checked); }
    if (t.dataset.act === 'wSel') { t.checked ? ui.wi.sel.add(t.dataset.n) : ui.wi.sel.delete(t.dataset.n); }
  });
  document.addEventListener('keydown', e => {
    const h = location.hash.slice(1); if (!h.startsWith('map-') || !graph) return;
    const tag = (e.target.tagName || '').toLowerCase(); if (['input', 'textarea', 'select'].includes(tag)) return;
    const m = getMap(h.slice(4)); if (!m) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redoMap(m) : undoMap(m); }
    else if (e.key === '+' || e.key === '=') graph.zoomBy(1.2);
    else if (e.key === '-') graph.zoomBy(1 / 1.2);
    else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) graph.fit(true);
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !ui.sel || document.querySelector('.dlg-bg')) return;
    const insp = document.getElementById('insp'); if (!insp || insp.hidden || !insp.contains(document.activeElement)) return;
    const btn = insp.querySelector('[data-act="closeInsp"]'); btn && btn.click();
  });
  window.NXApp = { route, S: () => S, getMap, datesOf, f };
  route();
})();

// ES module marker for Vite and TypeScript; the file still publishes its API on window.
export {};
