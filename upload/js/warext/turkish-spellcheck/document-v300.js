(() => {
  'use strict';

  if (window.WarextDocumentV300?.VERSION === '3.1.3') return;
  const core = window.WarextTextCoreV110;
  const engine = window.WarextTurkishSpellEngineV110;
  const guard = window.WarextPerformanceGuardV313;
  if (!core?.sentenceSegments || !engine?.analyzeParagraph || !guard) return;

  const VERSION = '3.1.3';
  const CACHE_LIMIT = 12;
  const DEEP_SETTLE_MS = 2550;
  const LIVE_DELAY_MS = 760;
  const MAX_ITEMS = 18;
  const states = new WeakMap();
  const stateList = new Set();
  const observedRoots = new WeakSet();
  const cache = new Map();
  const LABELS = new Map([
    ['spelling','Yazım'],['grammar','Dilbilgisi'],['punctuation','Noktalama'],['semantic','Anlam'],['syntax','Sözdizimi'],['discourse','Bağlam'],['style','Anlatım'],['logic','Mantık']
  ]);

  function isMessageTextarea(el) {
    return el instanceof HTMLTextAreaElement && (el.name === 'message' || el.dataset.originalName === 'message' || el.matches('textarea.js-editor[data-xf-init~="editor"]'));
  }

  function isRichEditor(el) {
    return el instanceof HTMLElement && el.isContentEditable && (el.classList.contains('fr-element') || !!el.closest('.fr-box'));
  }

  function editorElements(root = document) {
    const out = [];
    if (root instanceof Element && (isMessageTextarea(root) || isRichEditor(root))) out.push(root);
    root.querySelectorAll?.('textarea[name="message"],textarea.js-editor[data-xf-init~="editor"],.fr-element[contenteditable="true"]').forEach(el => {
      if (isMessageTextarea(el) || isRichEditor(el)) out.push(el);
    });
    return [...new Set(out)];
  }

  function snapshot(el) {
    if (el instanceof HTMLTextAreaElement) return el.value || '';
    if (!isRichEditor(el)) return '';
    return String(el.innerText || el.textContent || '');
  }

  function inputPending() {
    try { return !!navigator.scheduling?.isInputPending?.({includeContinuous:true}); }
    catch (_) { return false; }
  }

  function hash(text,mode) {
    let value = 2166136261;
    for (let i = 0; i < text.length; i++) {
      value ^= text.charCodeAt(i);
      value = Math.imul(value,16777619);
    }
    return `${mode}:${text.length}:${value >>> 0}`;
  }

  function cacheGet(text,mode) {
    const key = hash(text,mode);
    const entry = cache.get(key);
    if (!entry || entry.text !== text) return null;
    cache.delete(key);
    cache.set(key,entry);
    return entry;
  }

  function cachePut(text,mode,report,items,sentenceCount) {
    const key = hash(text,mode);
    cache.delete(key);
    cache.set(key,{text,mode,report,items,sentenceCount});
    while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  }

  function installStyle() {
    if (document.getElementById('wtsc-document-adaptive-v313-style')) return;
    const style = document.createElement('style');
    style.id = 'wtsc-document-adaptive-v313-style';
    style.textContent = `
      ::highlight(wtsc-document-v313){text-decoration:underline wavy #b87400;text-decoration-thickness:1px;text-underline-offset:3px}
      .wtsc-document-v313{margin:8px 0 4px;border:1px solid rgba(127,127,127,.28);border-radius:10px;overflow:hidden;font-size:12px;line-height:1.45}
      .wtsc-document-v313-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;background:rgba(127,127,127,.08)}
      .wtsc-document-v313-title{font-weight:700}.wtsc-document-v313-score{font-size:11px;font-weight:700;white-space:nowrap}
      .wtsc-document-v313-summary{display:flex;flex-wrap:wrap;gap:5px;padding:6px 10px;border-top:1px solid rgba(127,127,127,.12)}
      .wtsc-document-v313-chip{padding:2px 6px;border:1px solid rgba(127,127,127,.2);border-radius:999px;opacity:.82}
      .wtsc-document-v313-item{padding:7px 10px;border-top:1px solid rgba(127,127,127,.14)}
      .wtsc-document-v313-meta{display:block;margin-bottom:2px;font-size:10px;font-weight:700;opacity:.65;text-transform:uppercase}
      .wtsc-document-v313-fix{appearance:none;margin-top:5px;border:1px solid rgba(127,127,127,.28);border-radius:6px;background:rgba(127,127,127,.08);color:inherit;padding:5px 8px;font:inherit;font-size:11px;cursor:pointer}
      .wtsc-document-v313-empty{padding:7px 10px;border-top:1px solid rgba(127,127,127,.14);opacity:.72}
    `;
    document.head.appendChild(style);
  }

  function owner(el) {
    return isRichEditor(el) ? el.closest('.fr-box') || el : el;
  }

  function ensurePanel(el) {
    const target = owner(el);
    if (target.__wtscDocumentV313?.isConnected) return target.__wtscDocumentV313;
    const panel = document.createElement('div');
    panel.className = 'wtsc-document-v313';
    panel.dataset.wtscDocumentVersion = VERSION;
    if (isRichEditor(el)) (el.closest('.fr-box') || el).insertAdjacentElement('afterend',panel);
    else (el.closest('.inputGroup') || el).insertAdjacentElement('afterend',panel);
    target.__wtscDocumentV313 = panel;
    return panel;
  }

  function rangeIndex(el) {
    const entries = [];
    if (!isRichEditor(el)) return entries;
    const walker = document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    let offset = 0;
    let node;
    while ((node = walker.nextNode())) {
      const length = node.nodeValue?.length || 0;
      entries.push({node,start:offset,end:offset + length});
      offset += length;
    }
    return entries;
  }

  function makeRange(index,start,end) {
    if (end <= start) return null;
    const first = index.find(item => start >= item.start && start <= item.end);
    const last = index.find(item => end >= item.start && end <= item.end);
    if (!first || !last) return null;
    try {
      const range = document.createRange();
      range.setStart(first.node,Math.max(0,Math.min(start - first.start,first.node.nodeValue?.length || 0)));
      range.setEnd(last.node,Math.max(0,Math.min(end - last.start,last.node.nodeValue?.length || 0)));
      return range;
    } catch (_) { return null; }
  }

  function refreshHighlights() {
    if (typeof CSS === 'undefined' || !CSS.highlights || typeof Highlight === 'undefined') return;
    const ranges = [];
    for (const st of [...stateList]) {
      if (!st.el?.isConnected) {
        stateList.delete(st);
        continue;
      }
      if (!isRichEditor(st.el) || !st.items.length) continue;
      const index = rangeIndex(st.el);
      for (const item of st.items) {
        const range = makeRange(index,item.start,item.end);
        if (range) ranges.push(range);
      }
    }
    if (ranges.length) CSS.highlights.set('wtsc-document-v313',new Highlight(...ranges));
    else CSS.highlights.delete('wtsc-document-v313');
  }

  function replaceRange(el,item,replacement) {
    if (el instanceof HTMLTextAreaElement) {
      const value = el.value || '';
      el.value = value.slice(0,item.start) + replacement + value.slice(item.end);
      const position = item.start + replacement.length;
      el.setSelectionRange?.(position,position);
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.focus();
      return true;
    }
    const range = makeRange(rangeIndex(el),item.start,item.end);
    if (!range) return false;
    range.deleteContents();
    const node = document.createTextNode(replacement);
    range.insertNode(node);
    const selection = window.getSelection();
    const after = document.createRange();
    after.setStartAfter(node);
    after.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(after);
    try { el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertReplacementText',data:replacement})); }
    catch (_) { el.dispatchEvent(new Event('input',{bubbles:true})); }
    el.focus();
    return true;
  }

  function render(st) {
    const panel = ensurePanel(st.el);
    panel.textContent = '';
    if (!st.report) {
      panel.style.display = 'none';
      return;
    }
    panel.style.display = '';
    const coherence = st.report.coherence || st.report.semanticDocument?.coherence || {};
    const score = Number.isFinite(Number(coherence.score)) ? Number(coherence.score) : 100;
    const head = document.createElement('div');
    head.className = 'wtsc-document-v313-head';
    const title = document.createElement('span');
    title.className = 'wtsc-document-v313-title';
    title.textContent = st.mode === 'settled-hierarchical' ? `Genel anlam analizi · ${st.sentenceCount} cümle` : `Canlı metin denetimi · ${st.sentenceCount} cümle`;
    const scoreEl = document.createElement('span');
    scoreEl.className = 'wtsc-document-v313-score';
    scoreEl.textContent = `Bütünlük ${score}/100`;
    head.append(title,scoreEl);
    panel.appendChild(head);

    const summary = document.createElement('div');
    summary.className = 'wtsc-document-v313-summary';
    for (const label of [`${st.items.length} bulgu`,st.mode === 'settled-hierarchical' ? 'Derin tarama' : 'Hızlı tarama',`${Math.round(st.elapsed)} ms`]) {
      const chip = document.createElement('span');
      chip.className = 'wtsc-document-v313-chip';
      chip.textContent = label;
      summary.appendChild(chip);
    }
    panel.appendChild(summary);

    if (!st.items.length) {
      const empty = document.createElement('div');
      empty.className = 'wtsc-document-v313-empty';
      empty.textContent = st.mode === 'settled-hierarchical' ? 'Yüksek güvenli bir paragraf bütünlüğü sorunu bulunmadı.' : 'Değişen bölümde yüksek güvenli bir sorun bulunmadı.';
      panel.appendChild(empty);
      return;
    }

    for (const item of st.items.slice(0,MAX_ITEMS)) {
      const row = document.createElement('div');
      row.className = 'wtsc-document-v313-item';
      const meta = document.createElement('span');
      meta.className = 'wtsc-document-v313-meta';
      meta.textContent = `${LABELS.get(String(item.category || '').toLocaleLowerCase('tr-TR')) || 'Metin'} · ${Math.round((item.confidence || 0.75) * 100)}%`;
      const message = document.createElement('span');
      message.textContent = item.message || 'Metnin bu bölümünü kontrol edin.';
      row.append(meta,message);
      const suggestion = item.suggestions?.[0];
      if (suggestion != null && String(suggestion) !== '') {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'wtsc-document-v313-fix';
        button.textContent = `Düzelt: ${suggestion}`;
        button.addEventListener('click',() => {
          if (replaceRange(st.el,item,String(suggestion))) scheduleLive(st,80);
        });
        row.appendChild(button);
      }
      panel.appendChild(row);
    }
  }

  function filterItems(text,report) {
    const combined = [...(report?.fixes || []),...(report?.warnings || [])];
    const out = [];
    const seen = new Set();
    for (const item of combined) {
      if (!item || item.end < item.start) continue;
      const confidence = item.confidence == null ? 0.72 : Number(item.confidence);
      if (confidence < 0.68) continue;
      if (String(item.category || '').toLocaleLowerCase('tr-TR') === 'spelling') {
        const raw = text.slice(item.start,item.end).trim();
        if (raw && !/\s/u.test(raw)) {
          try { if (engine.isValid?.(raw)) continue; } catch (_) {}
        }
      }
      const key = `${item.start}:${item.end}:${item.rule || item.category || ''}:${item.message || ''}:${item.suggestions?.[0] || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out.sort((a,b) => (b.confidence || 0) - (a.confidence || 0) || a.start - b.start).slice(0,36);
  }

  function apply(st,text,report,items,sentenceCount,mode,elapsed,source) {
    if (!st.el?.isConnected) return;
    st.report = report;
    st.items = items;
    st.sentenceCount = sentenceCount;
    st.lastText = text;
    st.mode = mode;
    st.elapsed = elapsed;
    st.scans++;
    st.el.dataset.wtscDocumentState = 'ready';
    st.el.dataset.wtscDocumentMode = mode;
    st.el.dataset.wtscDocumentSource = source;
    st.el.dataset.wtscDocumentIssues = String(items.length);
    st.el.dataset.wtscDocumentSentences = String(sentenceCount);
    st.el.dataset.wtscDocumentAnalysisMs = String(Math.round(elapsed));
    st.el.dataset.wtscDocumentScans = String(st.scans);
    render(st);
    refreshHighlights();
  }

  function cancel(st) {
    clearTimeout(st.liveTimer);
    clearTimeout(st.deepTimer);
    st.liveTimer = 0;
    st.deepTimer = 0;
    st.scanId++;
  }

  function analyze(st,deep) {
    if (!st.el?.isConnected || document.visibilityState !== 'visible') return;
    if (!deep && inputPending()) {
      scheduleLive(st,180);
      return;
    }
    const text = snapshot(st.el);
    const sentenceCount = core.sentenceSegments(text).length;
    const mode = deep ? 'settled-hierarchical' : 'live-window';
    st.scanId++;
    const scanId = st.scanId;
    if (text.length < 90 || sentenceCount < 2) {
      st.report = null;
      st.items = [];
      st.sentenceCount = sentenceCount;
      st.lastText = text;
      st.mode = 'short';
      st.el.dataset.wtscDocumentState = 'short';
      render(st);
      refreshHighlights();
      return;
    }
    if (text === st.lastText && st.report && !(deep && st.mode === 'live-window')) {
      st.el.dataset.wtscDocumentSource = 'unchanged';
      return;
    }
    const cached = cacheGet(text,mode);
    if (cached) {
      st.cacheHits++;
      apply(st,text,cached.report,cached.items.map(item => ({...item})),cached.sentenceCount,mode,0,'cache');
      return;
    }
    st.el.dataset.wtscDocumentState = deep ? 'deep-analyzing' : 'live-analyzing';
    const started = performance.now();
    let report = {warnings:[],fixes:[],coherence:{score:100}};
    try {
      report = engine.analyzeParagraph(text,{semantic:true,punctuation:true,properNames:true,longText:true,fullParagraph:true,settled:deep,forceDeep:deep}) || report;
    } catch (_) {}
    if (scanId !== st.scanId || !st.el?.isConnected) return;
    const elapsed = performance.now() - started;
    const resultMode = report?.adaptivePerformance?.mode || mode;
    const items = filterItems(text,report);
    cachePut(text,resultMode,report,items.map(item => ({...item})),sentenceCount);
    apply(st,text,report,items,sentenceCount,resultMode,elapsed,'analysis');
    if (!deep && resultMode === 'live-window') scheduleDeep(st,DEEP_SETTLE_MS);
  }

  function scheduleLive(st,delay = LIVE_DELAY_MS) {
    clearTimeout(st.liveTimer);
    st.scanId++;
    st.liveTimer = setTimeout(() => {
      st.liveTimer = 0;
      analyze(st,false);
    },delay);
  }

  function scheduleDeep(st,delay = DEEP_SETTLE_MS) {
    clearTimeout(st.deepTimer);
    st.deepTimer = setTimeout(() => {
      st.deepTimer = 0;
      guard.markSettled?.();
      analyze(st,true);
    },delay);
  }

  function attach(el) {
    if (!el || states.has(el) || !(isMessageTextarea(el) || isRichEditor(el))) return;
    const st = {el,items:[],report:null,sentenceCount:0,mode:'',elapsed:0,lastText:'',liveTimer:0,deepTimer:0,scanId:0,scans:0,cacheHits:0};
    states.set(el,st);
    stateList.add(st);
    el.dataset.wtscDocumentV313Bound = '1';
    el.dataset.wtscDocumentRuntime = VERSION;
    const changed = () => {
      clearTimeout(st.deepTimer);
      scheduleLive(st,LIVE_DELAY_MS);
      scheduleDeep(st,DEEP_SETTLE_MS);
    };
    el.addEventListener('input',changed,{passive:true});
    el.addEventListener('paste',() => {
      clearTimeout(st.deepTimer);
      scheduleLive(st,260);
      scheduleDeep(st,DEEP_SETTLE_MS);
    },{passive:true});
    el.addEventListener('cut',() => {
      clearTimeout(st.deepTimer);
      scheduleLive(st,280);
      scheduleDeep(st,DEEP_SETTLE_MS);
    },{passive:true});
    el.addEventListener('focus',() => scheduleLive(st,900),{passive:true});
    el.addEventListener('blur',() => {
      clearTimeout(st.liveTimer);
      scheduleDeep(st,140);
    },{passive:true});
    scheduleLive(st,1000);
  }

  function observe(root = document) {
    if (!root || observedRoots.has(root)) return;
    observedRoots.add(root);
    editorElements(root).forEach(attach);
    const target = root === document ? document.documentElement : root;
    if (!target) return;
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) for (const node of mutation.addedNodes) if (node instanceof Element) editorElements(node).forEach(attach);
    });
    observer.observe(target,{childList:true,subtree:true});
  }

  function rescan(root = document) {
    editorElements(root).forEach(el => {
      const st = states.get(el);
      if (st) scheduleDeep(st,60);
      else attach(el);
    });
  }

  window.__warextDocumentV300 = true;
  window.WarextDocumentV300 = Object.freeze({
    VERSION,
    rescan,
    getReport:el => states.get(el)?.report || null,
    getIssues:el => (states.get(el)?.items || []).map(item => ({...item,suggestions:[...(item.suggestions || [])]})),
    getPerformance:el => {
      const st = states.get(el);
      return st ? {version:VERSION,scans:st.scans,cacheHits:st.cacheHits,cacheEntries:cache.size,lastTextLength:st.lastText.length,mode:st.mode,lastAnalysisMs:Math.round(st.elapsed)} : null;
    },
    clearCache:() => cache.clear(),
    forceDeep:el => {
      const st = states.get(el);
      if (st) scheduleDeep(st,0);
    }
  });

  installStyle();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',() => observe(document),{once:true});
  else observe(document);
  document.addEventListener('visibilitychange',() => {
    if (document.visibilityState === 'visible') for (const st of stateList) if (st.el?.isConnected) scheduleDeep(st,180);
  },{passive:true});
})();