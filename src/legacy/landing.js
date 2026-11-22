/* NEXORA landing page. All demo numbers come from the same engine and sample data as the app. */
(function () {
  const I = NXI, C = NXD.CATS, D = NX.D;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const RM = () => matchMedia('(prefers-reduced-motion:reduce)').matches || document.documentElement.classList.contains('rm');
  const demoMap = () => NXD.seed().maps[0];
  const NEW = '2027-06-15';
  let built = false, cleanups = [];

  const HERO = [
    { id: 'move_housing', k: 'housing', x: 21, y: 22 },
    { id: 'move_docs', k: 'documents', x: 79, y: 20 },
    { id: 'move_budget', k: 'budget', x: 17, y: 58 },
    { id: 'move_travel', k: 'travel', x: 83, y: 56 },
    { id: 'move_handover', k: 'work', x: 50, y: 76 }
  ];

  function html() {
    const m = demoMap(), dates = NX.resolve(m.nodes).dates, by = id => m.nodes.find(n => n.id === id);
    const tpl = NXD.TEMPLATES;
    return `
<header class="lh" id="lh"><div class="lw"><a href="#" class="brand" style="padding:0" aria-label="NEXORA" data-top>${NXLOCKUP(30)}</a>
  <nav aria-label="Page sections"><button data-to="lHow">How it works</button><button data-to="lDemo">What If?</button><button data-to="lUse">Use cases</button><button data-to="lWhy">Why NEXORA</button></nav>
  <span class="sp"></span>${NXL.picker('lh-lang')}<a class="btn p" href="#app">Open demo</a></div></header>
<main>
<section class="hero" aria-labelledby="hT">
  <div class="blob" style="width:520px;height:520px;left:-160px;top:40px;background:#E3DDFF"></div><div class="blob" style="width:460px;height:460px;right:-120px;bottom:-140px;background:#CDF4EF"></div>
  <div class="lw">
    <div>
      <span class="eb" data-h>${I('branch', 15)}When life changes, your plan should keep up.</span>
      <h1 id="hT"><span class="ln"><span>One decision changes</span></span><span class="ln"><span class="grad">more than one thing.</span></span></h1>
      <p class="lead" data-h>NEXORA connects your dates, tasks, and big decisions, so you can see what changes, compare your options, and move forward with clarity.</p>
      <div class="ctas" data-h><a class="btn g lg" href="#map-move">${I('map', 18)}Explore a move plan</a><button class="btn lg" data-to="lDemo">See what happens when plans change</button></div>
      <p class="trust" data-h>${I('info', 15)}Interactive concept · Sample data · Not legal, financial, or immigration advice.</p>
    </div>
    <div class="hgraph" id="hg" aria-label="Example Life Map for a move. Select a card to see how it connects to Move day.">
      <svg class="e" aria-hidden="true"><defs><marker id="hArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L9 5L0 9z" fill="#B8C0E0"/></marker><marker id="hArrOn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L9 5L0 9z" fill="#8B7CFF"/></marker></defs><g id="hEdges"></g></svg>
      <button class="hn c0" id="hc" style="left:50%;top:41%;--c:#8B7CFF" aria-describedby="hcD"><span class="k">${I('flag', 14)}Your next big move</span><b>Move day</b><small id="hcD">${D.fmt(dates.move_m)}</small><span class="mv" id="hcMv"></span></button>
      ${HERO.map((h, i) => { const n = by(h.id), c = C[h.k]; return `<button class="hn" data-i="${i}" style="left:${h.x}%;top:${h.y}%;--c:${c.color}"><span class="k">${I(c.icon, 14)}${c.label}</span><b>${n.title}</b><small data-d>${D.fmt(dates[h.id])}</small><span class="mv" data-mv></span></button>`; }).join('')}
      <div class="hctl"><p id="hMsg">Move day is <b>May 15, 2027</b>. Try a one-month delay.</p><button class="btn p sm" id="hBtn" aria-pressed="false">${I('branch', 15)}Move to June 15</button></div>
    </div>
    <div class="hmascot" id="nxMascot" aria-hidden="true"></div>
  </div>
</section>

<section class="ls" id="lProb" aria-labelledby="pT"><div class="lw">
  <div class="hdr"><span class="kick">The problem</span><h2 id="pT">Your plans are connected. Your notes aren't.</h2><p>A changed date affects more than your calendar. It can affect housing, travel, finances, and everything that depends on them.</p></div>
  <div class="prob" id="prob" aria-label="Scattered notes turn into a connected plan and a short list of next actions">
    <svg aria-hidden="true"><g id="pEdges"></g></svg>
    ${[['Find a flat', 'housing', 'Notes app'], ['Moving budget?', 'budget', 'Spreadsheet'], ['Book travel', 'travel', 'Calendar'], ['Tell work', 'work', 'Email draft'], ['Which documents?', 'documents', 'Browser tab'], ['Pack', 'travel', 'Sticky note'], ['Confirm movers', 'travel', 'Chat'], ['Deposit due', 'budget', 'Reminder']].map(([t, k, s], i) => `<div class="note" data-p="${i}" style="--c:${C[k].color}">${t}<small><i></i>${s}</small></div>`).join('')}
    <div class="dash" id="pDash"><span class="kick" style="color:var(--pri-ink)">${I('compass', 13)} Do this next</span><b>Prepare moving budget</b><span class="muted" style="font-size:.86rem">Nothing blocks it and Confirm housing plan waits for it.</span><span class="tag t-rev" style="justify-self:start">${I('eye', 12)}2 items to review after the date change</span></div>
  </div>
</div></section>

<section class="ls" id="lHow" style="background:var(--canvas)" aria-labelledby="sT"><div class="lw">
  <div class="hdr"><span class="kick">How it works</span><h2 id="sT">Three steps from overwhelmed to clear.</h2></div>
  <div class="three">
    <article class="card"><span class="n">1</span><h3>Choose your change</h3><p>Start with a template or a blank Life Map. You get an editable draft grouped by housing, work, documents, budget and travel.</p></article>
    <article class="card"><span class="n">2</span><h3>Connect your plan</h3><p>Link what must happen first, and time tasks relative to your main date. Every arrow reads as a sentence: this depends on that.</p></article>
    <article class="card"><span class="n">3</span><h3>Explore the ripple effect</h3><p>Change a date or budget in a draft. See what moves, what needs a manual check, and apply only what you approve.</p></article>
  </div>
</div></section>

<section class="ls" id="lDemo" aria-labelledby="dT"><div class="lw">
  <div class="hdr"><span class="kick">Live demo · runs on sample data</span><h2 id="dT">What if your plans change?</h2><p>Drag the slider. The impact is calculated from the dependencies in the sample move plan, the same engine the app uses.</p></div>
  <div class="demo">
    <div class="canvas" id="dCanvas"></div>
    <div class="side2">
      <div class="scrub"><label class="f" for="dRange">Move day: <b id="dDate" class="tabnum"></b></label><input type="range" id="dRange" min="0" max="31" value="0" step="1"><div class="ends"><span>May 15, 2027 · baseline</span><span>June 15, 2027</span></div></div>
      <div class="ans" id="dAns"></div>
      <div class="imp" id="dImp" aria-live="polite"></div>
      <a class="btn p" href="#whatif-move" style="justify-self:start">${I('branch', 16)}Open the full What If? lab</a>
    </div>
  </div>
</div></section>

<section class="ls" id="lWhy" style="background:var(--canvas)" aria-labelledby="fT"><div class="lw">
  <div class="hdr"><span class="kick">Why NEXORA</span><h2 id="fT">Don't just manage tasks. Understand what changes.</h2><p>Many task tools support deadlines and dependencies. NEXORA puts them in the language of real life decisions and explains every effect.</p></div>
  <div class="feats">
    ${[['map', 'See the whole plan', 'One connected Life Map instead of notes, calendars and spreadsheets in different places.', 'milestone'], ['branch', 'See what changes', 'Compare scenarios without touching your baseline. Every affected task says why.', 'housing'], ['compass', 'Know the next step', 'One recommended action with its reason: what it unlocks and what waits for it.', 'documents'], ['shield', 'Stay in control', 'Nothing is applied until you confirm. Fixed commitments are flagged, never moved.', 'travel'], ['calendar', 'Clear timeline', 'The same tasks as a list and a timeline, with overdue and waiting states.', 'budget'], ['grid', 'Templates to start', 'Moving, career change, study, major purchase and shared events as editable drafts.', 'work']].map(([ic, t, d, k]) => `<article class="card feat" style="--c:${C[k].color};--cs:${C[k].soft}"><span class="fi">${I(ic, 22)}</span><h3>${t}</h3><p>${d}</p></article>`).join('')}
  </div>
</div></section>

<section class="ls" id="lUse" aria-labelledby="uT"><div class="lw">
  <div class="hdr"><span class="kick">Use cases</span><h2 id="uT">Moving abroad? Changing careers? Starting a new chapter? Start with one decision.</h2></div>
  <div class="ucs">
    <a class="uc focus" href="#new-move"><span class="tag t-demo" style="justify-self:start">Main demo</span><b>Moving abroad</b><small>When the move changes, see what else needs to.</small><span class="cta">Plan my move ${I('arrow', 14)}</span></a>
    <a class="uc" href="#new-career"><b>Changing careers</b><small>Turn a big career move into a clear sequence.</small><span class="cta">Map my career change ${I('arrow', 14)}</span></a>
    <a class="uc" href="#new-study"><b>Starting university</b><small>Keep every step of your next chapter connected.</small><span class="cta">Plan my studies ${I('arrow', 14)}</span></a>
    <a class="uc" href="#new-purchase"><b>Major purchase</b><small>Compare the plan before you commit.</small><span class="cta">Compare my options ${I('arrow', 14)}</span></a>
    <a class="uc" href="#new-shared"><b>Shared life plans</b><small>One plan for two people. Shared editing is a future idea; today it is a single-user template.</small><span class="cta">Try the template ${I('arrow', 14)}</span></a>
  </div>
  <p class="muted" style="margin-top:16px;font-size:.88rem">Templates are planning examples, not professional or legal advice.</p>
</div></section>

<section class="ls" style="background:var(--canvas)" aria-labelledby="vT"><div class="lw">
  <div class="hdr"><span class="kick">Product preview</span><h2 id="vT">One model, every screen.</h2><p>The desktop map and the phone list below are rendered live from the same sample plan.</p></div>
  <div class="prev">
    <div class="desk" aria-hidden="true"><div class="bar"><i></i><i></i><i></i></div><div class="area" id="pvMap"></div></div>
    <div class="phone" aria-label="Phone task list preview"><div class="scr"><span class="kick">Moving to a new country</span><h4>Next up</h4>${m.nodes.filter(n => n.type !== 'milestone').sort((a, b) => (dates[a.id] || '9').localeCompare(dates[b.id] || '9')).slice(0, 6).map(n => `<div class="mrow" style="--c:${C[n.category].color}"><i></i><span><b>${n.title}</b><small>${D.fmt(dates[n.id])}</small></span></div>`).join('')}</div></div>
  </div>
</div></section>

<section class="ls" aria-labelledby="oT"><div class="lw">
  <div class="hdr"><span class="kick">Questions people ask</span><h2 id="oT">Straight answers.</h2></div>
  <div class="objs">
    ${[['Why not just use a calendar?', 'A calendar shows dates. NEXORA also shows the relationships you define between dates and decisions, so a change in one place points to the others. Use both if you like.'],
       ['Does the app decide for me?', 'No. Scenarios show consequences of the rules you set. You approve every change, item by item.'],
       ['How does it know the future?', 'It does not. It calculates from the dependencies and assumptions in your plan, flags what is unknown, and does not predict outcomes controlled by other people or institutions.'],
       ['Will it change my appointments automatically?', 'No. Fixed dates never move on their own. When something they depend on changes, they are marked Needs review.'],
       ['Can it tell me which visa or contract I need?', 'No. It can suggest questions to check with official sources. It does not invent or certify requirements.'],
       ['Are my plans private?', 'In this concept, everything stays in your browser. Nothing is sent to a server. There is no cloud backup, so export your data if you want a copy.'],
       ['Do I have to draw a complex graph?', 'No. Start from a template, and switch to the List or Timeline view any time.']].map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}
  </div>
</div></section>

<section class="ls" style="background:var(--canvas)" aria-labelledby="tT"><div class="lw">
  <div class="hdr"><span class="kick">Trust</span><h2 id="tT">Honest about what this is.</h2></div>
  <div class="trust2">
    <article class="card"><h3>${I('info', 18)}Interactive concept</h3><p>Explore an interactive concept using sample data. Everything you click works on that data.</p></article>
    <article class="card"><h3>${I('shield', 18)}Stays in your browser</h3><p>Your real-life plans are not sent to an external service by this demo. Edits are saved in this browser only.</p></article>
    <article class="card"><h3>${I('help', 18)}No hidden AI</h3><p>Answers come from fixed rules and your data. A real AI assistant, accounts and sync are future work.</p></article>
  </div>
</div></section>

<section class="ls fin" aria-labelledby="zT"><div class="blob" style="width:520px;height:520px;left:50%;top:-200px;margin-left:-260px;background:#E3DDFF"></div><div class="lw">
  ${NXLOGO(56)}<h2 id="zT">See what changes. Plan what comes next.</h2><p class="muted" style="font-size:1.1rem;max-width:56ch">Open the sample move plan, change the date, and see exactly what NEXORA flags.</p>
  <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center"><a class="btn g lg" href="#app">Try interactive demo ${I('arrow', 18)}</a><a class="btn lg" href="#new">Start your own plan</a></div>
  <span class="concept">${I('info', 13)}Interactive concept · Sample data</span>
</div></section>
</main>
<footer class="lfoot"><div class="lw"><span style="display:flex;align-items:center;gap:10px">${NXLOGO(22)}<b style="font-family:var(--fh);letter-spacing:.14em;color:var(--ink)">NEXORA</b> · Concept project © 2026</span>
  <nav aria-label="Footer"><button data-go2="app">Product demo</button><button data-go2="templates">Templates</button><button data-go2="about">About this concept</button><button data-go2="prefs">Privacy and data</button></nav>
  <span>Not legal, financial, or immigration advice.</span></div></footer>`;
  }

  /* ---------- hero graph ---------- */
  function heroGraph() {
    const box = $('#hg'), svg = $('#hEdges'), center = $('#hc'), cards = $$('.hn[data-i]', box);
    const m = demoMap(), base = NX.resolve(m.nodes).dates;
    const sim = NX.simulate(m, { move_m: { rule: { kind: 'fixed', date: NEW } } }, 'long');
    let on = false, hover = null;
    function draw() {
      const r = box.getBoundingClientRect(), c = center.getBoundingClientRect();
      const cx = c.left - r.left + c.width / 2, cy = c.top - r.top + c.height / 2;
      svg.innerHTML = cards.map((el, i) => {
        const b = el.getBoundingClientRect(), x = b.left - r.left + b.width / 2, y = b.top - r.top + b.height / 2;
        const sx = x + (cx > x ? b.width / 2 : -b.width / 2) * (Math.abs(cx - x) > 60 ? 1 : 0), sy = Math.abs(cx - x) > 60 ? y : y + (cy > y ? b.height / 2 : -b.height / 2);
        const ex = cx + (x < cx ? -c.width / 2 : c.width / 2) * (Math.abs(cx - x) > 60 ? 1 : 0), ey = Math.abs(cx - x) > 60 ? cy : cy + (y > cy ? c.height / 2 : -c.height / 2);
        const mx = (sx + ex) / 2;
        const d = Math.abs(cx - x) > 60 ? `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}` : `M${sx},${sy} C${sx},${(sy + ey) / 2} ${ex},${(sy + ey) / 2} ${ex},${ey}`;
        const lit = hover === i || (on && HERO[i] && sim.items.find(it => it.id === HERO[i].id));
        return `<path class="he${lit ? ' on' : ''}" data-e="${i}" d="${d}" marker-end="url(#${lit ? 'hArrOn' : 'hArr'})"/>`;
      }).join('');
    }
    function state() {
      $('#hcD').textContent = D.fmt(on ? NEW : base.move_m);
      $('#hcMv').textContent = on ? '+31 days' : ''; center.classList.toggle('moved', on);
      cards.forEach((el, i) => {
        const it = sim.items.find(x => x.id === HERO[i].id), mv = $('[data-mv]', el), d = $('[data-d]', el);
        el.classList.remove('moved', 'rev');
        if (on && it) {
          if (it.kinds.includes('shift')) { el.classList.add('moved'); mv.textContent = `Moves to ${D.short(it.draftDate)}`; d.textContent = D.fmt(it.draftDate); }
          else { el.classList.add('rev'); mv.textContent = 'Needs review'; d.textContent = D.fmt(it.baseDate) + ' · fixed'; }
        } else { mv.textContent = ''; d.textContent = D.fmt(base[HERO[i].id]); }
      });
      const shifts = sim.items.filter(i => i.kinds.includes('shift')).length, rev = sim.items.filter(i => !i.kinds.includes('shift') && !i.kinds.includes('source')).length;
      $('#hMsg').innerHTML = on ? `<b>${shifts} dates move</b> and <b>${rev} items need review</b> in the full plan. Nothing is applied yet.` : 'Move day is <b>May 15, 2027</b>. Try a one-month delay.';
      const b = $('#hBtn'); b.setAttribute('aria-pressed', on); b.innerHTML = on ? `${I('undo', 15)}Back to May 15` : `${I('branch', 15)}Move to June 15`;
      draw();
    }
    $('#hBtn').addEventListener('click', () => { on = !on; state(); if (!RM() && window.gsap) gsap.fromTo(cards.filter(c => c.classList.contains('moved') || c.classList.contains('rev')), { scale: .94 }, { scale: 1, duration: .5, ease: 'back.out(2)', stagger: .06, clearProps: 'scale' }); });
    cards.forEach((el, i) => {
      const t = () => { hover = i; draw(); }, u = () => { hover = null; draw(); };
      el.addEventListener('mouseenter', t); el.addEventListener('mouseleave', u); el.addEventListener('focus', t); el.addEventListener('blur', u);
      el.addEventListener('click', () => { location.hash = 'map-move'; });
    });
    center.addEventListener('click', () => { location.hash = 'map-move'; });
    const ro = new ResizeObserver(draw); ro.observe(box); cleanups.push(() => ro.disconnect());
    state();
    return { draw, cards, center };
  }

  /* ---------- what-if demo ---------- */
  function whatIfDemo() {
    const m = demoMap(), base = NX.resolve(m.nodes).dates;
    const g = new NXGraph($('#dCanvas'), { readonly: true, mini: true, pad: 16, maxScale: .9, onSelect: () => {} });
    let last = -1;
    function upd(days, anim) {
      if (days === last) return; last = days;
      const date = D.add(base.move_m, days), ov = days ? { move_m: { rule: { kind: 'fixed', date } } } : {};
      const sim = NX.simulate(m, ov, 'long');
      const hl = {}, off = {};
      sim.items.forEach(it => { hl[it.id] = it.severity === 'source' ? 'source' : it.kinds.includes('conflict') ? 'conflict' : it.kinds.includes('shift') ? 'shift' : 'review'; if (it.kinds.includes('shift') || it.kinds.includes('source')) off[it.id] = Math.round(it.delta * 0.9); });
      g.set({ map: m, dates: sim.draft, hl, lit: new Set(sim.litEdges), rays: sim.items.filter(i => i.kinds.includes('shift')).map(i => i.id), confEdges: new Set(sim.conflicts.map(c => c.edge)), offsets: g.d ? g.d.offsets : {}, fmt: s => D.fmt(s) });
      g.animateTo(off, RM() || !anim ? 0 : 500);
      $('#dDate').textContent = D.fmt(date);
      const shifts = sim.items.filter(i => i.kinds.includes('shift')), rev = sim.items.filter(i => !i.kinds.includes('shift') && !i.kinds.includes('source')), conf = sim.items.filter(i => i.kinds.includes('conflict'));
      $('#dAns').innerHTML = days ? `<p>Moving the date by ${days} ${days === 1 ? 'day' : 'days'} changes ${shifts.length} relative tasks and puts ${rev.length} linked items into review${conf.length ? `; ${conf.length} now have an order conflict` : ''}.</p><small>Based on the dependencies in the sample plan. Nothing is applied.</small>` : '<p>This is the baseline. Drag the slider to delay Move day.</p><small>May 15, 2027 → June 15, 2027 is the demo scenario.</small>';
      $('#dImp').innerHTML = sim.items.filter(i => i.severity !== 'source').map(it => `<div class="imp-i sev-${it.severity}"><div class="h"><span class="sp"><b>${it.title}</b></span>${it.kinds.includes('conflict') ? `<span class="tag t-conf">${I('split', 12)}Conflict</span>` : it.kinds.includes('shift') ? `<span class="tag t-shift">${I('arrow', 12)}+${it.delta}d</span>` : `<span class="tag t-rev">${I('eye', 12)}Review</span>`}</div><div class="why">${it.reasons[0]}</div></div>`).join('') || '<p class="muted" style="font-size:.88rem">No changes yet.</p>';
    }
    const r = $('#dRange'); let rq;
    r.addEventListener('input', () => { cancelAnimationFrame(rq); rq = requestAnimationFrame(() => upd(+r.value, false)); });
    r.addEventListener('change', () => { last = -1; upd(+r.value, true); });
    upd(0, false);
    cleanups.push(() => g.destroy());
    return g;
  }

  function preview() {
    const m = demoMap(), d = NX.resolve(m.nodes).dates;
    const g = new NXGraph($('#pvMap'), { static: true, mini: true, pad: 20, maxScale: .8 });
    g.set({ map: m, dates: d, sel: 'move_m', rays: [], fmt: s => D.fmt(s) });
    cleanups.push(() => g.destroy());
  }

  /* ---------- motion ---------- */
  function motion(hero) {
    if (!window.gsap || RM()) return;
    gsap.registerPlugin(ScrollTrigger);
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero h1 .ln>span', { yPercent: 110, duration: 1.1, stagger: .12 }, .1)
      .from('.hero [data-h]', { y: 18, autoAlpha: 0, duration: .8, stagger: .08 }, .3)
      .from(hero.center, { scale: .6, autoAlpha: 0, duration: .9, ease: 'back.out(1.6)' }, .35);
    const paths = $$('#hEdges path');
    paths.forEach(p => { const L = p.getTotalLength(); gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }); });
    tl.to(paths, { strokeDashoffset: 0, duration: .9, stagger: .08, ease: 'power2.inOut', onComplete: () => paths.forEach(p => { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; }) }, .7)
      .from(hero.cards, { scale: .7, autoAlpha: 0, duration: .7, stagger: .08, ease: 'back.out(1.7)' }, .9)
      .from('.hctl', { y: 20, autoAlpha: 0, duration: .6 }, 1.4);
    /* chaos to clarity: notes drift, then align into a plan, then the action card appears */
    const prob = $('#prob'), notes = $$('.note', prob);
    const W = () => prob.clientWidth, H = () => prob.clientHeight;
    const small = () => innerWidth < 760;
    const scat = [[.06, .08, -9], [.62, .12, 7], [.34, .3, -4], [.8, .38, 10], [.12, .62, 6], [.5, .7, -8], [.7, .78, 5], [.28, .82, -6]];
    const lay = () => small() ? [[.06, .06], [.52, .06], [.06, .24], [.52, .24], [.06, .42], [.52, .42], [.06, .6], [.52, .6]] : [[.04, .12], [.04, .42], [.27, .12], [.27, .42], [.5, .12], [.5, .42], [.73, .12], [.73, .42]];
    notes.forEach((n, i) => gsap.set(n, { x: scat[i][0] * W(), y: scat[i][1] * H(), rotation: scat[i][2] }));
    const edgesSvg = $('#pEdges');
    const links = [[0, 2], [1, 0], [2, 6], [4, 6], [6, 5], [7, 1], [3, 5]];
    const st = { p: 0 };
    const render = () => {
      const p = st.p, L = lay();
      const a = Math.min(1, p / .6), e = a < .5 ? 4 * a * a * a : 1 - Math.pow(-2 * a + 2, 3) / 2;
      notes.forEach((n, i) => gsap.set(n, { x: (scat[i][0] + (L[i][0] - scat[i][0]) * e) * W(), y: (scat[i][1] + (L[i][1] - scat[i][1]) * e) * H(), rotation: scat[i][2] * (1 - e) }));
      const op = Math.max(0, Math.min(1, (p - .45) / .2));
      edgesSvg.innerHTML = links.map(([x, y]) => { const A = notes[x], B = notes[y]; const ax = gsap.getProperty(A, 'x') + A.offsetWidth, ay = gsap.getProperty(A, 'y') + A.offsetHeight / 2, bx = gsap.getProperty(B, 'x'), by = gsap.getProperty(B, 'y') + B.offsetHeight / 2; const mx = (ax + bx) / 2; return `<path class="pe" style="opacity:${op}" d="M${ax},${ay} C${mx},${ay} ${mx},${by} ${bx},${by}"/>`; }).join('');
      gsap.set('#pDash', { autoAlpha: Math.max(0, Math.min(1, (p - .7) / .2)), y: 20 * (1 - Math.max(0, Math.min(1, (p - .7) / .2))) });
    };
    const tw = gsap.to(st, { p: 1, ease: 'none', onUpdate: render, scrollTrigger: { trigger: prob, start: small() ? 'top 75%' : 'top 22%', end: small() ? 'bottom 45%' : '+=90%', pin: !small(), scrub: .5, onRefresh: render } });
    render();
    gsap.utils.toArray('#land .three .card, #land .feat, #land .uc, #land .trust2 .card').forEach(el => gsap.from(el, { y: 26, autoAlpha: 0, duration: .8, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } }));
    gsap.utils.toArray('#land .ls h2').forEach(el => gsap.from(el, { y: 24, autoAlpha: 0, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
    cleanups.push(() => { tw.scrollTrigger && tw.scrollTrigger.kill(); ScrollTrigger.getAll().forEach(s => s.kill()); });
  }

  function staticProb() {
    const prob = $('#prob'), notes = $$('.note', prob);
    const small = innerWidth < 760, L = small ? [[.06, .06], [.52, .06], [.06, .24], [.52, .24], [.06, .42], [.52, .42], [.06, .6], [.52, .6]] : [[.04, .12], [.04, .42], [.27, .12], [.27, .42], [.5, .12], [.5, .42], [.73, .12], [.73, .42]];
    notes.forEach((n, i) => { n.style.transform = `translate(${L[i][0] * prob.clientWidth}px,${L[i][1] * prob.clientHeight}px)`; });
    $('#pDash').style.opacity = 1;
  }

  function bind() {
    const land = $('#land');
    land.addEventListener('click', e => {
      const t = e.target.closest('[data-to]'); if (t) { const el = document.getElementById(t.dataset.to); el && el.scrollIntoView({ behavior: RM() ? 'auto' : 'smooth', block: 'start' }); return; }
      const g = e.target.closest('[data-go2]'); if (g) { location.hash = g.dataset.go2; return; }
      if (e.target.closest('[data-top]')) { e.preventDefault(); scrollTo({ top: 0, behavior: RM() ? 'auto' : 'smooth' }); }
    });
    const lh = $('#lh'); const on = () => lh.classList.toggle('scrolled', scrollY > 10);
    addEventListener('scroll', on, { passive: true }); on();
  }

  window.NXLanding = {
    show() {
      if (built) { if (window.ScrollTrigger) { ScrollTrigger.getAll().forEach(st => st.enable()); ScrollTrigger.refresh(); } return; }
      built = true;
      $('#land').innerHTML = html();
      bind();
      const hero = heroGraph(); whatIfDemo(); preview();
      window.dispatchEvent(new CustomEvent('nx:landing-ready'));
      if (window.gsap && !RM()) requestAnimationFrame(() => motion(hero)); else staticProb();
      addEventListener('resize', () => { if (!window.gsap || RM()) staticProb(); });
    },
    hide() { if (window.ScrollTrigger) ScrollTrigger.getAll().forEach(st => st.disable(false)); }
  };
  if (!location.hash || location.hash === '#') NXLanding.show();
  try { const y = sessionStorage.getItem('nx-scroll'); if (y) { sessionStorage.removeItem('nx-scroll'); requestAnimationFrame(() => scrollTo(0, +y)); } } catch (e) { }
})();

// ES module marker for Vite and TypeScript; the file still publishes its API on window.
export {};
