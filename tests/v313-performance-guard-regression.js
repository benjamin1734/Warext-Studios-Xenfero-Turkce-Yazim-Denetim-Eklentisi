'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const runtime = path.join(__dirname,'../upload/js/warext/turkish-spellcheck/performance-guard-v313.js');
const documentPath = path.join(__dirname,'../upload/js/warext/turkish-spellcheck/document-v300.js');
const editorPath = path.join(__dirname,'../upload/js/warext/turkish-spellcheck/editor-v400.js');
const bootstrapPath = path.join(__dirname,'../upload/js/warext/turkish-spellcheck/bootstrap-v110.js');
const addonPath = path.join(__dirname,'../upload/src/addons/Warext/TurkishSpellCheck/addon.json');
const optionsPath = path.join(__dirname,'../upload/src/addons/Warext/TurkishSpellCheck/_data/options.xml');

const source = fs.readFileSync(runtime,'utf8');
const documentSource = fs.readFileSync(documentPath,'utf8');
const editorSource = fs.readFileSync(editorPath,'utf8');
const bootstrap = fs.readFileSync(bootstrapPath,'utf8');
const addon = JSON.parse(fs.readFileSync(addonPath,'utf8'));
const options = fs.readFileSync(optionsPath,'utf8');

assert.ok(source.includes("const VERSION = '3.1.3';"));
assert.ok(source.includes('MAX_LONGTEXT_SEGMENT = 1000'));
assert.ok(source.includes('SHORT_FULL_LIMIT = 2400'));
assert.ok(source.includes('LIVE_WINDOW = 760'));
assert.ok(source.includes('DEEP_WINDOW = 1050'));
assert.ok(source.includes('DEEP_SETTLE_MS = 2400'));
assert.ok(source.includes('MAX_DEEP_WINDOWS = 4'));
assert.ok(source.includes('MAX_SPINE_CHARS = 2600'));
assert.ok(source.includes('navigator.scheduling?.isInputPending'));
assert.ok(source.includes('context?.settled === true'));
assert.ok(source.includes('buildWindows(text,live)'));
assert.ok(source.includes('changedRange(lastText,source)'));
assert.ok(source.includes('settled-hierarchical'));
assert.ok(source.includes('live-window'));
assert.ok(source.includes('boundedMainThread:true'));
assert.ok(source.includes('externalDependencies:0'));
assert.ok(source.includes('core.sentenceSegments = function guardedSentenceSegments'));
assert.ok(!/fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|https?:\/\//u.test(source));

assert.ok(documentSource.includes("const VERSION = '3.1.3';"));
assert.ok(documentSource.includes('DEEP_SETTLE_MS = 2550'));
assert.ok(documentSource.includes("deep && st.mode === 'live-window'"));
assert.ok(documentSource.includes('settled:deep'));
assert.ok(documentSource.includes('forceDeep:deep'));
assert.ok(documentSource.includes('rangeIndex(el)'));
assert.ok(!/fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|https?:\/\//u.test(documentSource));

assert.ok(editorSource.includes("const VERSION = '4.0.0';"));
assert.ok(editorSource.includes("const localEnabled = () => cfg.mode === 'local' || cfg.mode === 'hybrid';"));
assert.ok(editorSource.includes("const aiEnabled = () => cfg.aiEnabled && cfg.aiEndpoint"));
assert.ok(editorSource.includes('new AbortController()'));
assert.ok(editorSource.includes('requestIdleCallback'));
assert.ok(editorSource.includes("credentials: 'same-origin'"));
assert.ok(editorSource.includes("body.set('_xfToken'"));
assert.ok(editorSource.includes('localContextForScope'));
assert.ok(editorSource.includes('st.slowUntil = Date.now() + 5000'));
assert.ok(!editorSource.includes("addEventListener('keyup'"));
assert.ok(!/https?:\/\/|WebSocket|EventSource|sendBeacon/u.test(editorSource));

const guardPos = bootstrap.indexOf("loadScript('performance-guard-v313.js'");
const editorPos = bootstrap.indexOf("loadScript('editor-v400.js'");
const longPos = bootstrap.indexOf("loadScript('longtext-v110.js'");
const documentPos = bootstrap.indexOf("loadScript('document-v300.js'");
assert.ok(guardPos > -1 && editorPos > guardPos && longPos > guardPos && documentPos > guardPos);
assert.ok(bootstrap.includes("const VERSION = '1.1.0';"));
assert.ok(bootstrap.includes("const ASSET_VERSION = '4000';"));
assert.ok(bootstrap.includes("const needsLocal = mode === 'local' || mode === 'hybrid';"));
assert.ok(bootstrap.includes("dataset.wtscSemantic = needsLocal ? 'v313' : 'not-loaded'"));
assert.equal(addon.version_string,'1.1.0');
assert.equal(addon.version_id,5400000);
assert.ok(options.includes('option_id="warextSpellMode"'));
assert.ok(options.includes('local=Yerel mod'));
assert.ok(options.includes('ai=AI modu'));
assert.ok(options.includes('hybrid=AI + Yerel destekli mod'));
assert.ok(options.includes('<default_value>1000</default_value>'));
assert.ok(options.includes('<default_value>160</default_value>'));

console.log('V4 editör + V3.1.3 yerel performans koruması sözleşmesi başarılı.');
