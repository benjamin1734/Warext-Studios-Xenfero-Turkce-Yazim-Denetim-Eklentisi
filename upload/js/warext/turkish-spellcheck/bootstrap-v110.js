(() => {
  'use strict';

  if (window.__warextTurkishSpellBootstrapV110) return;
  window.__warextTurkishSpellBootstrapV110 = true;

  const VERSION = '1.0.6';
  const ASSET_VERSION = '3130';
  const script = document.currentScript;
  const scriptUrl = script?.src || '';
  const baseDir = scriptUrl ? scriptUrl.slice(0,scriptUrl.lastIndexOf('/') + 1) : '';
  let started = false;
  let observer = null;

  document.documentElement.dataset.wtscBootstrap = VERSION;

  function editorExists(root = document) {
    if (root instanceof Element && root.matches?.('.js-editor,.fr-element[contenteditable="true"],textarea[name="message"],input[name="title"]')) return true;
    return !!root.querySelector?.('.js-editor,.fr-element[contenteditable="true"],textarea[name="message"],input[name="title"]');
  }

  function loadScript(file,readyCheck) {
    return new Promise((resolve,reject) => {
      if (readyCheck?.()) return resolve();
      const full = baseDir ? baseDir + file : file;
      const versioned = `${full}${full.includes('?') ? '&' : '?'}wtsc=${ASSET_VERSION}`;
      const existing = Array.from(document.scripts).find(el => el.dataset.wtscAsset === file);
      if (existing) {
        if (existing.dataset.wtscLoaded === '1' || readyCheck?.()) return resolve();
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      const el = document.createElement('script');
      el.src = versioned;
      el.async = false;
      el.dataset.wtscAsset = file;
      el.dataset.wtscAssetVersion = ASSET_VERSION;
      el.addEventListener('load',() => {
        el.dataset.wtscLoaded = '1';
        resolve();
      },{once:true});
      el.addEventListener('error',reject,{once:true});
      document.head.appendChild(el);
    });
  }

  function showAssetError() {
    document.documentElement.dataset.wtscStatus = 'asset-load-error';
    const anchor = document.querySelector('.fr-box') || document.querySelector('textarea[name="message"]') || document.querySelector('.js-editor');
    if (!anchor || document.querySelector('.wtsc-bootstrap-error')) return;
    const bar = document.createElement('div');
    bar.className = 'wtsc-bootstrap-error';
    bar.textContent = 'Yazım denetimi dosyaları yüklenemedi.';
    bar.style.cssText = 'margin:7px 0 3px;padding:7px 10px;border:1px solid rgba(180,70,70,.45);border-radius:7px;font-size:12px;';
    anchor.insertAdjacentElement('afterend',bar);
  }

  async function start() {
    if (started) return;
    started = true;
    document.documentElement.dataset.wtscStatus = 'assets-loading';
    try {
      await loadScript('text-core-v110.js',() => !!window.WarextTextCoreV110);
      await loadScript('lexicon-v200.js',() => !!window.WarextLexiconV200);
      await loadScript('dictionary-v110.js',() => !!window.WarextTurkishSpellEngineV110);
      await loadScript('corrections-v110.js',() => !!window.WarextCorrectionMapV110);
      await loadScript('language-v110.js',() => !!window.__warextLanguageV110);
      await loadScript('semantic-v110.js',() => !!window.__warextSemanticV120);
      await loadScript('semantic-deep-v110.js',() => !!window.__warextSemanticDeepV130);
      await loadScript('semantic-context-v110.js',() => !!window.__warextSemanticContextV130);
      await loadScript('entities-v200.js',() => !!window.WarextEntitiesV200);
      await loadScript('idioms-v200.js',() => !!window.WarextIdiomsV200);
      await loadScript('lm-v200.js',() => !!window.WarextLmV200);
      await loadScript('micro-model-v200.js',() => !!window.WarextMicroModelV200);
      await loadScript('knowledge-v200.js',() => !!window.__warextKnowledgeV200);
      await loadScript('micro-integration-v200.js',() => !!window.__warextMicroIntegrationV200);
      await loadScript('learning-v200.js',() => !!window.__warextLearningV200);
      await loadScript('quality-v210.js',() => !!window.__warextQualityV210);
      await loadScript('quality-v220.js',() => !!window.__warextQualityV220);
      await loadScript('syntax-v220.js',() => !!window.__warextSyntaxV220);
      await loadScript('syntax-tuning-v220.js',() => !!window.__warextSyntaxTuningV220);
      await loadScript('semantic-ui-v110.js',() => !!window.__warextSemanticUiV130);
      await loadScript('context-v230.js',() => !!window.__warextContextV230);
      await loadScript('context-tuning-v231.js',() => !!window.__warextContextTuningV231);
      await loadScript('semantic-model-v300.js',() => !!window.WarextSemanticModelV300);
      await loadScript('semantic-knowledge-v310.js',() => !!window.WarextSemanticKnowledgeV310);
      await loadScript('runtime-v240.js',() => !!window.__warextRuntimeV240);
      await loadScript('semantic-document-v300.js',() => !!window.__warextSemanticDocumentV300);
      await loadScript('semantic-tuning-v301.js',() => !!window.__warextSemanticTuningV301);
      await loadScript('semantic-tuning-v302.js',() => !!window.__warextSemanticTuningV302);
      await loadScript('semantic-reasoning-v310.js',() => !!window.__warextSemanticReasoningV310);
      await loadScript('semantic-reasoning-tuning-v311.js',() => !!window.__warextSemanticReasoningTuningV311);
      await loadScript('contextual-orthography-v312.js',() => !!window.__warextContextualOrthographyV312);
      await loadScript('contextual-orthography-rerank-v312.js',() => !!window.__warextContextualOrthographyRerankV312);
      await loadScript('contextual-orthography-guard-v312.js',() => !!window.__warextContextualOrthographyGuardV312);
      if (!window.WarextTurkishSpellEngineV110) throw new Error('engine');
      await loadScript('performance-guard-v313.js',() => !!window.WarextPerformanceGuardV313);
      await loadScript('integration-v105.js',() => !!window.WarextWritingIntegration);
      await loadScript('editor-v110.js',() => !!window.__warextTurkishSpellCheckV110);
      await loadScript('longtext-v110.js',() => !!window.__warextLongTextV110);
      await loadScript('document-v300.js',() => !!window.__warextDocumentV300);
      document.documentElement.dataset.wtscStatus = 'assets-ready';
      document.documentElement.dataset.wtscSemantic = 'v313';
      document.documentElement.dataset.wtscPerformance = '3.1.3';
      observer?.disconnect();
    } catch (_) {
      showAssetError();
    }
  }

  function detect(root = document) {
    if (editorExists(root)) start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',() => detect(document),{once:true});
  else detect(document);

  if (!started && document.documentElement) {
    observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element && editorExists(node)) {
            start();
            return;
          }
        }
      }
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();