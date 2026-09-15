(() => {
  'use strict';

  if (window.__warextTurkishSpellCheckV400) return;
  window.__warextTurkishSpellCheckV400 = true;

  const VERSION = '4.0.0';
  const data = document.getElementById('wtsc-config')?.dataset || {};
  const bool = (value, fallback = true) => value == null || value === '' ? fallback : !['0','false','off','no'].includes(String(value).toLowerCase());
  const num = (value, fallback, min, max) => Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : fallback));
  const configuredMode = String(data.mode || 'local').toLowerCase();
  const cfg = {
    enabled: bool(data.enabled, true),
    mode: ['local','ai','hybrid'].includes(configuredMode) ? configuredMode : 'local',
    grammar: bool(data.grammar, true),
    punctuation: bool(data.punctuation, true),
    semantic: bool(data.semantic, true),
    maxSuggestions: num(data.maxSuggestions, 3, 1, 5),
    localDebounce: num(data.localDebounce, 360, 100, 2000),
    aiDebounce: num(data.aiDebounce, 1300, 500, 10000),
    aiMinChars: num(data.aiMinChars, 12, 1, 1000),
    aiMaxChars: num(data.aiMaxChars, 8000, 500, 50000),
    liveWindow: num(data.liveWindow, 1500, 400, 4000),
    aiEndpoint: String(data.aiEndpoint || ''),
    aiEnabled: bool(data.aiEnabled, true),
    underline: bool(data.underline, true)
  };

  const states = new WeakMap();
  const boundTextareas = new WeakSet();
  const aiCache = new Map();
  const CACHE_TTL = 180000;
  const MAX_CACHE = 64;

  document.documentElement.dataset.wtscEditor = VERSION;
  document.documentElement.dataset.wtscMode = cfg.mode;

  const localEnabled = () => cfg.mode === 'local' || cfg.mode === 'hybrid';
  const aiEnabled = () => cfg.aiEnabled && cfg.aiEndpoint && (cfg.mode === 'ai' || cfg.mode === 'hybrid');
  const engine = () => window.WarextTurkishSpellEngineV110 || null;

  function isTitle(el) {
    return el instanceof HTMLInputElement && el.name === 'title';
  }

  function isTextarea(el) {
    return el instanceof HTMLTextAreaElement && (
      el.name === 'message' || el.dataset.originalName === 'message' || el.matches('textarea.js-editor[data-xf-init~="editor"]')
    );
  }

  function isRich(el) {
    return el instanceof HTMLElement && el.isContentEditable && (el.classList.contains('fr-element') || !!el.closest('.fr-box'));
  }

  function editorCandidate(el) {
    return isTitle(el) || isTextarea(el) || isRich(el);
  }

  function textAndCaret(el) {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const text = el.value || '';
      const caret = Math.max(0, Math.min(text.length, el.selectionStart ?? text.length));
      return { text, caret };
    }

    if (!isRich(el)) return null;
    const text = el.textContent || '';
    const selection = window.getSelection();
    let caret = text.length;
    if (selection?.rangeCount && selection.isCollapsed && el.contains(selection.getRangeAt(0).startContainer)) {
      try {
        const before = document.createRange();
        before.selectNodeContents(el);
        const active = selection.getRangeAt(0);
        before.setEnd(active.startContainer, active.startOffset);
        caret = before.toString().length;
      } catch (_) {}
    }
    return { text, caret: Math.max(0, Math.min(text.length, caret)) };
  }

  function alignWindow(text, caret, wanted) {
    if (text.length <= wanted) return { start: 0, end: text.length, text };
    const half = Math.floor(wanted / 2);
    let start = Math.max(0, Math.min(text.length - wanted, caret - half));
    let end = Math.min(text.length, start + wanted);

    const leftFloor = Math.max(0, start - 260);
    for (let i = start; i >= leftFloor; i--) {
      if (i === 0 || /[.!?…\n]/u.test(text[i - 1] || '')) {
        start = i;
        break;
      }
    }
    const rightCeil = Math.min(text.length, end + 260);
    for (let i = end; i < rightCeil; i++) {
      if (i >= text.length || /[.!?…\n]/u.test(text[i] || '')) {
        end = Math.min(text.length, i + (i < text.length ? 1 : 0));
        break;
      }
    }
    if (end - start > wanted + 520) end = start + wanted + 520;
    return { start, end, text: text.slice(start, end) };
  }

  function issueKey(issue) {
    return `${issue.start}:${issue.end}:${issue.suggestion || issue.suggestions?.[0] || ''}`;
  }

  function normalizeLocalIssue(item, offset, sourceText) {
    if (!item || !Number.isFinite(Number(item.start)) || !Number.isFinite(Number(item.end))) return null;
    const relativeStart = Math.max(0, Number(item.start));
    const relativeEnd = Math.max(relativeStart, Number(item.end));
    const suggestions = Array.isArray(item.suggestions) ? item.suggestions.filter(Boolean).slice(0, 3) : [];
    const suggestion = String(item.suggestion || suggestions[0] || '');
    if (!suggestion) return null;
    const start = offset + relativeStart;
    const end = offset + relativeEnd;
    return {
      start,
      end,
      original: String(item.original || item.word || sourceText.slice(relativeStart, relativeEnd)),
      suggestion,
      suggestions: suggestions.length ? suggestions : [suggestion],
      type: String(item.category || item.type || 'writing'),
      rule: String(item.rule || ''),
      reason: String(item.message || ''),
      confidence: Math.max(0, Math.min(100, Math.round(Number(item.confidence || 0) * (Number(item.confidence || 0) <= 1 ? 100 : 1)))),
      source: 'local'
    };
  }

  function localAnalyze(snapshot, st) {
    const localEngine = engine();
    if (!localEnabled() || !localEngine) return [];

    const now = Date.now();
    const huge = snapshot.text.length > 12000;
    const slow = st.slowUntil > now;
    const wanted = huge || slow ? Math.min(760, cfg.liveWindow) : cfg.liveWindow;
    const windowed = alignWindow(snapshot.text, snapshot.caret, wanted);
    const started = performance.now();
    let report = null;

    if (typeof localEngine.analyzeParagraph === 'function') {
      try {
        report = localEngine.analyzeParagraph(windowed.text, {
          grammar: cfg.grammar,
          punctuation: cfg.punctuation,
          semantic: cfg.semantic && !huge && !slow,
          longText: false,
          fullParagraph: false,
          liveWindow: true,
          settled: false
        });
      } catch (_) {
        report = null;
      }
    }

    const elapsed = performance.now() - started;
    st.lastLocalMs = elapsed;
    if (elapsed > 28) st.slowUntil = Date.now() + 5000;

    const items = [];
    const seen = new Set();
    const add = raw => {
      const normalized = normalizeLocalIssue(raw, windowed.start, windowed.text);
      if (!normalized) return;
      const key = issueKey(normalized);
      if (seen.has(key)) return;
      seen.add(key);
      items.push(normalized);
    };

    for (const item of report?.fixes || []) {
      add(item);
      if (items.length >= 8) break;
    }
    for (const item of report?.warnings || []) {
      add(item);
      if (items.length >= 8) break;
    }

    if (!items.length && typeof localEngine.check === 'function') {
      const token = wordAt(snapshot.text, snapshot.caret);
      if (token && token.end - token.start <= 64) {
        try {
          const result = localEngine.check(token.word, { before: snapshot.text.slice(Math.max(0, token.start - 180), token.end), sentenceStart: false });
          if (result?.correct === false && Array.isArray(result.suggestions) && result.suggestions[0]) {
            items.push({
              start: token.start,
              end: token.end,
              original: token.word,
              suggestion: result.suggestions[0],
              suggestions: result.suggestions.slice(0, 3),
              type: result.category || 'spelling',
              rule: result.rule || 'word',
              reason: result.message || '',
              confidence: 0,
              source: 'local'
            });
          }
        } catch (_) {}
      }
    }

    return items.slice(0, 8);
  }

  function wordAt(text, caret) {
    const letter = ch => !!ch && /[A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû]/u.test(ch);
    let pos = Math.max(0, Math.min(text.length, caret));
    if (!letter(text[pos]) && letter(text[pos - 1])) pos--;
    let start = pos;
    while (start > 0 && letter(text[start - 1])) start--;
    let end = pos;
    while (end < text.length && letter(text[end])) end++;
    if (end - start < 2) return null;
    return { word: text.slice(start, end), start, end };
  }

  function createBar(el) {
    const owner = isRich(el) ? (el.closest('.fr-box') || el) : el;
    if (owner.__wtscV400Bar?.isConnected) return owner.__wtscV400Bar;
    const bar = document.createElement('div');
    bar.className = 'wtsc-v400-bar';
    bar.setAttribute('role', 'status');
    const anchor = isRich(el) ? (el.closest('.fr-box') || el) : (el.closest('.inputGroup') || el);
    anchor.insertAdjacentElement('afterend', bar);
    owner.__wtscV400Bar = bar;
    return bar;
  }

  function installStyle() {
    if (document.getElementById('wtsc-v400-style')) return;
    const style = document.createElement('style');
    style.id = 'wtsc-v400-style';
    style.textContent = `
      .wtsc-v400-bar{display:none;align-items:center;gap:6px;flex-wrap:wrap;margin:7px 0 3px;font-size:12px}
      .wtsc-v400-bar.is-active{display:flex}
      .wtsc-v400-source{opacity:.65;margin-right:2px;white-space:nowrap}
      .wtsc-v400-suggestion{appearance:none;border:1px solid rgba(127,127,127,.30);background:rgba(127,127,127,.08);color:inherit;border-radius:7px;padding:7px 10px;font:inherit;cursor:pointer;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .wtsc-v400-suggestion:hover,.wtsc-v400-suggestion:focus{background:rgba(127,127,127,.16);outline:none}
      .wtsc-v400-status{opacity:.65}
      .wtsc-v400-error{opacity:.75;color:inherit}
    `;
    document.head.appendChild(style);
  }

  function hideBar(bar) {
    bar.classList.remove('is-active');
    bar.textContent = '';
  }

  function render(st, issues, source) {
    const bar = st.bar;
    hideBar(bar);
    const unique = [];
    const seen = new Set();
    for (const issue of issues || []) {
      const suggestion = String(issue?.suggestion || issue?.suggestions?.[0] || '');
      if (!suggestion) continue;
      const key = `${issue.start}:${issue.end}:${suggestion}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push({ ...issue, suggestion });
      if (unique.length >= cfg.maxSuggestions) break;
    }
    if (!unique.length) return;

    const badge = document.createElement('span');
    badge.className = 'wtsc-v400-source';
    badge.textContent = source === 'ai' ? 'AI önerisi' : source === 'hybrid' ? 'AI + Yerel' : 'Yerel';
    bar.appendChild(badge);

    for (const issue of unique) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'wtsc-v400-suggestion';
      button.textContent = issue.suggestion;
      if (issue.reason) button.title = issue.reason;
      button.addEventListener('mousedown', event => event.preventDefault());
      button.addEventListener('click', () => {
        replaceIssue(st.el, issue);
        hideBar(bar);
        st.scheduleLocal(40);
      });
      bar.appendChild(button);
    }
    bar.classList.add('is-active');
  }

  function renderStatus(st, text, isError = false) {
    st.bar.textContent = '';
    const span = document.createElement('span');
    span.className = isError ? 'wtsc-v400-error' : 'wtsc-v400-status';
    span.textContent = text;
    st.bar.appendChild(span);
    st.bar.classList.add('is-active');
  }

  function rangeFromOffsets(root, start, end) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let pos = 0, startNode = null, endNode = null, startOffset = 0, endOffset = 0, node;
    while ((node = walker.nextNode())) {
      const len = node.nodeValue?.length || 0;
      const next = pos + len;
      if (!startNode && start >= pos && start <= next) {
        startNode = node;
        startOffset = Math.max(0, Math.min(len, start - pos));
      }
      if (end >= pos && end <= next) {
        endNode = node;
        endOffset = Math.max(0, Math.min(len, end - pos));
        break;
      }
      pos = next;
    }
    if (!startNode || !endNode) return null;
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  }

  function replaceIssue(el, issue) {
    const suggestion = String(issue.suggestion || issue.suggestions?.[0] || '');
    if (!suggestion) return;
    const start = Math.max(0, Number(issue.start) || 0);
    const end = Math.max(start, Number(issue.end) || start);

    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const text = el.value || '';
      el.value = text.slice(0, start) + suggestion + text.slice(end);
      const pos = start + suggestion.length;
      el.setSelectionRange?.(pos, pos);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.focus();
      return;
    }

    const range = rangeFromOffsets(el, start, end);
    if (!range) return;
    range.deleteContents();
    const node = document.createTextNode(suggestion);
    range.insertNode(node);
    const after = document.createRange();
    after.setStartAfter(node);
    after.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(after);
    try {
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: suggestion }));
    } catch (_) {
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    el.focus();
  }

  function scheduleIdle(fn, timeout = 700) {
    if (typeof requestIdleCallback === 'function') return requestIdleCallback(fn, { timeout });
    return setTimeout(() => fn({ didTimeout: true, timeRemaining: () => 8 }), 16);
  }

  function cancelIdle(id) {
    if (!id) return;
    if (typeof cancelIdleCallback === 'function') cancelIdleCallback(id);
    else clearTimeout(id);
  }

  function hashText(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function cacheGet(key) {
    const item = aiCache.get(key);
    if (!item) return null;
    if (Date.now() - item.at > CACHE_TTL) {
      aiCache.delete(key);
      return null;
    }
    aiCache.delete(key);
    aiCache.set(key, item);
    return item.value;
  }

  function cacheSet(key, value) {
    aiCache.set(key, { at: Date.now(), value });
    while (aiCache.size > MAX_CACHE) aiCache.delete(aiCache.keys().next().value);
  }

  function codePointToJsIndex(text, index) {
    const target = Math.max(0, Number(index) || 0);
    if (!target) return 0;
    let cp = 0;
    let js = 0;
    for (const ch of text) {
      if (cp >= target) break;
      js += ch.length;
      cp++;
    }
    return js;
  }

  function normalizeAiIssue(raw, scope) {
    if (!raw || !raw.suggestion) return null;
    let localStart = codePointToJsIndex(scope.text, raw.start);
    let localEnd = codePointToJsIndex(scope.text, raw.end);
    localStart = Math.max(0, Math.min(scope.text.length, localStart));
    localEnd = Math.max(localStart, Math.min(scope.text.length, localEnd));
    const original = String(raw.original || '');

    if (original && scope.text.slice(localStart, localEnd) !== original) {
      const from = Math.max(0, localStart - 160);
      const to = Math.min(scope.text.length, Math.max(localEnd + 160, localStart + original.length + 160));
      const nearby = scope.text.slice(from, to);
      const hit = nearby.indexOf(original);
      if (hit >= 0) {
        localStart = from + hit;
        localEnd = localStart + original.length;
      } else {
        const first = scope.text.indexOf(original);
        if (first >= 0 && scope.text.indexOf(original, first + original.length) < 0) {
          localStart = first;
          localEnd = first + original.length;
        } else if (localEnd <= localStart) {
          return null;
        }
      }
    }

    return {
      start: scope.start + localStart,
      end: scope.start + localEnd,
      original: original || scope.text.slice(localStart, localEnd),
      suggestion: String(raw.suggestion),
      suggestions: [String(raw.suggestion)],
      type: String(raw.type || 'writing'),
      rule: String(raw.type || 'ai-writing'),
      reason: String(raw.reason || ''),
      confidence: Math.max(0, Math.min(100, Number(raw.confidence) || 0)),
      source: 'ai',
      localSupported: !!raw.local_supported
    };
  }

  function aiScope(snapshot) {
    const wanted = Math.min(cfg.aiMaxChars, snapshot.text.length > 12000 ? 4200 : 6500);
    return alignWindow(snapshot.text, snapshot.caret, wanted);
  }

  function localContextForScope(localIssues, scope) {
    return {
      issues: (localIssues || []).filter(issue => issue.start < scope.end && issue.end > scope.start).slice(0, 16).map(issue => ({
        start: Math.max(0, issue.start - scope.start),
        end: Math.max(0, issue.end - scope.start),
        original: issue.original || '',
        suggestions: (issue.suggestions || [issue.suggestion]).filter(Boolean).slice(0, 3),
        rule: issue.rule || issue.type || '',
        confidence: issue.confidence || 0
      }))
    };
  }

  async function requestAi(st, snapshot, generation) {
    if (!aiEnabled() || snapshot.text.trim().length < cfg.aiMinChars || generation !== st.generation) return;
    const scope = aiScope(snapshot);
    if (!scope.text.trim()) return;
    const localContext = cfg.mode === 'hybrid' ? localContextForScope(st.localIssues, scope) : { issues: [] };
    const cacheKey = `${cfg.mode}:${hashText(scope.text)}:${hashText(JSON.stringify(localContext))}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      const issues = (cached.writing?.issues || []).map(issue => normalizeAiIssue(issue, scope)).filter(Boolean);
      if (generation === st.generation) {
        st.aiIssues = issues;
        if (issues.length) render(st, issues, cfg.mode === 'hybrid' ? 'hybrid' : 'ai');
        else if (cfg.mode === 'ai') hideBar(st.bar);
      }
      return;
    }

    st.abort?.abort();
    const abort = new AbortController();
    st.abort = abort;
    st.aiPending = true;
    if (cfg.mode === 'ai' && !st.aiIssues.length) renderStatus(st, 'AI yazım denetimi inceliyor…');

    const body = new URLSearchParams();
    body.set('message', scope.text);
    body.set('mode', cfg.mode === 'hybrid' ? 'hybrid' : 'ai');
    body.set('local_context', JSON.stringify(localContext));
    const token = window.XF?.config?.csrf || window.XF?.config?.csrfToken || document.querySelector('input[name="_xfToken"]')?.value || '';
    if (token) body.set('_xfToken', token);

    try {
      const response = await fetch(cfg.aiEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: body.toString(),
        signal: abort.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (generation !== st.generation) return;
      const result = payload?.result || payload;
      if (!payload?.success && !result?.available) throw new Error(result?.reason || 'AI unavailable');
      cacheSet(cacheKey, result);
      const issues = (result?.writing?.issues || []).map(issue => normalizeAiIssue(issue, scope)).filter(Boolean);
      st.aiIssues = issues;
      st.aiSource = String(result?.source || '');
      if (issues.length) render(st, issues, cfg.mode === 'hybrid' ? 'hybrid' : 'ai');
      else if (cfg.mode === 'ai') hideBar(st.bar);
      document.documentElement.dataset.wtscAiSource = st.aiSource || 'unknown';
      document.documentElement.dataset.wtscAiStatus = 'ready';
    } catch (error) {
      if (error?.name === 'AbortError') return;
      if (generation !== st.generation) return;
      document.documentElement.dataset.wtscAiStatus = 'error';
      if (cfg.mode === 'ai') renderStatus(st, 'AI yazım denetimine şu anda ulaşılamıyor.', true);
      else if (st.localIssues.length) render(st, st.localIssues, 'local');
    } finally {
      if (st.abort === abort) st.abort = null;
      st.aiPending = false;
    }
  }

  function runLocal(st, generation) {
    if (generation !== st.generation || !st.el.isConnected) return;
    const snapshot = textAndCaret(st.el);
    if (!snapshot) return;
    st.lastSnapshot = snapshot;
    const issues = localAnalyze(snapshot, st);
    if (generation !== st.generation) return;
    st.localIssues = issues;
    if (cfg.mode === 'local') {
      if (issues.length) render(st, issues, 'local');
      else hideBar(st.bar);
    } else if (cfg.mode === 'hybrid') {
      if (issues.length) render(st, issues, 'local');
      else if (!st.aiPending) hideBar(st.bar);
    }
    document.documentElement.dataset.wtscLocalLatency = String(Math.round(st.lastLocalMs || 0));
  }

  function attach(el) {
    if (!cfg.enabled || !editorCandidate(el) || states.has(el)) return states.get(el) || null;
    const st = {
      el,
      bar: createBar(el),
      generation: 0,
      localTimer: 0,
      aiTimer: 0,
      idleId: 0,
      abort: null,
      localIssues: [],
      aiIssues: [],
      aiPending: false,
      aiSource: '',
      lastSnapshot: null,
      lastLocalMs: 0,
      slowUntil: 0
    };

    st.scheduleLocal = (delay = cfg.localDebounce) => {
      st.generation++;
      const generation = st.generation;
      clearTimeout(st.localTimer);
      clearTimeout(st.aiTimer);
      cancelIdle(st.idleId);
      st.abort?.abort();
      st.abort = null;
      st.aiPending = false;

      if (localEnabled()) {
        st.localTimer = setTimeout(() => {
          st.idleId = scheduleIdle(() => {
            st.idleId = 0;
            runLocal(st, generation);
          }, 650);
        }, st.slowUntil > Date.now() ? Math.max(delay, 650) : delay);
      }

      if (aiEnabled()) {
        st.aiTimer = setTimeout(() => {
          const snapshot = textAndCaret(st.el);
          if (!snapshot || generation !== st.generation) return;
          if (cfg.mode === 'hybrid' && localEnabled() && !st.localIssues.length) {
            runLocal(st, generation);
          }
          requestAi(st, snapshot, generation);
        }, cfg.aiDebounce);
      }
    };

    states.set(el, st);
    el.dataset.wtscBound = '4';
    el.addEventListener('input', () => st.scheduleLocal(cfg.localDebounce), { passive: true });
    el.addEventListener('paste', () => st.scheduleLocal(Math.max(160, cfg.localDebounce)), { passive: true });
    el.addEventListener('cut', () => st.scheduleLocal(Math.max(160, cfg.localDebounce)), { passive: true });
    el.addEventListener('focus', () => st.scheduleLocal(100), { passive: true });
    el.addEventListener('click', () => st.scheduleLocal(90), { passive: true });
    st.scheduleLocal(180);
    return st;
  }

  function surfaceFromEditorEvent(event) {
    return event?.ed?.el || event?.editor?.ed?.el || event?.detail?.ed?.el || null;
  }

  function bindTextarea(textarea) {
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    if (!boundTextareas.has(textarea)) {
      boundTextareas.add(textarea);
      const listener = event => {
        const surface = surfaceFromEditorEvent(event);
        if (surface instanceof HTMLElement) attach(surface);
      };
      if (window.XF && typeof XF.on === 'function') XF.on(textarea, 'editor:init', listener);
      else textarea.addEventListener('editor:init', listener);
    }

    try {
      const handler = window.XF?.Element?.getHandler?.(textarea, 'editor');
      const surface = handler?.ed?.el;
      if (surface instanceof HTMLElement) {
        attach(surface);
        return;
      }
    } catch (_) {}

    const rich = textarea.parentElement?.querySelector?.('.fr-box .fr-element[contenteditable="true"]');
    if (!rich && textarea.offsetParent !== null) attach(textarea);
  }

  function scan(root = document) {
    if (root instanceof HTMLElement && editorCandidate(root)) {
      if (root instanceof HTMLTextAreaElement) bindTextarea(root);
      else attach(root);
    }
    root.querySelectorAll?.('textarea[name="message"],textarea.js-editor[data-xf-init~="editor"],input[name="title"],.fr-element[contenteditable="true"]').forEach(el => {
      if (el instanceof HTMLTextAreaElement) bindTextarea(el);
      else attach(el);
    });
  }

  function boot() {
    if (!cfg.enabled) return;
    installStyle();
    scan(document);

    if (window.XF && typeof XF.on === 'function') {
      XF.on(document, 'editor:init', event => {
        const surface = surfaceFromEditorEvent(event);
        if (surface instanceof HTMLElement) attach(surface);
      });
    }

    document.addEventListener('focusin', event => {
      const target = event.target;
      if (target instanceof HTMLTextAreaElement) bindTextarea(target);
      const candidate = target?.closest?.('.fr-element[contenteditable="true"],textarea[name="message"],textarea.js-editor,input[name="title"]');
      if (candidate instanceof HTMLElement) {
        if (candidate instanceof HTMLTextAreaElement) bindTextarea(candidate);
        else attach(candidate);
      }
    }, true);

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) scan(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.documentElement.dataset.wtscStatus = 'v400-ready';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
