/* NEXORA i18n: the UI is written in English; this layer translates rendered text in place.
   Exact strings come from NXDICT[lang], strings with numbers or names from NXPAT. Originals are kept on each node,
   so switching language always translates from English. User-typed text that matches no entry stays as typed. */
(function () {
  const LANGS = [['en', 'EN', 'English', 'en-US'], ['uk', 'UA', 'Українська', 'uk-UA'], ['de', 'DE', 'Deutsch', 'de-DE'], ['pl', 'PL', 'Polski', 'pl-PL']];
  const KEY = 'nexora-lang';
  let lang = 'en';
  try { const s = localStorage.getItem(KEY); if (LANGS.some(l => l[0] === s)) lang = s; } catch (e) { }
  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt', 'aria-roledescription'];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE']);
  const cache = new Map();
  const miss = window.__nxMiss = new Set();
  const norm = s => s.replace(/[ \t\n\r\f]+/g, ' ').replace(/^ | $/g, '');
  const hasLetters = s => /[A-Za-z]/.test(s);

  /* plural helper: forms per language. en [one, other]; uk/pl [one, few, many]; de [one, other] */
  function plural(n, forms, lg) {
    n = Math.abs(+n); lg = lg || lang;
    if (lg === 'uk' || lg === 'pl') {
      const m10 = n % 10, m100 = n % 100;
      if (lg === 'uk') { if (m10 === 1 && m100 !== 11) return forms[0]; if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]; return forms[2]; }
      if (n === 1) return forms[0]; if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]; return forms[2];
    }
    return n === 1 ? forms[0] : forms[1];
  }

  function tr(src) {
    if (lang === 'en' || !src) return src;
    const key = norm(src);
    if (!key || !hasLetters(key)) return src;
    const c = cache.get(key); if (c !== undefined) return c === null ? src : keepWs(src, c);
    let out = lookup(key);
    if (out !== null) out = out.replace(/(^|[^.])\.\.(?!\.)/g, '$1.');
    cache.set(key, out);
    if (out === null) { miss.add(key); return src; }
    return keepWs(src, out);
  }
  function keepWs(src, out) { const a = src.match(/^\s*/)[0], b = src.match(/\s*$/)[0]; return a + out + b; }
  function lookup(key) {
    const d = (window.NXDICT && NXDICT[lang]) || {};
    if (Object.prototype.hasOwnProperty.call(d, key)) return d[key];
    /* composed text: translate sentence by sentence, merging pieces until each one is known */
    const parts = key.split(/(?<=[.!?…:])[ ](?=[A-Z“(])/);
    if (parts.length > 1) {
      const out = []; let buf = '', ok = true;
      for (const p of parts) { buf = buf ? buf + ' ' + p : p; const t = lookup1(buf); if (t !== null) { out.push(t); buf = ''; } }
      if (!buf) return out.join(' ');
    }
    return pattern(key);
  }
  function lookup1(key) {
    const d = (window.NXDICT && NXDICT[lang]) || {};
    if (Object.prototype.hasOwnProperty.call(d, key)) return d[key];
    return pattern(key);
  }
  let subFail = false;
  function pattern(key) {
    const pats = window.NXPAT || [];
    for (const [re, rep] of pats) {
      const m = key.match(re); if (!m) continue;
      const r = rep[lang]; if (r == null) continue;
      const outer = subFail; subFail = false;
      const out = typeof r === 'function' ? r(m, sub, plural) : r.replace(/\{(t?)(\d)\}/g, (_, t, i) => t ? sub(m[+i]) : (m[+i] || ''));
      const failed = subFail; subFail = outer;
      if (rep.strict && failed) continue;
      return out;
    }
    return null;
  }
  function sub(s) {
    if (!s) return ''; s = norm(s);
    let o = lookup(s); if (o !== null) return o;
    const cap = s.charAt(0).toUpperCase() + s.slice(1);
    if (cap !== s) { o = lookup(cap); if (o !== null) return lang === 'de' ? o : o.charAt(0).toLowerCase() + o.slice(1); }
    subFail = true; return s;
  }

  /* ---- DOM pass ---- */
  let busy = false;
  function skipEl(el) { return !el || SKIP.has(el.nodeName) || el.closest('[translate="no"],[contenteditable="true"]'); }
  function doText(n) {
    if (n.__nxt !== undefined && n.data === n.__nxt) { /* ours */ } else n.__nxo = n.data;
    const out = tr(n.__nxo);
    n.__nxt = out; if (n.data !== out) n.data = out;
  }
  function doAttrs(el) {
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const v = el.getAttribute(a), k = '__nxa_' + a;
      if (!(el[k] && el[k].t === v)) el[k] = { o: v };
      const out = tr(el[k].o); el[k].t = out; if (v !== out) el.setAttribute(a, out);
    }
    if (el.nodeName === 'INPUT' && (el.type === 'text' || el.type === 'button') && el.hasAttribute('value') && document.activeElement !== el) {
      const v = el.getAttribute('value'), k = '__nxa_value';
      if (!(el[k] && el[k].t === v)) el[k] = { o: v };
      const key = norm(el[k].o), d = (window.NXDICT && NXDICT[lang]) || {};
      const out = lang === 'en' ? el[k].o : (Object.prototype.hasOwnProperty.call(d, key) ? d[key] : el[k].o);
      el[k].t = out; if (v !== out) { el.setAttribute('value', out); if (el.value === v) el.value = out; }
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { if (!skipEl(root.parentElement)) doText(root); return; }
    if (root.nodeType !== 1 || skipEl(root)) return;
    doAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: n => n.nodeType === 1 ? (SKIP.has(n.nodeName) || n.getAttribute('translate') === 'no' || n.getAttribute('contenteditable') === 'true' ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) : NodeFilter.FILTER_ACCEPT
    });
    let n; while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  const mo = new MutationObserver(recs => {
    if (busy) return; busy = true;
    try {
      for (const r of recs) {
        if (r.type === 'childList') r.addedNodes.forEach(walk);
        else if (r.type === 'characterData') { if (!skipEl(r.target.parentElement)) doText(r.target); }
        else if (r.type === 'attributes' && !skipEl(r.target)) doAttrs(r.target);
      }
    } finally { mo.takeRecords(); busy = false; }
  });
  function start() {
    document.documentElement.lang = lang === 'uk' ? 'uk' : lang;
    walk(document.documentElement);
    mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat('value') });
  }

  function setLang(l) {
    if (!LANGS.some(x => x[0] === l) || l === lang) return;
    lang = l; cache.clear();
    try { localStorage.setItem(KEY, l); } catch (e) { }
    document.documentElement.lang = l;
    busy = true; walk(document.documentElement); mo.takeRecords(); busy = false;
    window.dispatchEvent(new CustomEvent('nx-lang', { detail: l }));
  }

  /* language picker markup; any [data-lang] button switches */
  function picker(cls) {
    return `<div class="lang ${cls || ''}" role="group" aria-label="Language">${LANGS.map(([k, s, full]) => `<button type="button" data-lang="${k}" aria-pressed="${k === lang}" title="${full}" lang="${k}">${s}</button>`).join('')}</div>`
      + `<label class="lang-sel ${cls || ''}"><span class="sr">Language</span><select data-langsel>${LANGS.map(([k, s, full]) => `<option value="${k}"${k === lang ? ' selected' : ''}>${s}</option>`).join('')}</select></label>`;
  }
  const sync = () => { document.querySelectorAll('[data-lang]').forEach(x => x.setAttribute('aria-pressed', x.dataset.lang === lang)); document.querySelectorAll('[data-langsel]').forEach(x => { x.value = lang; }); };
  document.addEventListener('change', e => { const s = e.target.closest('[data-langsel]'); if (s) { setLang(s.value); sync(); } });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-lang]'); if (!b) return;
    setLang(b.dataset.lang); sync();
  });

  window.NXL = {
    get lang() { return lang; }, LANGS, setLang, t: tr, plural, picker, start,
    loc() { return (LANGS.find(l => l[0] === lang) || LANGS[0])[3]; }
  };
})();

// ES module marker for Vite and TypeScript; the file still publishes its API on window.
export {};
