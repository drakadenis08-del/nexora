/* NEXORA dependency engine: deterministic, pure functions, no I/O.
   Dates are ISO yyyy-mm-dd strings handled as UTC day numbers, so no timezone shifts. */
(function (root) {
  const LOC = () => (typeof window !== 'undefined' && window.NXL) ? window.NXL.loc() : 'en-US';
  const DAY = 864e5;
  const D = {
    toN(s) { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / DAY; },
    toS(n) { return new Date(n * DAY).toISOString().slice(0, 10); },
    add(s, k) { return D.toS(D.toN(s) + k); },
    diff(a, b) { return D.toN(b) - D.toN(a); },
    valid(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && D.toS(D.toN(s)) === s; },
    fmt(s, mode) {
      if (!s) return 'No date';
      if (mode === 'iso') return s;
      const d = new Date(D.toN(s) * DAY);
      if (mode === 'eu') return d.toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
      return d.toLocaleDateString(LOC(), { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }).replace(/ /g, '\u00a0');
    },
    short(s) {
      if (!s) return '—';
      return new Date(D.toN(s) * DAY).toLocaleDateString(LOC(), { timeZone: 'UTC', month: 'short', day: 'numeric' }).replace(/ /g, '\u00a0');
    }
  };

  /* apply scenario overrides to a node list without touching the originals */
  function withOverrides(nodes, ov) {
    ov = ov || {};
    return nodes.map(n => {
      const o = ov[n.id];
      if (!o) return n;
      return Object.assign({}, n, o, { rule: Object.assign({}, n.rule, o.rule || {}) });
    });
  }

  /* resolve every node's date from its rule; relative rules follow their anchor */
  function resolve(nodes) {
    const by = {}; nodes.forEach(n => { by[n.id] = n; });
    const dates = {}, visiting = {}, errors = [];
    function r(id) {
      if (id in dates) return dates[id];
      const n = by[id]; if (!n) return null;
      if (visiting[id]) { errors.push({ type: 'anchor_cycle', id, message: `"${n.title}" is anchored to itself through a chain of relative dates.` }); return null; }
      visiting[id] = true;
      const R = n.rule || { kind: 'flexible' };
      let v = null;
      if (R.kind === 'fixed' || R.kind === 'flexible') v = R.date || null;
      else if (R.kind === 'relative') { const a = r(R.anchor); v = a ? D.add(a, R.offset || 0) : null; }
      visiting[id] = false;
      dates[id] = v;
      return v;
    }
    nodes.forEach(n => r(n.id));
    return { dates, errors };
  }

  /* B depends on A when an edge goes from A to B; would adding from->to create a loop? */
  function wouldCycle(deps, from, to) {
    if (from === to) return true;
    const out = {}; deps.forEach(e => { (out[e.from] = out[e.from] || []).push(e.to); });
    const seen = new Set([to]), q = [to];
    while (q.length) { const x = q.shift(); if (x === from) return true; (out[x] || []).forEach(y => { if (!seen.has(y)) { seen.add(y); q.push(y); } }); }
    return false;
  }

  function graphCycles(deps) {
    const out = {}; deps.forEach(e => { (out[e.from] = out[e.from] || []).push(e.to); });
    const color = {}, found = [];
    function dfs(u, stack) {
      color[u] = 1; stack.push(u);
      for (const v of out[u] || []) {
        if (color[v] === 1) found.push(stack.slice(stack.indexOf(v)).concat(v));
        else if (!color[v]) dfs(v, stack);
      }
      stack.pop(); color[u] = 2;
    }
    Object.keys(out).forEach(u => { if (!color[u]) dfs(u, []); });
    return found;
  }

  /* ordering problems: B depends on A (finish to start) but B is due before A */
  function conflicts(nodes, deps, dates) {
    const by = {}; nodes.forEach(n => { by[n.id] = n; });
    const list = [];
    deps.forEach(e => {
      if (e.relation !== 'finish_to_start') return;
      const a = dates[e.from], b = dates[e.to];
      if (a && b && D.toN(a) > D.toN(b) && by[e.from] && by[e.to]) {
        list.push({ edge: e.id, from: e.from, to: e.to, fromDate: a, toDate: b });
      }
    });
    return list;
  }

  function title(by, id) { return by[id] ? by[id].title : 'a removed item'; }

  /* compare baseline with a scenario draft and explain every difference */
  function simulate(map, ov, fmtMode) {
    const nodes = map.nodes, deps = map.deps;
    const by = {}; nodes.forEach(n => { by[n.id] = n; });
    const base = resolve(nodes), draftNodes = withOverrides(nodes, ov), draft = resolve(draftNodes);
    const f = s => D.fmt(s, fmtMode);
    const items = {}; const order = [];
    const put = (id, obj) => { if (!items[id]) { items[id] = Object.assign({ id, title: by[id].title, category: by[id].category, kinds: [], reasons: [], baseDate: base.dates[id], draftDate: draft.dates[id] }, {}); order.push(id); } const it = items[id]; it.kinds.push(obj.kind); it.reasons.push(obj.reason); if (obj.chain) it.chain = obj.chain; if (obj.applicable) it.applicable = true; return it; };

    const moved = new Set();
    nodes.forEach(n => {
      const b = base.dates[n.id], d = draft.dates[n.id];
      if (ov && ov[n.id]) {
        moved.add(n.id);
        put(n.id, { kind: 'source', reason: `You changed this date in the scenario: ${f(b)} → ${f(d)}.` });
      } else if (b !== d) {
        moved.add(n.id);
        const R = n.rule, k = Math.abs(R.offset || 0);
        const rel = (R.offset || 0) < 0 ? `${k} days before` : (R.offset || 0) > 0 ? `${k} days after` : 'on the same day as';
        put(n.id, { kind: 'shift', applicable: true, reason: `${n.title} has a relative offset of ${rel} ${title(by, R.anchor)}, so its proposed date moves from ${f(b)} to ${f(d)}.` });
      }
    });

    /* items linked to a moved anchor but with no rule that defines their new date */
    nodes.forEach(n => {
      if (!n.reviewWith || !moved.has(n.reviewWith) || items[n.id]) return;
      const a = title(by, n.reviewWith);
      const reason = n.rule.kind === 'fixed'
        ? `${n.title} has a fixed date you chose (${f(base.dates[n.id])}). NEXORA never moves fixed dates. Check it manually against the new ${a} date.`
        : `${n.title} is linked to ${a}, but no rule defines its new date. Review it yourself before ${a}.`;
      put(n.id, { kind: 'manual', reason });
    });

    /* follow dependency arrows downstream from everything that moved */
    const out = {}; deps.forEach(e => { (out[e.from] = out[e.from] || []).push(e); });
    const parent = {}; const q = [...moved]; const seen = new Set(q);
    while (q.length) {
      const x = q.shift();
      (out[x] || []).forEach(e => {
        if (seen.has(e.to)) return; seen.add(e.to); parent[e.to] = x; q.push(e.to);
        if (!moved.has(e.to)) {
          const chain = []; let c = e.to; while (c !== undefined) { chain.unshift(title(by, c)); c = parent[c]; }
          if (!items[e.to] || !items[e.to].kinds.includes('chain'))
            put(e.to, { kind: 'chain', chain, reason: `${by[e.to].title} depends on ${title(by, x)}, which ${moved.has(x) ? 'moves to ' + f(draft.dates[x]) : 'needs review'}.` });
        }
      });
    }

    /* ordering problems in the draft */
    const baseConf = conflicts(nodes, deps, base.dates).map(c => c.edge);
    const dc = conflicts(draftNodes, deps, draft.dates);
    dc.forEach(c => {
      const isNew = !baseConf.includes(c.edge);
      put(c.to, { kind: 'conflict', reason: `${by[c.to].title} is due ${f(c.toDate)}, but it depends on ${by[c.from].title}, which now finishes ${f(c.fromDate)}.${isNew ? '' : ' This was already a problem in the baseline.'}` });
    });

    const list = order.map(id => {
      const it = items[id];
      const severity = it.kinds.includes('conflict') ? 'conflict' : it.kinds.includes('source') ? 'source' : 'review';
      const delta = it.baseDate && it.draftDate ? D.diff(it.baseDate, it.draftDate) : 0;
      return Object.assign(it, { severity, delta });
    });
    const rank = { source: 0, conflict: 1, review: 2 };
    list.sort((a, b) => rank[a.severity] - rank[b.severity] || (a.draftDate || '9').localeCompare(b.draftDate || '9'));
    const unchanged = nodes.filter(n => !items[n.id]).map(n => n.id);
    const litEdges = deps.filter(e => items[e.from] && items[e.to]).map(e => e.id);
    return { base: base.dates, draft: draft.dates, items: list, unchanged, conflicts: dc, litEdges, errors: draft.errors };
  }

  /* produce a new map with approved changes; the caller keeps the old one for undo */
  function applyScenario(map, ov, sim, selected) {
    const sel = new Set(selected);
    const nodes = withOverrides(map.nodes, ov).map(n => Object.assign({}, n, { rule: Object.assign({}, n.rule) }));
    const by = {}; nodes.forEach(n => { by[n.id] = n; });
    sim.items.forEach(it => {
      const n = by[it.id]; if (!n) return;
      if (it.kinds.includes('shift') && !sel.has(it.id)) {
        n.rule = { kind: 'fixed', date: it.baseDate };
        n.notes = ((n.notes || '') + `\nKept on ${it.baseDate} when the scenario was applied.`).trim();
      }
      if (!it.kinds.includes('source') && !it.kinds.includes('shift') && sel.has(it.id)) n.status = 'needs_review';
      if (it.kinds.includes('shift') && it.kinds.includes('conflict') && sel.has(it.id)) n.status = 'needs_review';
    });
    return Object.assign({}, map, { nodes, scenarios: map.scenarios });
  }

  /* next best step: earliest open task whose prerequisites are done */
  function nextStep(map, dates) {
    const by = {}; map.nodes.forEach(n => { by[n.id] = n; });
    const pre = {}; map.deps.forEach(e => { if (e.relation === 'finish_to_start') (pre[e.to] = pre[e.to] || []).push(e.from); });
    const open = map.nodes.filter(n => n.type !== 'milestone' && n.status !== 'done');
    const ready = open.filter(n => (pre[n.id] || []).every(p => by[p] && by[p].status === 'done'));
    ready.sort((a, b) => (dates[a.id] || '9999').localeCompare(dates[b.id] || '9999'));
    const n = ready[0]; if (!n) return null;
    const blocks = map.deps.filter(e => e.from === n.id).length;
    return { node: n, date: dates[n.id], reason: `Nothing blocks it${dates[n.id] ? ', it has the earliest due date among ready tasks' : ''}${blocks ? `, and ${blocks} other ${blocks === 1 ? 'task waits' : 'tasks wait'} for it` : ''}.` };
  }

  function blocked(map) {
    const by = {}; map.nodes.forEach(n => { by[n.id] = n; });
    return map.nodes.filter(n => n.status !== 'done' && n.status === 'blocked');
  }

  const api = { D, resolve, withOverrides, wouldCycle, graphCycles, conflicts, simulate, applyScenario, nextStep, blocked };
  root.NX = api;
})(typeof window !== "undefined" ? window : globalThis);

// ES module marker for Vite and TypeScript; the file still publishes its API on window.
export {};
