(() => {
  'use strict';

  if (window.__warextPerformanceGuardV313) return;
  const core = window.WarextTextCoreV110;
  const engine = window.WarextTurkishSpellEngineV110;
  if (!core?.sentenceSegments || !engine?.analyzeParagraph) return;
  window.__warextPerformanceGuardV313 = true;

  const VERSION = '3.1.3';
  const MAX_LONGTEXT_SEGMENT = 1000;
  const SHORT_FULL_LIMIT = 2400;
  const LIVE_WINDOW = 760;
  const DEEP_WINDOW = 1050;
  const DEEP_SETTLE_MS = 2400;
  const MAX_DEEP_WINDOWS = 4;
  const MAX_SPINE_CHARS = 2600;
  const originalSentenceSegments = core.sentenceSegments.bind(core);
  const originalAnalyzeParagraph = engine.analyzeParagraph.bind(engine);
  const originalSemanticDocument = typeof engine.analyzeSemanticDocument === 'function' ? engine.analyzeSemanticDocument.bind(engine) : null;

  let lastInputAt = 0;
  let lastText = '';
  let analyses = 0;
  let liveAnalyses = 0;
  let deepAnalyses = 0;
  let skippedWindows = 0;
  let lastElapsed = 0;

  function isEditorTarget(target) {
    return target instanceof Element && !!target.closest?.('textarea[name="message"],textarea.js-editor[data-xf-init~="editor"],.fr-element[contenteditable="true"]');
  }

  function inputPending() {
    try { return !!navigator.scheduling?.isInputPending?.({includeContinuous:true}); }
    catch (_) { return false; }
  }

  document.addEventListener('input',event => {
    if (isEditorTarget(event.target)) lastInputAt = performance.now();
  },true);
  document.addEventListener('paste',event => {
    if (isEditorTarget(event.target)) lastInputAt = performance.now();
  },true);
  document.addEventListener('cut',event => {
    if (isEditorTarget(event.target)) lastInputAt = performance.now();
  },true);
  document.addEventListener('blur',event => {
    if (isEditorTarget(event.target)) lastInputAt = 0;
  },true);

  core.sentenceSegments = function guardedSentenceSegments(text,protectedRanges,maxSize,...rest) {
    let safeSize = maxSize;
    if (Number.isFinite(Number(maxSize)) && Number(maxSize) > MAX_LONGTEXT_SEGMENT) safeSize = MAX_LONGTEXT_SEGMENT;
    return originalSentenceSegments(text,protectedRanges,safeSize,...rest);
  };

  function clamp(value,min,max) {
    return Math.max(min,Math.min(max,value));
  }

  function changedRange(previous,current) {
    try {
      if (typeof core.changedRange === 'function') return core.changedRange(previous,current);
    } catch (_) {}
    const a = String(previous || '');
    const b = String(current || '');
    let prefix = 0;
    const limit = Math.min(a.length,b.length);
    while (prefix < limit && a[prefix] === b[prefix]) prefix++;
    let suffix = 0;
    while (suffix < a.length - prefix && suffix < b.length - prefix && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) suffix++;
    return {start:prefix,oldEnd:a.length - suffix,newEnd:b.length - suffix};
  }

  function sentenceAlignedWindow(text,center,size) {
    const source = String(text || '');
    if (source.length <= size) return {start:0,end:source.length,text:source};
    const half = Math.floor(size / 2);
    let start = clamp(Math.floor(center) - half,0,Math.max(0,source.length - size));
    let end = Math.min(source.length,start + size);
    const left = source.slice(Math.max(0,start - 180),start + 1);
    const leftMatch = /[.!?\n]\s*([^.!?\n]*)$/u.exec(left);
    if (leftMatch) start = Math.max(0,start - leftMatch[1].length);
    const right = source.slice(end,Math.min(source.length,end + 180));
    const rightMatch = /^([^.!?\n]*[.!?\n])/u.exec(right);
    if (rightMatch) end = Math.min(source.length,end + rightMatch[1].length);
    if (end - start > size + 320) end = Math.min(source.length,start + size + 320);
    return {start,end,text:source.slice(start,end)};
  }

  function addWindow(list,window) {
    if (!window?.text?.trim()) return;
    const overlaps = list.some(item => Math.max(item.start,window.start) < Math.min(item.end,window.end) - 180);
    if (!overlaps) list.push(window);
  }

  function buildWindows(text,live) {
    const source = String(text || '');
    if (source.length <= SHORT_FULL_LIMIT) return [{start:0,end:source.length,text:source}];
    const diff = changedRange(lastText,source);
    const changedCenter = clamp(((diff.start || 0) + (diff.newEnd ?? diff.start ?? 0)) / 2,0,source.length);
    const size = live ? LIVE_WINDOW : DEEP_WINDOW;
    const windows = [];
    addWindow(windows,sentenceAlignedWindow(source,changedCenter,size));
    if (live) return windows.slice(0,1);
    addWindow(windows,sentenceAlignedWindow(source,size / 2,size));
    addWindow(windows,sentenceAlignedWindow(source,source.length / 2,size));
    addWindow(windows,sentenceAlignedWindow(source,source.length - size / 2,size));
    if (source.length > 16000) {
      const rotating = ((analyses % 5) + 1) / 6;
      addWindow(windows,sentenceAlignedWindow(source,source.length * rotating,size));
    }
    return windows.slice(0,MAX_DEEP_WINDOWS);
  }

  function shiftItem(item,offset) {
    if (!item || !Number.isFinite(Number(item.start)) || !Number.isFinite(Number(item.end))) return null;
    return {...item,start:Number(item.start) + offset,end:Number(item.end) + offset};
  }

  function dedupe(items) {
    const out = [];
    const seen = new Set();
    for (const item of items || []) {
      if (!item || item.end < item.start) continue;
      const key = `${item.start}:${item.end}:${item.rule || item.category || ''}:${item.message || ''}:${item.suggestions?.[0] || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  function buildSpine(text) {
    const source = String(text || '');
    const segments = originalSentenceSegments(source);
    if (segments.length <= 2 || source.length <= SHORT_FULL_LIMIT) return null;
    const wanted = new Set([0,segments.length - 1]);
    const maxSentences = Math.min(16,segments.length);
    for (let i = 0; i < maxSentences; i++) wanted.add(Math.round(i * (segments.length - 1) / Math.max(1,maxSentences - 1)));
    const pieces = [];
    let joined = '';
    for (const index of [...wanted].sort((a,b) => a - b)) {
      const segment = segments[index];
      if (!segment?.text?.trim()) continue;
      const remaining = MAX_SPINE_CHARS - joined.length;
      if (remaining < 80) break;
      const pieceText = segment.text.slice(0,Math.min(segment.text.length,remaining));
      const separator = joined ? 1 : 0;
      const joinedStart = joined.length + separator;
      joined += (joined ? '\n' : '') + pieceText;
      pieces.push({joinedStart,joinedEnd:joinedStart + pieceText.length,originalStart:segment.start,originalEnd:segment.start + pieceText.length});
    }
    return joined.length >= 120 ? {text:joined,pieces} : null;
  }

  function mapSpineItem(item,spine) {
    if (!item || !spine) return null;
    const start = Number(item.start);
    const end = Number(item.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    const a = spine.pieces.find(piece => start >= piece.joinedStart && start <= piece.joinedEnd);
    const b = spine.pieces.find(piece => end >= piece.joinedStart && end <= piece.joinedEnd);
    if (!a || !b || a !== b) return null;
    return {...item,start:a.originalStart + Math.max(0,start - a.joinedStart),end:a.originalStart + Math.max(0,end - a.joinedStart),rule:item.rule ? `adaptive-${item.rule}` : 'adaptive-semantic'};
  }

  function coherenceFrom(reports,semantic) {
    const scores = [];
    const similarities = [];
    const topics = [];
    for (const report of reports) {
      const coherence = report?.coherence || report?.semanticDocument?.coherence || {};
      if (Number.isFinite(Number(coherence.score))) scores.push(Number(coherence.score));
      if (Number.isFinite(Number(coherence.averageAdjacentSimilarity))) similarities.push(Number(coherence.averageAdjacentSimilarity));
      for (const topic of coherence.topics || []) if (topic?.name && !topics.some(item => item.name === topic.name)) topics.push(topic);
    }
    const semanticCoherence = semantic?.coherence || {};
    if (Number.isFinite(Number(semanticCoherence.score))) scores.push(Number(semanticCoherence.score));
    if (Number.isFinite(Number(semanticCoherence.averageAdjacentSimilarity))) similarities.push(Number(semanticCoherence.averageAdjacentSimilarity));
    for (const topic of semanticCoherence.topics || []) if (topic?.name && !topics.some(item => item.name === topic.name)) topics.push(topic);
    return {
      score:scores.length ? Math.round(scores.reduce((sum,value) => sum + value,0) / scores.length) : 100,
      averageAdjacentSimilarity:similarities.length ? similarities.reduce((sum,value) => sum + value,0) / similarities.length : undefined,
      topics:topics.slice(0,6)
    };
  }

  function adaptiveParagraph(rawText,context = {}) {
    const text = String(rawText || '');
    const isDocumentPass = !!(context?.longText || context?.fullParagraph);
    if (!isDocumentPass || text.length <= SHORT_FULL_LIMIT) return originalAnalyzeParagraph(text,context);

    analyses++;
    const now = performance.now();
    const forcedDeep = context?.settled === true || context?.forceDeep === true;
    const live = forcedDeep ? false : (inputPending() || (lastInputAt > 0 && now - lastInputAt < DEEP_SETTLE_MS - 250));
    if (live) liveAnalyses++;
    else deepAnalyses++;
    const started = performance.now();
    const windows = buildWindows(text,live);
    const reports = [];
    const warnings = [];
    const fixes = [];
    const hardBudget = live ? 12 : 34;

    for (const window of windows) {
      if ((!forcedDeep && inputPending()) || performance.now() - started >= hardBudget) {
        skippedWindows++;
        break;
      }
      let report = null;
      try { report = originalAnalyzeParagraph(window.text,{...context,longText:true,fullParagraph:false,adaptiveWindow:true,settled:false}); }
      catch (_) { report = null; }
      if (!report) continue;
      reports.push(report);
      for (const item of report.warnings || []) {
        const shifted = shiftItem(item,window.start);
        if (shifted) warnings.push(shifted);
      }
      for (const item of report.fixes || []) {
        const shifted = shiftItem(item,window.start);
        if (shifted) fixes.push(shifted);
      }
    }

    let semantic = null;
    if (!live && originalSemanticDocument && !inputPending() && performance.now() - started < 24) {
      const spine = buildSpine(text);
      if (spine) {
        try {
          semantic = originalSemanticDocument(spine.text,{...context,longText:true,fullParagraph:true,adaptiveSpine:true});
          for (const item of semantic?.warnings || []) {
            const mapped = mapSpineItem(item,spine);
            if (mapped) warnings.push(mapped);
          }
        } catch (_) { semantic = null; }
      }
    }

    lastText = text;
    lastElapsed = performance.now() - started;
    const coherence = coherenceFrom(reports,semantic);
    return {
      warnings:dedupe(warnings).sort((a,b) => (b.confidence || 0) - (a.confidence || 0) || a.start - b.start).slice(0,36),
      fixes:dedupe(fixes).sort((a,b) => a.start - b.start || (b.confidence || 0) - (a.confidence || 0)).slice(0,36),
      coherence,
      semanticDocument:semantic || {warnings:[],coherence},
      adaptivePerformance:{version:VERSION,mode:live ? 'live-window' : 'settled-hierarchical',originalCharacters:text.length,analyzedWindows:reports.length,requestedWindows:windows.length,semanticSpine:!!semantic,elapsedMs:Math.round(lastElapsed),boundedMainThread:true,externalDependencies:0},
      fullParagraphMeaning:!live,
      fullyLocal:true,
      externalDependencies:0
    };
  }

  engine.analyzeParagraph = adaptiveParagraph;
  engine.stats = {...(engine.stats || {}),performanceGuard:'v313-adaptive-main-thread',performanceGuardVersion:VERSION,maxLongTextSegment:MAX_LONGTEXT_SEGMENT,liveDocumentWindow:LIVE_WINDOW,settledDocumentWindow:DEEP_WINDOW,externalDependencies:0};

  window.WarextPerformanceGuardV313 = Object.freeze({
    VERSION,
    profile:() => ({analyses,liveAnalyses,deepAnalyses,skippedWindows,lastElapsedMs:Math.round(lastElapsed),maxLongTextSegment:MAX_LONGTEXT_SEGMENT,settleMs:DEEP_SETTLE_MS}),
    markSettled:() => { lastInputAt = 0; }
  });

  document.documentElement.dataset.wtscPerformance = VERSION;
})();