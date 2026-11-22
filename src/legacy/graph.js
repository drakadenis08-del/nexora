/* NEXORA Life Map canvas: HTML cards on an SVG edge layer, pan / zoom / drag / keyboard. */
(function (root) {
  const NW = 232, NH = 96, MW = 264, MH = 120;
  const size = n => n.type === 'milestone' ? [MW, MH] : [NW, NH];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  class Graph {
    constructor(el, o) {
      this.el = el; this.o = o || {};
      this.tx = 0; this.ty = 0; this.k = 1; this.pos = {}; this.anim = null;
      el.classList.add('gx');
      el.innerHTML = `<div class="g-world"><svg class="g-edges" aria-hidden="true"><defs>
        <marker id="${this.mid('a')}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1L9 5L0 9z" fill="#9AA3C7"/></marker>
        <marker id="${this.mid('h')}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1L9 5L0 9z" fill="#8B7CFF"/></marker>
        <marker id="${this.mid('c')}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1L9 5L0 9z" fill="#64B5F6"/></marker>
        </defs><g class="g-rays"></g><g class="g-paths"></g></svg><div class="g-nodes"></div><div class="g-labels"></div></div>
        ${this.o.mini ? '' : '<div class="g-mini" aria-hidden="true"><svg></svg></div>'}`;
      this.world = el.querySelector('.g-world'); this.svg = el.querySelector('.g-edges');
      this.paths = el.querySelector('.g-paths'); this.rays = el.querySelector('.g-rays');
      this.nodesEl = el.querySelector('.g-nodes'); this.labels = el.querySelector('.g-labels');
      this.miniEl = el.querySelector('.g-mini svg');
      if (!this.o.static) this.bind();
      this.ro = new ResizeObserver(() => { if (this.autoFit) this.fit(false); this.drawMini(); });
      this.ro.observe(el);
    }
    mid(s) { this._id = this._id || ('g' + Math.random().toString(36).slice(2, 7)); return this._id + s; }

    set(d) {
      /* d: { map, dates, sel, hl: {nodeId: 'source'|'shift'|'review'|'conflict'}, lit:Set, rays:[nodeIds], dim:Set, offsets:{id:dx}, fmt } */
      const first = !this.d;
      this.d = d;
      d.map.nodes.forEach(n => { if (!this.pos[n.id] || !this.dragging) this.pos[n.id] = { x: n.x + ((d.offsets && d.offsets[n.id]) || 0), y: n.y }; });
      Object.keys(this.pos).forEach(id => { if (!d.map.nodes.find(n => n.id === id)) delete this.pos[id]; });
      this.render();
      if (first) { this.autoFit = true; this.fit(false); }
    }

    /* tween cards toward target offsets: used by What If? to show proposed positions */
    animateTo(offsets, ms) {
      const from = {}, to = {};
      this.d.map.nodes.forEach(n => { from[n.id] = { ...this.pos[n.id] }; to[n.id] = { x: n.x + ((offsets && offsets[n.id]) || 0), y: n.y }; });
      this.d.offsets = offsets;
      cancelAnimationFrame(this.anim);
      if (!ms) { this.d.map.nodes.forEach(n => { this.pos[n.id] = to[n.id]; }); this.layout(); return; }
      const t0 = performance.now(), ez = t => 1 - Math.pow(1 - t, 3);
      const step = now => {
        const t = Math.min(1, (now - t0) / ms), e = ez(t);
        this.d.map.nodes.forEach(n => { this.pos[n.id] = { x: from[n.id].x + (to[n.id].x - from[n.id].x) * e, y: from[n.id].y + (to[n.id].y - from[n.id].y) * e }; });
        this.layout();
        if (t < 1) this.anim = requestAnimationFrame(step);
      };
      this.anim = requestAnimationFrame(step);
    }

    render() {
      const d = this.d, C = root.NXD.CATS, I = root.NXI, fmt = d.fmt || (s => s);
      const ST = root.NXSTATUS;
      this.nodesEl.innerHTML = d.map.nodes.map(n => {
        const c = C[n.category] || C.research, st = ST[n.status] || ST.todo, h = d.hl && d.hl[n.id];
        const cls = ['g-n', 'g-' + n.type, n.status === 'done' ? 'is-done' : '', n.status === 'blocked' ? 'is-blocked' : '', d.sel === n.id ? 'is-sel' : '', h ? 'hl-' + h : '', d.dim && d.dim.has(n.id) ? 'is-dim' : ''].join(' ');
        const date = d.dates[n.id];
        const hlTag = h === 'conflict' ? `<span class="g-flag f-conf">${I('alert', 12)}Potential conflict</span>` : h === 'review' ? `<span class="g-flag f-rev">${I('eye', 12)}Review</span>` : h === 'shift' ? `<span class="g-flag f-shift">${I('arrow', 12)}Date moves</span>` : h === 'source' ? `<span class="g-flag f-src">${I('branch', 12)}Changed</span>` : '';
        const rule = n.rule.kind === 'relative' ? `<span class="g-rule" title="Relative date">${I('link', 11)}${n.rule.offset > 0 ? '+' : ''}${n.rule.offset}d</span>` : n.rule.kind === 'fixed' ? `<span class="g-rule" title="Fixed date">${I('lock', 11)}Fixed</span>` : '';
        const label = `${n.title}. ${c.label}. ${st.label}. ${date ? 'Due ' + fmt(date) : 'No date'}.${h ? ' ' + ({ conflict: 'Potential conflict', review: 'Needs review in this scenario', shift: 'Proposed date change', source: 'Changed in this scenario' })[h] + '.' : ''}`;
        return `<div class="${cls}" data-id="${n.id}" tabindex="${this.o.static ? -1 : 0}" role="button" aria-pressed="${d.sel === n.id}" aria-label="${esc(label)}" style="--c:${c.color};--cs:${c.soft}">
          <div class="g-top"><span class="g-cat">${I(c.icon, 13)}${esc(c.label)}</span>${rule}</div>
          <div class="g-title">${esc(n.title)}</div>
          <div class="g-meta"><span class="g-date">${I('calendar', 12)}<b>${date ? fmt(date) : 'No date'}</b></span><span class="g-st st-${n.status}">${I(st.icon, 12)}${st.label}</span></div>${hlTag}</div>`;
      }).join('');
      this.layout();
    }

    rect(id) { const n = this.d.map.nodes.find(x => x.id === id); const [w, h] = size(n); const p = this.pos[id]; return { x: p.x, y: p.y, w, h, cx: p.x + w / 2, cy: p.y + h / 2 }; }

    edgePath(a, b) {
      const A = this.rect(a), B = this.rect(b);
      let s, e, c1, c2;
      const dx = B.cx - A.cx, dy = B.cy - A.cy;
      if (Math.abs(dx) >= Math.abs(dy) * 0.9 || Math.abs(dx) > (A.w + B.w) / 2 + 30) {
        const dir = dx >= 0 ? 1 : -1;
        s = [dir > 0 ? A.x + A.w : A.x, A.cy]; e = [dir > 0 ? B.x : B.x + B.w, B.cy];
        const k = Math.max(40, Math.abs(e[0] - s[0]) * 0.45);
        c1 = [s[0] + k * dir, s[1]]; c2 = [e[0] - k * dir, e[1]];
      } else {
        const dir = dy >= 0 ? 1 : -1;
        s = [A.cx, dir > 0 ? A.y + A.h : A.y]; e = [B.cx, dir > 0 ? B.y : B.y + B.h];
        const k = Math.max(30, Math.abs(e[1] - s[1]) * 0.45);
        c1 = [s[0], s[1] + k * dir]; c2 = [e[0], e[1] - k * dir];
      }
      const mid = [(s[0] + 3 * c1[0] + 3 * c2[0] + e[0]) / 8, (s[1] + 3 * c1[1] + 3 * c2[1] + e[1]) / 8];
      return { d: `M${s[0]},${s[1]} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${e[0]},${e[1]}`, mid };
    }

    layout() {
      const d = this.d; if (!d) return;
      this.nodesEl.querySelectorAll('.g-n').forEach(el => { const p = this.pos[el.dataset.id]; if (p) el.style.transform = `translate(${p.x}px,${p.y}px)`; });
      const by = {}; d.map.nodes.forEach(n => { by[n.id] = n; });
      const sel = d.sel, lit = d.lit || new Set();
      let labels = '';
      this.paths.innerHTML = d.map.deps.filter(e => by[e.from] && by[e.to]).map(e => {
        const p = this.edgePath(e.from, e.to);
        const on = lit.has(e.id) || (sel && (e.from === sel || e.to === sel));
        const conf = d.confEdges && d.confEdges.has(e.id);
        const dim = d.dim && (d.dim.has(e.from) || d.dim.has(e.to));
        const cls = ['g-e', e.relation === 'informational' ? 'is-info' : '', on ? 'is-on' : '', conf ? 'is-conf' : '', dim ? 'is-dim' : ''].join(' ');
        if (on || conf) labels += `<span class="g-lab${conf ? ' conf' : ''}" style="transform:translate(${p.mid[0]}px,${p.mid[1]}px) translate(-50%,-50%)">${conf ? 'Order conflict: ' : ''}${esc(by[e.to].title)} ${e.relation === 'informational' ? 'is linked to' : 'depends on'} ${esc(by[e.from].title)}</span>`;
        return `<path class="${cls}" d="${p.d}" marker-end="url(#${this.mid(conf ? 'c' : on ? 'h' : 'a')})"><title>${esc(by[e.to].title)} ${e.relation === 'informational' ? 'is linked to' : 'depends on'} ${esc(by[e.from].title)}</title></path>`;
      }).join('');
      /* dotted rays from an anchor to tasks with relative dates */
      this.rays.innerHTML = (d.rays || []).map(id => {
        const n = by[id]; if (!n || n.rule.kind !== 'relative' || !by[n.rule.anchor]) return '';
        const A = this.rect(n.rule.anchor), B = this.rect(id);
        return `<line class="g-ray" x1="${A.cx}" y1="${A.cy}" x2="${B.cx}" y2="${B.cy}"/>`;
      }).join('');
      this.labels.innerHTML = labels;
      this.labels.style.display = this.k < 0.62 ? 'none' : '';
      this.world.style.transform = `translate(${this.tx}px,${this.ty}px) scale(${this.k})`;
      this.drawMini();
    }

    bounds() {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      this.d.map.nodes.forEach(n => { const r = this.rect(n.id); x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); });
      if (x0 > x1) { x0 = 0; y0 = 0; x1 = 600; y1 = 400; }
      return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
    }

    fit(anim) {
      if (!this.d) return;
      const b = this.bounds(), W = this.el.clientWidth, H = this.el.clientHeight; if (!W || !H) return;
      const pad = this.o.pad || 48, mx = this.o.maxScale || 1.15;
      this.k = Math.max(0.25, Math.min(mx, (W - pad * 2) / b.w, (H - pad * 2) / b.h));
      this.tx = (W - b.w * this.k) / 2 - b.x0 * this.k; this.ty = (H - b.h * this.k) / 2 - b.y0 * this.k;
      this.world.classList.toggle('smooth', !!anim);
      this.layout();
      if (anim) setTimeout(() => this.world.classList.remove('smooth'), 420);
    }
    zoomBy(f, cx, cy) {
      const W = this.el.clientWidth, H = this.el.clientHeight; cx = cx == null ? W / 2 : cx; cy = cy == null ? H / 2 : cy;
      const k = Math.max(0.25, Math.min(2.2, this.k * f)); const r = k / this.k;
      this.tx = cx - (cx - this.tx) * r; this.ty = cy - (cy - this.ty) * r; this.k = k; this.autoFit = false; this.layout();
    }
    center(id) {
      const r = this.rect(id), W = this.el.clientWidth, H = this.el.clientHeight;
      const sx = r.cx * this.k + this.tx, sy = r.cy * this.k + this.ty;
      if (sx > 40 && sx < W - 40 && sy > 40 && sy < H - 40) return;
      this.tx = W / 2 - r.cx * this.k; this.ty = H / 2 - r.cy * this.k; this.autoFit = false;
      this.world.classList.add('smooth'); this.layout(); setTimeout(() => this.world.classList.remove('smooth'), 420);
    }

    drawMini() {
      if (!this.miniEl || !this.d) return;
      const b = this.bounds(), mw = 168, mh = 104, pad = 8;
      const s = Math.min((mw - pad * 2) / b.w, (mh - pad * 2) / b.h);
      const ox = (mw - b.w * s) / 2 - b.x0 * s, oy = (mh - b.h * s) / 2 - b.y0 * s;
      this.mini = { s, ox, oy };
      const C = root.NXD.CATS, W = this.el.clientWidth, H = this.el.clientHeight;
      const vx = (-this.tx / this.k) * s + ox, vy = (-this.ty / this.k) * s + oy, vw = (W / this.k) * s, vh = (H / this.k) * s;
      this.miniEl.setAttribute('viewBox', `0 0 ${mw} ${mh}`);
      this.miniEl.innerHTML = this.d.map.nodes.map(n => { const r = this.rect(n.id); return `<rect x="${r.x * s + ox}" y="${r.y * s + oy}" width="${r.w * s}" height="${r.h * s}" rx="2" fill="${(C[n.category] || C.research).color}" opacity="${this.d.sel === n.id ? 1 : .55}"/>`; }).join('') +
        `<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" rx="3" fill="rgba(139,124,255,.06)" stroke="#8B7CFF" stroke-width="1.2"/>`;
    }

    bind() {
      const el = this.el;
      let mode = null, sx = 0, sy = 0, ox = 0, oy = 0, nid = null, moved = false, pid = null;
      el.addEventListener('pointerdown', e => {
        if (e.button !== 0 || e.target.closest('.g-mini,.g-ui')) return;
        const card = e.target.closest('.g-n');
        sx = e.clientX; sy = e.clientY; moved = false; pid = e.pointerId;
        if (card) { mode = 'node'; nid = card.dataset.id; ox = this.pos[nid].x; oy = this.pos[nid].y; }
        else { mode = 'pan'; ox = this.tx; oy = this.ty; el.classList.add('is-panning'); }
      });
      window.addEventListener('pointermove', e => {
        if (!mode || e.pointerId !== pid) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (!moved && Math.hypot(dx, dy) < 5) return;
        if (!moved) { moved = true; try { el.setPointerCapture(pid); } catch (_) {} }
        if (mode === 'pan') { this.tx = ox + dx; this.ty = oy + dy; this.autoFit = false; this.layout(); }
        else if (mode === 'node' && !this.o.readonly) { this.dragging = true; this.pos[nid] = { x: ox + dx / this.k, y: oy + dy / this.k }; this.layout(); }
      });
      const up = e => {
        if (!mode || e.pointerId !== pid) return;
        el.classList.remove('is-panning');
        if (mode === 'node') {
          if (moved && !this.o.readonly) { this.dragging = false; const p = this.pos[nid]; this.o.onMove && this.o.onMove(nid, Math.round(p.x - ((this.d.offsets && this.d.offsets[nid]) || 0)), Math.round(p.y)); }
          else if (!moved) this.o.onSelect && this.o.onSelect(nid);
        } else if (!moved) this.o.onSelect && this.o.onSelect(null);
        mode = null;
      };
      window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
      el.addEventListener('wheel', e => {
        e.preventDefault();
        const r = el.getBoundingClientRect();
        if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.shiftKey && e.deltaMode === 0 && Math.abs(e.deltaY) < 60 && false) { this.zoomBy(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top); return; }
        this.zoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
      }, { passive: false });
      el.addEventListener('keydown', e => {
        const card = e.target.closest && e.target.closest('.g-n');
        if (card) {
          const id = card.dataset.id;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.o.onSelect && this.o.onSelect(id); return; }
          if (e.key.startsWith('Arrow')) {
            e.preventDefault();
            if (e.shiftKey && !this.o.readonly) { const st = 20, p = this.pos[id]; const dx = e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0, dy = e.key === 'ArrowUp' ? -st : e.key === 'ArrowDown' ? st : 0; this.pos[id] = { x: p.x + dx, y: p.y + dy }; this.layout(); this.o.onMove && this.o.onMove(id, Math.round(this.pos[id].x), Math.round(this.pos[id].y)); return; }
            const n = this.nearest(id, e.key); if (n) { const t = this.nodesEl.querySelector(`[data-id="${n}"]`); t && t.focus(); this.center(n); }
            return;
          }
        }
        if (e.key === 'Escape') this.o.onSelect && this.o.onSelect(null);
      });
      el.addEventListener('focusin', e => { const c = e.target.closest && e.target.closest('.g-n'); if (c) this.center(c.dataset.id); });
      if (this.miniEl) this.miniEl.parentElement.addEventListener('click', e => {
        if (!this.mini) return; const r = this.miniEl.getBoundingClientRect();
        const wx = ((e.clientX - r.left) * (168 / r.width) - this.mini.ox) / this.mini.s, wy = ((e.clientY - r.top) * (104 / r.height) - this.mini.oy) / this.mini.s;
        this.tx = this.el.clientWidth / 2 - wx * this.k; this.ty = this.el.clientHeight / 2 - wy * this.k; this.autoFit = false;
        this.world.classList.add('smooth'); this.layout(); setTimeout(() => this.world.classList.remove('smooth'), 420);
      });
    }

    nearest(id, key) {
      const a = this.rect(id); let best = null, bd = 1e9;
      this.d.map.nodes.forEach(n => {
        if (n.id === id) return; const b = this.rect(n.id); const dx = b.cx - a.cx, dy = b.cy - a.cy;
        const ok = key === 'ArrowRight' ? dx > 20 : key === 'ArrowLeft' ? dx < -20 : key === 'ArrowDown' ? dy > 20 : dy < -20;
        if (!ok) return;
        const along = key === 'ArrowRight' || key === 'ArrowLeft' ? Math.abs(dx) : Math.abs(dy), across = key === 'ArrowRight' || key === 'ArrowLeft' ? Math.abs(dy) : Math.abs(dx);
        const s = along + across * 2.2; if (s < bd) { bd = s; best = n.id; }
      });
      return best;
    }
    destroy() { this.ro.disconnect(); cancelAnimationFrame(this.anim); }
  }
  root.NXGraph = Graph;
})(typeof window !== "undefined" ? window : globalThis);

// ES module marker for Vite and TypeScript; the file still publishes its API on window.
export {};
