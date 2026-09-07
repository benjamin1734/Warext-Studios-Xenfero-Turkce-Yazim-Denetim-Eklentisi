(() => {
  'use strict';

  if (window.__warextWritingIntegrationV105) return;
  window.__warextWritingIntegrationV105 = true;

  const BRIDGE_VERSION = '1.1.0';
  const ADDON_VERSION = '1.0.5';
  const STORAGE_KEY = 'warextWritingIntegration:v105';
  const MAX_EVENTS = 40;
  let beforeSnapshot = null;

  const now = () => Math.floor(Date.now() / 1000);
  const surfaces = () => Array.from(document.querySelectorAll(
    'input[name="title"], textarea[name="message"], textarea[data-original-name="message"], .fr-element[contenteditable="true"]'
  ));

  function surfaceField(el) {
    if (el instanceof HTMLInputElement && el.name === 'title') return 'title';
    return 'message';
  }

  function surfaceKey(el, index) {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      return `${el.tagName}:${el.name || el.dataset.originalName || 'field'}:${index}`;
    }
    return `rich:message:${index}`;
  }

  function surfaceText(el) {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return String(el.value || '');
    if (el instanceof HTMLElement && el.isContentEditable) return String(el.innerText || el.textContent || '');
    return '';
  }

  function takeSnapshot() {
    return surfaces().map((el, index) => ({ key: surfaceKey(el, index), field: surfaceField(el), text: surfaceText(el), index }));
  }

  function diff(before, after) {
    const a = String(before || '');
    const b = String(after || '');
    let prefix = 0;
    const min = Math.min(a.length, b.length);
    while (prefix < min && a[prefix] === b[prefix]) prefix++;

    let suffix = 0;
    while (
      suffix < a.length - prefix &&
      suffix < b.length - prefix &&
      a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
    ) suffix++;

    const removedLength = Math.max(0, a.length - prefix - suffix);
    const insertedLength = Math.max(0, b.length - prefix - suffix);
    return {
      beforeLength: a.length,
      afterLength: b.length,
      removedLength,
      insertedLength,
      changedChars: Math.max(removedLength, insertedLength)
    };
  }

  function emptyFieldState() {
    return { correctionCount:0, changedChars:0, insertedChars:0, removedChars:0 };
  }

  function normalizeFields(parsed) {
    const fields = { title:emptyFieldState(), message:emptyFieldState() };
    if (parsed && typeof parsed === 'object') {
      for (const name of ['title','message']) {
        const source = parsed[name];
        if (!source || typeof source !== 'object') continue;
        fields[name] = {
          correctionCount: Math.max(0, Number(source.correctionCount || 0)),
          changedChars: Math.max(0, Number(source.changedChars || 0)),
          insertedChars: Math.max(0, Number(source.insertedChars || 0)),
          removedChars: Math.max(0, Number(source.removedChars || 0))
        };
      }
    }
    return fields;
  }

  function deriveFields(events) {
    const fields = { title:emptyFieldState(), message:emptyFieldState() };
    for (const event of events) {
      const name = event?.field === 'title' ? 'title' : 'message';
      fields[name].correctionCount += 1;
      fields[name].changedChars += Math.max(0, Number(event?.changedChars || 0));
      fields[name].insertedChars += Math.max(0, Number(event?.insertedLength || 0));
      fields[name].removedChars += Math.max(0, Number(event?.removedLength || 0));
    }
    return fields;
  }

  function loadState() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
      const events = Array.isArray(parsed.events) ? parsed.events.slice(-MAX_EVENTS) : [];
      const fields = parsed.fields && typeof parsed.fields === 'object' ? normalizeFields(parsed.fields) : deriveFields(events);
      return {
        sessionId: parsed.sessionId || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        firstCorrectionAt: Number(parsed.firstCorrectionAt || 0),
        lastCorrectionAt: Number(parsed.lastCorrectionAt || 0),
        correctionCount: Number(parsed.correctionCount || 0),
        changedChars: Number(parsed.changedChars || 0),
        insertedChars: Number(parsed.insertedChars || 0),
        removedChars: Number(parsed.removedChars || 0),
        fields,
        events
      };
    } catch (_) {
      return {
        sessionId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        firstCorrectionAt: 0,
        lastCorrectionAt: 0,
        correctionCount: 0,
        changedChars: 0,
        insertedChars: 0,
        removedChars: 0,
        fields: { title:emptyFieldState(), message:emptyFieldState() },
        events: []
      };
    }
  }

  let state = loadState();

  function persist() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function record(buttonText = '') {
    if (!beforeSnapshot) return;
    const after = takeSnapshot();
    let best = null;

    for (const previous of beforeSnapshot) {
      const current = after.find(item => item.key === previous.key);
      if (!current || current.text === previous.text) continue;
      const delta = diff(previous.text, current.text);
      if (!best || delta.changedChars > best.delta.changedChars) {
        best = { previous, current, delta };
      }
    }

    beforeSnapshot = null;
    if (!best || best.delta.changedChars <= 0) return;

    const stamp = now();
    const field = best.previous.field === 'title' ? 'title' : 'message';
    const event = {
      at: stamp,
      field,
      beforeLength: best.delta.beforeLength,
      afterLength: best.delta.afterLength,
      removedLength: best.delta.removedLength,
      insertedLength: best.delta.insertedLength,
      changedChars: best.delta.changedChars,
      suggestionLength: String(buttonText || '').length
    };

    if (!state.firstCorrectionAt) state.firstCorrectionAt = stamp;
    state.lastCorrectionAt = stamp;
    state.correctionCount += 1;
    state.changedChars += event.changedChars;
    state.insertedChars += event.insertedLength;
    state.removedChars += event.removedLength;
    state.fields[field].correctionCount += 1;
    state.fields[field].changedChars += event.changedChars;
    state.fields[field].insertedChars += event.insertedLength;
    state.fields[field].removedChars += event.removedLength;
    state.events.push(event);
    state.events = state.events.slice(-MAX_EVENTS);
    persist();

    try {
      document.dispatchEvent(new CustomEvent('warext:writing-checker-correction', { detail: { ...event } }));
    } catch (_) {}
  }

  function getSummary() {
    return {
      bridgeVersion: BRIDGE_VERSION,
      addonVersion: ADDON_VERSION,
      sessionId: state.sessionId,
      correctionCount: state.correctionCount,
      changedChars: state.changedChars,
      insertedChars: state.insertedChars,
      removedChars: state.removedChars,
      firstCorrectionAt: state.firstCorrectionAt,
      lastCorrectionAt: state.lastCorrectionAt,
      fields: {
        title: { ...state.fields.title },
        message: { ...state.fields.message }
      }
    };
  }

  function reset() {
    state = {
      sessionId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
      firstCorrectionAt: 0,
      lastCorrectionAt: 0,
      correctionCount: 0,
      changedChars: 0,
      insertedChars: 0,
      removedChars: 0,
      fields: { title:emptyFieldState(), message:emptyFieldState() },
      events: []
    };
    persist();
  }

  document.addEventListener('mousedown', event => {
    const button = event.target instanceof Element ? event.target.closest('.wtsc-suggestion') : null;
    if (!button) return;
    beforeSnapshot = takeSnapshot();
  }, true);

  document.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('.wtsc-suggestion') : null;
    if (!button) return;
    const label = button.textContent || '';
    requestAnimationFrame(() => record(label));
  }, true);

  window.WarextWritingIntegration = Object.freeze({
    available: true,
    bridgeVersion: BRIDGE_VERSION,
    addonVersion: ADDON_VERSION,
    getSummary,
    getEvents: () => state.events.map(item => ({ ...item })),
    reset
  });

  document.documentElement.dataset.wtscIntegration = BRIDGE_VERSION;
})();
