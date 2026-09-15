# Warext Studios | Türkçe Yazım Denetimi

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

Yerel motor önce aktif metin penceresinde aday yazım sorunlarını üretir. Bu adaylar metin bağlamıyla birlikte AI'ya gönderilir. AI yerel adayları körü körüne kabul etmez; yanlış pozitifleri eler, bağlama göre doğru öneriyi seçer ve yerel motorun kaçırdığı açık sorunları ekleyebilir.

## Warext AI İçerik Denetimi ile ortak çalışma

Warext AI İçerik Denetimi V1.2.0+ kuruluysa Yazım Denetimi `auto` modunda onun seçili harici sağlayıcısını, modelini, API anahtarını, bütçe ve kullanım takibini paylaşabilir. İki eklenti arasında zorunlu XenForo bağımlılığı yoktur:

- yalnız Yazım Denetimi kuruluysa standalone AI ayarları veya yalnız Yerel mod kullanılabilir;
- yalnız AI İçerik Denetimi kuruluysa içerik denetimi normal şekilde çalışır;
- ikisi birlikteyse tek sağlayıcı katmanı üzerinden birleşik moderasyon + yazım cevabı alınabilir;
- ortak katman kapatılırsa veya kullanılamazsa `auto` modu Yazım Denetiminin standalone sağlayıcısına geri düşebilir.

Ortak çağrıda içerik denetimi sonucu da üretilir. Aynı normalize metin kısa süre içinde gönderildiğinde AI İçerik Denetimi bu sonucu yeniden kullanabildiği için ikinci bir harici provider isteği engellenebilir.

## V4 uzun metin ve donma koruması

V1.1.0 canlı editör akışı tamamen değiştirildi. Eski editörün her girişte tüm zengin metin ağacını ve geniş bağlamı senkron tarayan yolu kaldırıldı.

Yeni runtime:

- her tuş için ayrı `keyup` analiz kuyruğu oluşturmaz;
- girişleri debounce eder;
- önce yalnız imleç çevresindeki aktif cümle/paragraf penceresini inceler;
- çok uzun metinde canlı pencereyi otomatik daraltır;
- ağır yerel analiz yaklaşık 28 ms üstüne çıktığında 5 saniyelik adaptif yavaş mod uygular;
- uygun tarayıcılarda `requestIdleCallback()` ile düşük öncelikli işi boş zamana taşır;
- Yerel/Hybrid tam-belge taramasını canlı yazım akışından ayrı tutar;
- belge düzeyi semantik katmanı editör açılışından sonra ve boş zamanda yükler;
- AI isteklerinde `AbortController` ile eski isteği iptal eder;
- aynı metin için kısa süreli istemci önbelleği kullanır;
- çok uzun belgelerde AI'ya tüm 50.000 karakteri her seferinde göndermek yerine aktif çalışma penceresini gönderir.

Bu mimarinin amacı yalnız debounce süresini büyütmek değil, kullanıcı yazarken yapılan işi sabit bir pencere ve süre bütçesine bağlamaktır.

## Standalone AI sağlayıcıları

Yazım Denetimi tek başına kullanıldığında aşağıdaki yollar desteklenir:

- OpenAI Responses API
- OpenRouter / OpenAI-compatible API
- özel OpenAI-compatible endpoint
- Ollama / yerel OpenAI-compatible endpoint

Sağlayıcı URL'si ve API anahtarı yalnız XenForo sunucusu tarafında tutulur. Tarayıcı sadece aynı-origin XenForo `warext-spell-ai/analyze` endpoint'ine CSRF token ile istek gönderir.

## Yerel motor

Yerel/Hybrid modlarında mevcut V3.1.x motoru korunur: sözlük ve morfoloji, özel isim/kesme işareti, birleşik-ayrı yazım, günlük kullanım, noktalama, sözdizimi, n-gram, anlamsal roller, fiil istemi, önerme grafiği, bağlamsal çoklu-harf onarımı, uzun metin segmentleri ve belge düzeyi semantik kontrol kullanılabilir.

## Yönetim seçenekleri

ACP üzerinden çalışma modu, AI kaynağı, standalone provider/model/base URL, timeout, AI minimum/maksimum karakter, AI debounce, yerel debounce, canlı analiz pencere boyutu, semantik hassasiyet, uzun metin sınırları, özel sözlük ve özel isim listeleri ayrı ayrı yönetilebilir.

## Kurulum notu

XenForo arşiv kurucusu kapalıysa `src/config.php` içine:

```php
$config['enableAddOnArchiveInstaller'] = true;
```

ayarını ekleyin. Eklenti tabloları kurulum/yükseltme sırasında otomatik yönetilir.

## Kalite doğrulaması

Release hattı bütün runtime JavaScript dosyalarında `node --check`, bütün PHP dosyalarında `php -l`, XML/JSON doğrulaması, sözlük ve dil motoru regresyonları, uzun metin testleri, V3.1.3 performans sözleşmesi ve V4 editör/AI mod sözleşmesini çalıştırır. Paket yalnız bu kontroller başarılı olduğunda oluşturulur.

## Depo yapısı

- `upload/`: XenForo'ya kurulacak dosyalar
- `source/`: yerel dil motoru üretim kaynakları
- `tests/`: regresyon, benchmark ve performans testleri
- `tools/`: derleme ve doğrulama araçları

---

# English

Warext Studios Turkish Writing Checker V1.1.0 is a XenForo 2.3+ writing checker with three independent modes: **Local**, **AI**, and **AI + Local assisted**.

Current package: `Warext-Turkce-Yazim-Denetimi-V1.1.0-XenForo.zip`.

Local mode keeps the complete Warext browser-side Turkish language engine and does not make AI requests. AI mode skips the heavy local language packages and uses the server-side AI gateway. Hybrid mode sends bounded local-engine candidates together with the active text context to AI so the model can validate them, remove false positives, choose the contextually correct correction, and add obvious missed issues.

When Warext AI Content Inspector V1.2.0+ is installed, both add-ons can share one configured provider/model/API budget without creating a hard add-on dependency. A combined provider request can return moderation and writing results together, and the moderation result may be reused for the same normalized text shortly afterwards to avoid a duplicate external request.

The V4 editor runtime replaces the old whole-document live path with a bounded caret-centered analysis window, adaptive slow mode, idle scheduling, cancellable AI requests, short-lived client caching, and deferred document-level processing. AI keys remain server-side; the browser calls only the same-origin XenForo endpoint with CSRF protection.

No manual SQL import is required. Install or upgrade the package through XenForo ACP → **Add-ons → Install/upgrade from archive**.
