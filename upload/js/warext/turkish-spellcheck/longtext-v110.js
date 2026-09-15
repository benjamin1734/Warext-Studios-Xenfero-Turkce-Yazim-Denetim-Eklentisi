(() => {
  'use strict';

  if (window.__warextLongTextV110) return;
  window.__warextLongTextV110 = true;

  const VERSION = '2.1.0';
  const core = window.WarextTextCoreV110;
  if (!core) return;

  const states = new WeakMap();
  const stateList = new Set();
  const observedDocuments = new WeakSet();
  const configData = document.getElementById('wtsc-config')?.dataset || {};
  const uid = window.XF?.config?.userId ?? window.XF?.config?.user_id ?? 'guest';
  const ignoredKey = `warextSpellIgnoredV110:${location.host}:${uid}`;
  const boolValue = (value, fallback = true) => value == null || value === '' ? fallback : !['0','false','off','no'].includes(String(value).toLowerCase());
  const numberValue = (value, fallback, min, max) => Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : fallback));
  const cfg = {
    enabled: boolValue(configData.longText, true),
    grammar: boolValue(configData.grammar, true),
    punctuation: boolValue(configData.punctuation, true),
    underline: boolValue(configData.underline, true),
    properNames: boolValue(configData.properNames, true),
    informal: boolValue(configData.informal, true),
    deepContext: boolValue(configData.deepContext, true),
    semantic: boolValue(configData.semantic, true),
    semanticSensitivity: numberValue(configData.semanticSensitivity, 88, 70, 99),
    threshold: numberValue(configData.longTextThreshold, 700, 250, 50000),
    maxIssues: numberValue(configData.longTextMaxIssues, 160, 20, 800),
    segmentSize: numberValue(configData.longTextSegmentSize, 1000, 600, 1000)
  };

  const INPUT_SETTLE_MS = 1500;
  const FOCUS_DELAY_MS = 2400;
  const MAX_SEGMENTS_PER_SLICE = 2;
  const SLICE_BUDGET_MS = 6;
  const CACHE_LIMIT = 420;

  document.documentElement.dataset.wtscLongText = VERSION;

  function engine() {
    return window.WarextTurkishSpellEngineV110 || null;
  }

  function inputPending() {
    try { return !!navigator.scheduling?.isInputPending?.({ includeContinuous: true }); }
    catch (_) { return false; }
  }

  function normalize(value) {
    return String(value || '').replace(/I/g,'ı').replace(/İ/g,'i').toLocaleLowerCase('tr-TR');
  }

  function ignoredWords() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(ignoredKey) || '[]');
      return new Set(Array.isArray(parsed) ? parsed.map(normalize).filter(Boolean) : []);
    } catch (_) {
      return new Set();
    }
  }

  function isMessageTextarea(el) {
    return el instanceof HTMLTextAreaElement && (el.name === 'message' || el.dataset.originalName === 'message' || el.matches('textarea.js-editor[data-xf-init~="editor"]'));
  }

  function isRichEditor(el) {
    return el instanceof HTMLElement && el.isContentEditable && (el.classList.contains('fr-element') || !!el.closest('.fr-box'));
  }

  function richForTextarea(textarea) {
    if (!(textarea instanceof HTMLTextAreaElement)) return null;
    const rich = textarea.closest('.js-editor')?.querySelector?.('.fr-box .fr-element[contenteditable="true"]')
      || textarea.parentElement?.querySelector?.('.fr-box .fr-element[contenteditable="true"]');
    return rich instanceof HTMLElement && rich.isConnected ? rich : null;
  }

  function editorElements(root = document) {
    const rich = [];
    const textareas = [];
    const consider = el => {
      if (isRichEditor(el)) rich.push(el);
      else if (isMessageTextarea(el)) textareas.push(el);
    };
    if (root instanceof Element) consider(root);
    root.querySelectorAll?.('textarea[name="message"],textarea.js-editor[data-xf-init~="editor"],.fr-element[contenteditable="true"]').forEach(consider);

    const out = [...rich];
    for (const textarea of textareas) {
      const paired = richForTextarea(textarea);
      if (paired) {
        if (!out.includes(paired)) out.push(paired);
        continue;
      }
      if (textarea.offsetParent !== null) out.push(textarea);
    }
    return [...new Set(out)];
  }

  function textNodes(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    return nodes;
  }

  function snapshot(el) {
    if (el instanceof HTMLTextAreaElement) {
      const text = el.value || '';
      return { text, protectedRanges: core.protectedRanges(text) };
    }
    if (!isRichEditor(el)) return null;
    const nodes = textNodes(el);
    const domProtected = [];
    let text = '';
    for (const node of nodes) {
      const start = text.length;
      const value = node.nodeValue || '';
      if (node.parentElement?.closest?.('code,pre,.bbCodeCode,.bbCodeBlock--code,.fr-code,.bbCodeBlock--quote')) {
        domProtected.push({ start, end: start + value.length, kind: 'dom-protected' });
      }
      text += value;
    }
    return { text, protectedRanges: core.mergeRanges([...core.protectedRanges(text), ...domProtected]) };
  }

  function rangeAt(el, start, end) {
    if (!isRichEditor(el) || end <= start) return null;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let position = 0;
    let startNode = null;
    let endNode = null;
    let startOffset = 0;
    let endOffset = 0;
    let node;
    while ((node = walker.nextNode())) {
      const length = node.nodeValue?.length || 0;
      const next = position + length;
      if (!startNode && start >= position && start <= next) {
        startNode = node;
        startOffset = start - position;
      }
      if (end >= position && end <= next) {
        endNode = node;
        endOffset = end - position;
        break;
      }
      position = next;
    }
    if (!startNode || !endNode) return null;
    try {
      const range = document.createRange();
      range.setStart(startNode, Math.max(0, Math.min(startOffset, startNode.nodeValue?.length || 0)));
      range.setEnd(endNode, Math.max(0, Math.min(endOffset, endNode.nodeValue?.length || 0)));
      return range;
    } catch (_) {
      return null;
    }
  }

  function installStyle() {
    if (document.getElementById('wtsc-longtext-style-v110')) return;
    const style = document.createElement('style');
    style.id = 'wtsc-longtext-style-v110';
    style.textContent = '::highlight(wtsc-longtext-v110){text-decoration:underline wavy #d33;text-decoration-thickness:1px;text-underline-offset:2px}';
    document.head.appendChild(style);
  }

  function refreshHighlights() {
    if (!cfg.underline || typeof CSS === 'undefined' || !CSS.highlights || typeof Highlight === 'undefined') return;
    const ranges = [];
    for (const st of [...stateList]) {
      if (!st.el?.isConnected) {
        stateList.delete(st);
        continue;
      }
      if (!isRichEditor(st.el)) continue;
      for (const issue of st.issues || []) {
        const range = rangeAt(st.el, issue.start, issue.end);
        if (range) ranges.push(range);
      }
    }
    if (ranges.length) CSS.highlights.set('wtsc-longtext-v110', new Highlight(...ranges));
    else CSS.highlights.delete('wtsc-longtext-v110');
  }

  function localProtectedRanges(allRanges, segment) {
    return (allRanges || []).map(range => ({
      start: Math.max(0, range.start - segment.start),
      end: Math.min(segment.end - segment.start, range.end - segment.start),
      kind: range.kind
    })).filter(range => range.end > range.start && range.end > 0 && range.start < segment.end - segment.start);
  }

  function previousToken(text) {
    const tokens = core.tokens(text);
    return tokens.length ? tokens[tokens.length - 1] : null;
  }

  function signature(issue) {
    return `${issue.start}:${issue.end}:${issue.rule || issue.category || 'word'}:${(issue.suggestions || []).join('|')}`;
  }

  function analyzeSegment(snap, segments, index, ignored) {
    const localEngine = engine();
    const segment = segments[index];
    if (!localEngine?.check || !segment) return [];
    const previousText = segments[index - 1]?.text || '';
    const nextText = segments[index + 1]?.text || '';
    const localRanges = localProtectedRanges(snap.protectedRanges, segment);
    const analysisText = core.maskText(segment.text, localRanges);
    const issues = [];
    const seen = new Set();
    const add = issue => {
      if (!issue || issue.end <= issue.start || core.isProtected(localRanges, issue.start, issue.end)) return;
      const key = signature(issue);
      if (seen.has(key)) return;
      seen.add(key);
      issues.push(issue);
    };

    if (cfg.grammar && typeof localEngine.analyzeSentence === 'function') {
      let languageIssues = [];
      try {
        languageIssues = localEngine.analyzeSentence(analysisText, {
          properNames: cfg.properNames,
          punctuation: cfg.punctuation,
          previousSentence: cfg.deepContext ? previousText : '',
          nextSentence: cfg.deepContext ? nextText : '',
          semantic: cfg.semantic,
          semanticSensitivity: cfg.semanticSensitivity,
          longText: true
        }) || [];
      } catch (_) {
        languageIssues = [];
      }
      for (const issue of languageIssues) {
        const start = Math.max(0, Number(issue.start) || 0);
        const end = Math.max(start, Number(issue.end) || start);
        if (end <= start) continue;
        const suggestions = Array.isArray(issue.suggestions) ? issue.suggestions.filter(Boolean).slice(0, 3) : [];
        if (!suggestions.length) continue;
        add({ start, end, word: analysisText.slice(start, end), suggestions, rule: issue.rule || 'sentence', category: issue.category || 'grammar', message: issue.message || '' });
        if (issues.length >= 32) break;
      }
    }

    if (inputPending()) return issues;
    const tokens = core.tokens(analysisText, localRanges);
    const previousLast = previousToken(previousText);
    for (let i = 0; i < tokens.length && issues.length < 32; i++) {
      if ((i & 7) === 0 && inputPending()) break;
      const token = tokens[i];
      if (ignored.has(normalize(token.word))) continue;
      let result = null;
      try {
        result = localEngine.check(token.word, {
          previousWord: i > 0 ? tokens[i - 1].word : previousLast?.word || '',
          sentenceStart: i === 0,
          before: analysisText.slice(Math.max(0, token.start - 220), token.end),
          previousSentence: cfg.deepContext ? previousText : '',
          nextSentence: cfg.deepContext ? nextText : '',
          properNames: cfg.properNames,
          informal: cfg.informal,
          longText: true
        });
      } catch (_) {
        result = null;
      }
      if (!result || result.correct !== false) continue;
      const suggestions = Array.isArray(result.suggestions) ? result.suggestions.filter(Boolean).slice(0, 3) : [];
      if (!suggestions.length) continue;
      add({ start: token.start, end: token.end, word: token.word, suggestions, rule: result.rule || 'word', category: result.category || 'spelling', message: result.message || '' });
    }
    return issues;
  }

  function scheduleIdle(fn) {
    if (typeof requestIdleCallback === 'function') return requestIdleCallback(fn, { timeout: 1200 });
    return setTimeout(() => fn({ didTimeout: true, timeRemaining: () => 8 }), 32);
  }

  function cancelIdle(id) {
    if (!id) return;
    if (typeof cancelIdleCallback === 'function') cancelIdleCallback(id);
    else clearTimeout(id);
  }

  function clearState(st, reason) {
    cancelIdle(st.idleId);
    st.idleId = 0;
    st.issues = [];
    st.el.dataset.wtscLongTextState = reason;
    st.el.dataset.wtscLongTextIssues = '0';
    refreshHighlights();
  }

  function finish(st, snap, issues, stats, scanId) {
    if (!st.el?.isConnected || scanId !== st.scanId) return;
    st.issues = issues.slice(0, cfg.maxIssues).sort((a,b) => a.start - b.start || a.end - b.end);
    st.lastText = snap.text;
    st.stats = stats;
    st.el.dataset.wtscLongTextState = 'ready';
    st.el.dataset.wtscLongTextIssues = String(st.issues.length);
    st.el.dataset.wtscLongTextSegments = String(stats.segments);
    st.el.dataset.wtscLongTextReused = String(stats.reused);
    st.el.dataset.wtscLongTextAnalyzed = String(stats.analyzed);
    document.documentElement.dataset.wtscLongTextStatus = 'ready';
    refreshHighlights();
  }

  function runScan(st, scanId) {
    if (!cfg.enabled || !st.el?.isConnected || scanId !== st.scanId) return;
    if (document.visibilityState !== 'visible') {
      st.schedule(2500, false);
      return;
    }
    const now = performance.now();
    if (inputPending() || (st.lastInputAt && now - st.lastInputAt < INPUT_SETTLE_MS)) {
      st.schedule(500, false);
      return;
    }

    const localEngine = engine();
    if (!localEngine?.check) return;
    const snap = snapshot(st.el);
    if (!snap || scanId !== st.scanId) return;
    if (snap.text.length < cfg.threshold) {
      st.lastText = snap.text;
      clearState(st, 'short');
      return;
    }

    const segments = core.sentenceSegments(snap.text, snap.protectedRanges, cfg.segmentSize);
    if (!segments.length || scanId !== st.scanId) {
      clearState(st, 'empty');
      return;
    }

    const changed = core.changedRange(st.lastText, snap.text);
    st.el.dataset.wtscLongTextState = 'scanning';
    st.el.dataset.wtscLongTextChangedStart = String(changed.start);
    document.documentElement.dataset.wtscLongTextStatus = 'scanning';
    const ignored = ignoredWords();
    const collected = [];
    const stats = { segments: segments.length, reused: 0, analyzed: 0, characters: snap.text.length, protected: snap.protectedRanges.length };
    let index = 0;
    const flags = `${cfg.grammar ? 1 : 0}${cfg.punctuation ? 1 : 0}${cfg.properNames ? 1 : 0}${cfg.informal ? 1 : 0}${cfg.deepContext ? 1 : 0}`;

    const step = deadline => {
      if (scanId !== st.scanId || !st.el?.isConnected) return;
      if (inputPending()) {
        st.idleId = scheduleIdle(step);
        return;
      }
      const started = performance.now();
      let processed = 0;
      while (index < segments.length && collected.length < cfg.maxIssues) {
        if (inputPending()) break;
        const segment = segments[index];
        const key = core.cacheKey(segments, index, flags);
        let relative = st.cache.get(key);
        if (relative) {
          stats.reused++;
        } else {
          relative = analyzeSegment(snap, segments, index, ignored);
          st.cache.set(key, relative);
          stats.analyzed++;
          while (st.cache.size > CACHE_LIMIT) st.cache.delete(st.cache.keys().next().value);
        }
        for (const issue of relative) {
          collected.push({ ...issue, start: segment.start + issue.start, end: segment.start + issue.end });
          if (collected.length >= cfg.maxIssues) break;
        }
        index++;
        processed++;
        const elapsed = performance.now() - started;
        if (processed >= MAX_SEGMENTS_PER_SLICE || elapsed >= SLICE_BUDGET_MS || (!deadline.didTimeout && typeof deadline.timeRemaining === 'function' && deadline.timeRemaining() < 3)) break;
      }
      if (scanId !== st.scanId) return;
      if (index < segments.length && collected.length < cfg.maxIssues) st.idleId = scheduleIdle(step);
      else {
        st.idleId = 0;
        finish(st, snap, collected, stats, scanId);
      }
    };
    st.idleId = scheduleIdle(step);
  }

  function attach(el) {
    if (!cfg.enabled || !el || !(isMessageTextarea(el) || isRichEditor(el))) return null;
    if (el instanceof HTMLTextAreaElement) {
      const rich = richForTextarea(el);
      if (rich) return attach(rich);
      if (el.offsetParent === null) return null;
    }
    if (states.has(el)) return states.get(el);

    const st = { el, issues: [], cache: new Map(), scanId: 0, idleId: 0, timer: 0, lastText: '', lastInputAt: 0, stats: null };
    states.set(el, st);
    stateList.add(st);
    el.dataset.wtscLongTextBound = '1';
    st.schedule = (delay, markInput = false) => {
      clearTimeout(st.timer);
      cancelIdle(st.idleId);
      st.idleId = 0;
      st.scanId++;
      if (markInput) st.lastInputAt = performance.now();
      const scanId = st.scanId;
      st.timer = setTimeout(() => runScan(st, scanId), delay);
    };
    el.addEventListener('input', () => st.schedule(INPUT_SETTLE_MS + 250, true), { passive: true });
    el.addEventListener('paste', () => st.schedule(INPUT_SETTLE_MS + 350, true), { passive: true });
    el.addEventListener('cut', () => st.schedule(INPUT_SETTLE_MS + 350, true), { passive: true });
    el.addEventListener('focus', () => st.schedule(FOCUS_DELAY_MS, false), { passive: true });
    el.addEventListener('blur', () => st.schedule(280, false), { passive: true });
    st.schedule(2600, false);
    return st;
  }

  function bindRoot(root = document) {
    for (const el of editorElements(root)) attach(el);
  }

  function rescan(root = document) {
    bindRoot(root);
    for (const st of [...stateList]) {
      if (!st.el?.isConnected) {
        stateList.delete(st);
        continue;
      }
      if (root === document || root === st.el || root.contains?.(st.el)) st.schedule?.(120, false);
    }
  }

  function getIssues(el) {
    return (states.get(el)?.issues || []).map(issue => ({ ...issue, suggestions: [...(issue.suggestions || [])] }));
  }

  function getStats(el) {
    const stats = states.get(el)?.stats;
    return stats ? { ...stats } : null;
  }

  function init() {
    installStyle();
    bindRoot(document);
    if (!observedDocuments.has(document)) {
      observedDocuments.add(document);
      let mutationTimer = 0;
      const observer = new MutationObserver(mutations => {
        let changed = false;
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) if (node instanceof Element) changed = true;
        }
        if (!changed) return;
        clearTimeout(mutationTimer);
        mutationTimer = setTimeout(() => bindRoot(document), 100);
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    if (window.XF?.on) {
      for (const event of ['xf:reinit','editor:init','editor:ready','xf:editor-start']) {
        try { window.XF.on(document, event, () => bindRoot(document)); } catch (_) {}
      }
    }
  }

  window.WarextLongTextV110 = { VERSION, rescan, getIssues, getStats, config: { ...cfg } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
