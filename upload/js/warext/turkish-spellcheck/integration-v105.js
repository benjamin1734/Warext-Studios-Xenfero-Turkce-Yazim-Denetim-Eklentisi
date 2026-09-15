(() => {
  'use strict';

  if (window.__warextWritingIntegrationV105) return;
  window.__warextWritingIntegrationV105 = true;

  const BRIDGE_VERSION = '1.1.0';
  const ADDON_VERSION = '1.1.0';
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
      changed: removedLength > 0 || insertedLength > 0,
      prefix,
      suffix
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const value = raw ? JSON.parse(raw) : null;
      return value && typeof value === 'object' ? value : { version: BRIDGE_VERSION, events: [] };
    } catch (_) {
      return { version: BRIDGE_VERSION, events: [] };
    }
  }

  function save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function append(event) {
    const state = load();
    state.version = BRIDGE_VERSION;
    state.addonVersion = ADDON_VERSION;
    state.events = Array.isArray(state.events) ? state.events : [];
    state.events.push(event);
    if (state.events.length > MAX_EVENTS) state.events.splice(0, state.events.length - MAX_EVENTS);
    save(state);
  }

  function captureBefore() {
    beforeSnapshot = takeSnapshot();
  }

  function captureAfter() {
    if (!beforeSnapshot) return;
    const after = takeSnapshot();
    const beforeByKey = new Map(beforeSnapshot.map(item => [item.key, item]));
    const changes = [];
    for (const item of after) {
      const previous = beforeByKey.get(item.key);
      if (!previous) continue;
      const delta = diff(previous.text, item.text);
      if (!delta.changed) continue;
      changes.push({
        field: item.field,
        beforeLength: delta.beforeLength,
        afterLength: delta.afterLength,
        removedLength: delta.removedLength,
        insertedLength: delta.insertedLength,
        changedAt: delta.prefix
      });
    }
    if (changes.length) {
      append({
        type: 'writing-edit',
        at: now(),
        url: location.pathname,
        changes
      });
    }
    beforeSnapshot = null;
  }

  document.addEventListener('submit', captureBefore, true);
  window.addEventListener('beforeunload', captureAfter, true);

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('button,input[type="submit"],a.button') : null;
    if (!target) return;
    if (!target.closest('form')) return;
    captureBefore();
    setTimeout(captureAfter, 0);
  }, true);

  window.WarextWritingIntegration = {
    version: BRIDGE_VERSION,
    addonVersion: ADDON_VERSION,
    snapshot: takeSnapshot,
    diff,
    recent(limit = 10) {
      const state = load();
      return (Array.isArray(state.events) ? state.events : []).slice(-Math.max(1, Math.min(40, Number(limit) || 10)));
    },
    clear() {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    }
  };
})();
