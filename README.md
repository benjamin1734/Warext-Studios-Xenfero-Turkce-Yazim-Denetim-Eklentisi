# Warext Studios | XenForo Turkish Writing Checker

## English

A Turkish spelling, grammar, punctuation, context, and meaning checker for XenForo 2.3+. Starting with V1.1.0, the system provides three independent operating modes: **Local**, **AI**, and **AI + Local assisted**.

## Current version

Current version: **V1.1.0**

Installation package:

`Warext-Turkce-Yazim-Denetimi-V1.1.0-XenForo.zip`

The ZIP can be installed directly through XenForo ACP → **Add-ons → Install/upgrade from archive** or uploaded over an existing installation as an upgrade. No manual SQL import is required.

## Operating modes

### Local mode

All writing checks run in the Warext browser-side local engine. Dictionary, morphology, n-gram, semantic knowledge, contextual spelling, and paragraph-analysis layers remain available. No external AI request is made.

### AI mode

Writing checks run through the server-side AI gateway. In this mode, the large local dictionary, entity, idiom, language-model, and semantic packages are not loaded into the editor, reducing startup and memory usage compared with Local/Hybrid mode. The API key is never sent to the browser.

### AI + Local assisted mode

The local engine first produces candidate writing issues for the active text window. Those candidates are sent to AI together with context that belongs to the same editor/text generation. AI does not blindly accept local candidates; it can remove false positives, choose the contextually correct correction, and add obvious issues missed by the local engine.

## Shared operation with Warext AI Content Inspector

When Warext AI Content Inspector V1.2.0+ is installed, Writing Checker in `auto` mode can share its selected external provider, model, API key, budget, and usage tracking. There is no mandatory XenForo dependency between the two add-ons:

- if only Writing Checker is installed, standalone AI settings or Local-only mode can be used;
- if only AI Content Inspector is installed, content inspection continues normally;
- when both are installed, the shared server-side gateway can be used;
- the active editor window requests writing analysis only and does not waste moderation tokens;
- when full-message scope is available, the same provider request can produce moderation + writing results together;
- if the shared layer is disabled or unavailable, `auto` mode can fall back to Writing Checker's standalone provider.

A moderation result produced for a complete message during a shared request may be placed into a short-lived reuse layer. When the same normalized content is submitted, AI Content Inspector can skip a second external-provider request.

## V4.1 long-text and freeze protection

V1.1.0 completely changes the live editor flow. The old path that synchronously scanned the entire rich-text tree and broad context on every input has been removed.

The new runtime:

- does not create a separate `keyup` analysis queue for every key;
- debounces input;
- initially analyzes only the active sentence/paragraph window around the caret;
- automatically narrows the live local-analysis window for very long text;
- enables a 6-second adaptive slow mode when local analysis takes roughly more than 24 ms;
- moves low-priority work into idle time with `requestIdleCallback()` when supported;
- runs AI only after real input/paste/cut changes; focus or click alone does not create provider calls;
- applies a default 2500 ms minimum interval between live AI requests in addition to debounce;
- limits the live AI window to 2200 characters by default and narrows it to as little as 1600 characters for 10,000+ character documents;
- cancels stale AI requests with `AbortController`;
- uses short-lived client caching for identical text;
- separates Local/Hybrid long-text scanning from the live typing path and starts it only after input settles;
- processes at most 2 segments and roughly 6 ms of main-thread budget per idle cycle during long-text scanning;
- avoids analyzing Froala's hidden textarea and visible contenteditable surface twice at the same time;
- skips live full-document semantic analysis for 5000+ character documents and performs deep scanning only after typing stops;
- loads the document-level semantic layer later/idle after editor startup;
- does not load heavy local dictionary, entity, idiom, language-model, or semantic packages at all in AI-only mode.

The goal of this architecture is not merely to increase debounce time, but to keep work during typing within bounded text-window, time, and request budgets.

## Standalone AI providers

When Writing Checker is used by itself, these provider paths are supported:

- OpenAI Responses API
- OpenRouter / OpenAI-compatible API
- custom OpenAI-compatible endpoint
- Ollama / local OpenAI-compatible endpoint

Custom OpenAI-compatible URLs accept only HTTP/HTTPS and reject embedded usernames/passwords. When OpenRouter is selected, the official endpoint is used. Provider URLs and API keys remain on the XenForo server. The browser only calls the same-origin XenForo `warext-spell-ai/analyze` endpoint with a CSRF token. The server also rejects direct endpoint requests when AI mode is disabled in ACP.

To avoid unnecessary token use, AI responses do not rewrite the whole text; they return only detected issue locations and correction suggestions.

## Local engine

Local/Hybrid modes preserve the existing V3.1.x engine: dictionary and morphology, proper-name/apostrophe rules, compound/separate spelling, colloquial usage, punctuation, syntax, n-gram, semantic roles, verb valency, proposition graph, contextual multi-letter repair, long-text segments, and document-level semantic checks can all be used.

## Administration options

ACP allows separate management of operating mode, AI source, standalone provider/model/base URL, timeout, AI minimum/maximum characters, AI debounce, live AI window, minimum AI request interval, local debounce, live local-analysis window size, semantic sensitivity, long-text limits, custom dictionary, and custom proper-name lists.

## Installation note

If the XenForo archive installer is disabled, add this to `src/config.php`:

```php
$config['enableAddOnArchiveInstaller'] = true;
```

Add-on tables are managed automatically during installation and upgrades.

## Quality validation

The release pipeline runs `node --check` for all runtime JavaScript files, `php -l` for all PHP files, XML/JSON validation, dictionary and language-engine regressions, long-text tests, the V3.1.3 performance contract, and the V4.1 editor/AI mode contract. A package is produced only after these checks pass.

## Repository structure

- `upload/`: files installed into XenForo
- `source/`: production sources for the local language engine
- `tests/`: regression, benchmark, and performance tests
- `tools/`: build and validation tools

## Support

For questions, bug reports, installation support, and help with Warext Studios XenForo add-ons, you can join our support Discord server:

**Discord:** https://discord.gg/tgsV5XMcFS

---

## Türkçe

XenForo 2.3+ için Türkçe yazım, dilbilgisi, noktalama, bağlam ve anlam denetimi eklentisi. V1.1.0 ile sistem **Yerel**, **AI** ve **AI + Yerel destekli** olmak üzere üç ayrı çalışma moduna sahiptir.

## Güncel sürüm

Güncel sürüm: **V1.1.0**

Kurulum paketi:

`Warext-Turkce-Yazim-Denetimi-V1.1.0-XenForo.zip`

ZIP dosyası XenForo ACP → **Add-ons → Install/upgrade from archive** alanından doğrudan kurulabilir veya mevcut sürümün üzerine yükseltilebilir. Manuel SQL içe aktarma gerekmez.

## Çalışma modları

### Yerel mod

Tüm yazım denetimi tarayıcıdaki Warext yerel motorunda yapılır. Sözlük, morfoloji, n-gram, semantik bilgi, bağlamsal yazım ve paragraf analiz katmanları korunur. Harici AI isteği yapılmaz.

### AI modu

Yazım denetimi sunucu tarafındaki AI gateway üzerinden yapılır. Bu modda büyük yerel sözlük, entity, deyim, dil modeli ve semantik paketleri editörde yüklenmez; bu nedenle ilk açılış ve bellek tüketimi Yerel/Hybrid moda göre daha düşüktür. API anahtarı hiçbir zaman tarayıcıya gönderilmez.

### AI + Yerel destekli mod

Yerel motor önce aktif metin penceresinde aday yazım sorunlarını üretir. Bu adaylar aynı editör/metin nesline ait bağlamla birlikte AI'ya gönderilir. AI yerel adayları körü körüne kabul etmez; yanlış pozitifleri eler, bağlama göre doğru öneriyi seçer ve yerel motorun kaçırdığı açık sorunları ekleyebilir.

## Warext AI İçerik Denetimi ile ortak çalışma

Warext AI İçerik Denetimi V1.2.0+ kuruluysa Yazım Denetimi `auto` modunda onun seçili harici sağlayıcısını, modelini, API anahtarını, bütçe ve kullanım takibini paylaşabilir. İki eklenti arasında zorunlu XenForo bağımlılığı yoktur:

- yalnız Yazım Denetimi kuruluysa standalone AI ayarları veya yalnız Yerel mod kullanılabilir;
- yalnız AI İçerik Denetimi kuruluysa içerik denetimi normal şekilde çalışır;
- ikisi birlikteyse sunucu içindeki ortak gateway kullanılabilir;
- aktif editör penceresi yalnız yazım görevi ister; gereksiz moderasyon tokenı harcamaz;
- tam mesaj kapsamı uygunsa aynı provider isteği moderasyon + yazım sonucunu birlikte üretebilir;
- ortak katman kapatılırsa veya kullanılamazsa `auto` modu Yazım Denetiminin standalone sağlayıcısına geri düşebilir.

Ortak çağrıda tam mesaj için üretilen moderasyon sonucu kısa süreli tekrar kullanım katmanına bırakılabilir. Aynı normalize içerik gönderildiğinde AI İçerik Denetimi ikinci harici provider isteğini atlayabilir.

## V4.1 uzun metin ve donma koruması

V1.1.0 canlı editör akışı tamamen değiştirildi. Eski editörün her girişte bütün zengin metin ağacını ve geniş bağlamı senkron tarayan yolu kaldırıldı.

Yeni runtime:

- her tuş için ayrı `keyup` analiz kuyruğu oluşturmaz;
- girişleri debounce eder;
- önce yalnız imleç çevresindeki aktif cümle/paragraf penceresini inceler;
- çok uzun metinde canlı yerel pencereyi otomatik daraltır;
- yerel analiz yaklaşık 24 ms üstüne çıktığında 6 saniyelik adaptif yavaş mod uygular;
- uygun tarayıcılarda `requestIdleCallback()` ile düşük öncelikli işi boş zamana taşır;
- AI yalnız gerçek input/paste/cut değişikliklerinden sonra çalışır; focus/click tek başına provider çağrısı üretmez;
- AI isteklerinde debounce'a ek olarak varsayılan 2500 ms minimum çağrı aralığı uygular;
- canlı AI penceresini varsayılan 2200 karakterle sınırlar, 10.000+ karakter belgelerde 1600 karaktere kadar daraltır;
- AI isteklerinde `AbortController` ile eski isteği iptal eder;
- aynı metin için kısa süreli istemci önbelleği kullanır;
- Yerel/Hybrid uzun-metin taramasını canlı yazım hattından ayırır ve ancak giriş sakinleştikten sonra çalıştırır;
- uzun-metin taramasında bir idle turunda en fazla 2 segment ve yaklaşık 6 ms ana-thread bütçesi kullanır;
- Froala'nın gizli textarea ve görünen contenteditable yüzeyini aynı anda iki kez analiz etmez;
- 5000+ karakter belgelerde belge-semantik katmanı canlı tam-belge analizini atlar, yalnız yazım durduktan sonra derin tarama yapar;
- belge düzeyi semantik katmanı editör açılışından sonra gecikmeli/idle yükler;
- AI-only modunda ağır yerel sözlük, entity, deyim, dil modeli ve semantik paketlerini hiç yüklemez.

Bu mimarinin amacı yalnız debounce süresini büyütmek değil, kullanıcı yazarken yapılan işi sabit bir pencere, süre ve istek bütçesine bağlamaktır.

## Standalone AI sağlayıcıları

Yazım Denetimi tek başına kullanıldığında aşağıdaki yollar desteklenir:

- OpenAI Responses API
- OpenRouter / OpenAI-compatible API
- özel OpenAI-compatible endpoint
- Ollama / yerel OpenAI-compatible endpoint

OpenAI-compatible özel URL'lerde yalnız HTTP/HTTPS kabul edilir; URL içine gömülü kullanıcı adı/şifre reddedilir. OpenRouter seçildiğinde resmi endpoint kullanılır. Sağlayıcı URL'si ve API anahtarı yalnız XenForo sunucusu tarafında tutulur. Tarayıcı sadece same-origin XenForo `warext-spell-ai/analyze` endpoint'ine CSRF token ile istek gönderir. Sunucu ayrıca ACP'de AI modu kapalıysa doğrudan endpoint çağrısını reddeder.

AI cevabı gereksiz token üretmemek için bütün metni yeniden yazmaz; yalnız tespit edilen sorunların konumlarını ve düzeltme önerilerini döndürür.

## Yerel motor

Yerel/Hybrid modlarında mevcut V3.1.x motoru korunur: sözlük ve morfoloji, özel isim/kesme işareti, birleşik-ayrı yazım, günlük kullanım, noktalama, sözdizimi, n-gram, anlamsal roller, fiil istemi, önerme grafiği, bağlamsal çoklu-harf onarımı, uzun metin segmentleri ve belge düzeyi semantik kontrol kullanılabilir.

## Yönetim seçenekleri

ACP üzerinden çalışma modu, AI kaynağı, standalone provider/model/base URL, timeout, AI minimum/maksimum karakter, AI debounce, AI canlı çalışma penceresi, minimum AI istek aralığı, yerel debounce, canlı yerel analiz pencere boyutu, semantik hassasiyet, uzun metin sınırları, özel sözlük ve özel isim listeleri ayrı ayrı yönetilebilir.

## Kurulum notu

XenForo arşiv kurucusu kapalıysa `src/config.php` içine:

```php
$config['enableAddOnArchiveInstaller'] = true;
```

ayarını ekleyin. Eklenti tabloları kurulum/yükseltme sırasında otomatik yönetilir.

## Kalite doğrulaması

Release hattı bütün runtime JavaScript dosyalarında `node --check`, bütün PHP dosyalarında `php -l`, XML/JSON doğrulaması, sözlük ve dil motoru regresyonları, uzun metin testleri, V3.1.3 performans sözleşmesi ve V4.1 editör/AI mod sözleşmesini çalıştırır. Paket yalnız bu kontroller başarılı olduğunda oluşturulur.

## Depo yapısı

- `upload/`: XenForo'ya kurulacak dosyalar
- `source/`: yerel dil motoru üretim kaynakları
- `tests/`: regresyon, benchmark ve performans testleri
- `tools/`: derleme ve doğrulama araçları

## Destek

Sorularınız, hata bildirimleriniz, kurulum desteği ve Warext Studios XenForo eklentileriyle ilgili yardım için destek Discord sunucumuza katılabilirsiniz:

**Discord:** https://discord.gg/tgsV5XMcFS
