# Warext Studios | XenForo Turkish Writing Checker

## English

Warext Studios Turkish Writing Checker V1.1.0 is a XenForo 2.3+ writing checker with three independent modes: **Local**, **AI**, and **AI + Local assisted**.

Current package: `Warext-Turkce-Yazim-Denetimi-V1.1.0-XenForo.zip`.

Local mode keeps the complete Warext browser-side Turkish language engine and does not make AI requests. AI mode skips the heavy local language packages and uses the server-side AI gateway. Hybrid mode sends bounded, generation-matched local-engine candidates together with the active text context to AI so the model can validate them, remove false positives, choose the contextually correct correction, and add obvious missed issues.

When Warext AI Content Inspector V1.2.0+ is installed, both add-ons can share one configured provider/model/API budget without creating a hard add-on dependency. Caret-window requests ask only for writing analysis; moderation is combined only when the complete authored message is being evaluated, so partial editor text is never reused as a full-post moderation score.

The V4.1 editor runtime replaces the old whole-document live path with a bounded caret-centered analysis window, adaptive slow mode, idle scheduling, request throttling, cancellable AI requests, short-lived client caching, deduplicated Froala surfaces, settled long-text scanning and deferred document-level processing. AI keys remain server-side; the browser calls only the same-origin XenForo endpoint with CSRF protection.

No manual SQL import is required. Install or upgrade the package through XenForo ACP → **Add-ons → Install/upgrade from archive**.

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
