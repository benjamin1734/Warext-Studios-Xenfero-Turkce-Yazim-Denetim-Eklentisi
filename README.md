# Warext Studios | Türkçe Yazım Denetimi

XenForo 2.3+ için tamamen yerel çalışan Türkçe yazım, dilbilgisi, noktalama, bağlam, anlam ve paragraf bütünlüğü denetimi eklentisi.

## Güncel sürüm

Güncel kararlı sürüm: **V1.0.6**

Kurulum paketi:

`Warext-Turkce-Yazim-Denetimi-V1.0.6-XenForo.zip`

Paket GitHub **Releases** bölümünde yayımlanır. ZIP dosyasını çıkarmadan XenForo ACP → **Add-ons → Install/upgrade from archive** alanından yükleyebilirsiniz. V1.0.6 önceki sürümlerin üzerine doğrudan yükseltilebilir.

## Tamamen yerel ve bağımsız

Eklenti çalışma zamanında harici API, bulut LLM'i, uzak NLP servisi, CDN tabanlı analiz veya başka bir ağ servisi kullanmaz. Sözlük, morfoloji, yerel dil modeli, semantik bilgi tabanı, bağlamsal yazım ve paragraf anlam motoru ana kurulum paketinin içindedir.

Daha önce sunulan ağ üzerinden tam paketi indiren `COMPACT` kurulum yaklaşımı artık üretilmez. Güncel sürüm yalnızca **tamamen kendi kendine yeten tam paket** olarak yayımlanır.

## V3.1.3 performans mimarisi

V1.0.6 ile uzun metin analizi ana iş parçacığını gereksiz yere meşgul etmeyecek şekilde yeniden sınırlandırıldı. Kullanıcı yazarken tüm belgeyi tekrar tekrar ağır biçimde analiz etmek yerine yalnızca değişen bölgenin küçük bir penceresi incelenir. Yazma durduğunda sistem kısa ve sınırlı belge pencerelerini kademeli olarak tarar; ayrıca tüm metinden seçilen dağıtılmış cümlelerle küçük bir semantik omurga oluşturarak paragrafın genel anlam akışını korumaya çalışır.

Uzun metin segmentleri çalışma zamanında en fazla 1000 karakterlik parçalara sınırlandırılır. `navigator.scheduling.isInputPending()` destekleyen tarayıcılarda kullanıcı girişi bekliyorsa yeni ağır analiz başlatılmaz. Analiz pencereleri süre bütçesiyle sınırlandırılır; kullanıcı 2,4 saniye yazmayı bıraktığında daha derin ama yine kontrollü tarama yapılır. Böylece 10.000–50.000+ karakterlik mesajlarda her tuş vuruşunda tüm paragrafın senkron biçimde yeniden analiz edilmesi engellenir.

Bu performans koruması analiz kalitesini tamamen kapatmaz: canlı yazım sırasında hızlı yerel denetim devam eder, uzun metin tarayıcısı cümle/segment bazında çalışır, duraklama sonrasında belge düzeyi semantik denetim devreye girer.

## V3.1.2 bağlamsal yazım

Sözlükte veya morfolojik çözümlemede tek başına geçerli görünebilen fakat cümle içinde yanlış olan biçimler ayrıca değerlendirilir. Sistem kontrollü çoklu-harf adayları üretir ve bunları yerel sözlük, morfolojik kök, ek yapısı, tamlayan-tamlanan ilişkisi ve yerel n-gram dil modeliyle yeniden sıralar.

Örneğin `Dünyanın en iyi gonu bugün olabilir` cümlesindeki `gonu`, cümle yapısı ve iyelik ilişkisi birlikte değerlendirilerek `günü` önerisine dönüştürülebilir. Bu davranış tek bir kelimeye sabit eşleme değildir.

## Paragraf ve anlam denetimi

V3.1 önerme grafiği paragraf boyunca varlık, eylem, durum, miktar, zaman, zamir/gönderim ve neden-sonuç ilişkilerini izler. Gerçek durum değişiklikleri ile mantıksal çelişkiler ayrılır; koşullu, sorulu, aktarılmış ve varsayımsal ifadeler kesin olgu gibi değerlendirilmez. Konu sapması, kopuk neden-sonuç zinciri, durum/olay kutupluluk çatışması, nicelik tutarsızlığı ve gönderim belirsizliği belge bütünü içinde değerlendirilir.

## Opsiyonel entegrasyon köprüsü

V1.0.5'ten itibaren bağımsız içerik denetimi eklentileri için `window.WarextWritingIntegration` köprüsü bulunur. Köprü zorunlu bağımlılık oluşturmaz ve tam kullanıcı metnini entegrasyon özetinde saklamaz.

## Kurulum notu

XenForo arşiv kurucusu kapalıysa `src/config.php` içine aşağıdaki ayarı ekleyin:

```php
$config['enableAddOnArchiveInstaller'] = true;
```

Manuel SQL içe aktarma gerekmez. Eklenti tabloları kurulum/yükseltme sırasında otomatik yönetilir.

## Kalite doğrulaması

Release hattı JavaScript, PHP, shell, Python, XML ve JSON doğrulamalarına ek olarak sözlük, dilbilgisi, sözdizimi, uzun metin, semantik benchmark, bağlamsal yazım ve performans koruma regresyonlarını çalıştırır. Paket yalnızca bu kontroller başarılı olduğunda GitHub Release'a eklenir.

## Depo yapısı

- `upload/`: XenForo'ya kurulacak eklenti dosyaları
- `source/`: dil motoru üretim kaynakları
- `tests/`: regresyon, benchmark ve performans testleri
- `tools/`: tamamen yerel derleme ve doğrulama araçları

Lisans ve üçüncü taraf veri atıfları eklenti paketinin `Resources` dizininde tutulur.

---

# English

Warext Studios Turkish Writing Checker is a fully local XenForo 2.3+ add-on for Turkish spelling, grammar, punctuation, context, semantics, and paragraph-coherence analysis.

## Current version

Current stable release: **V1.0.6**

Installation package:

`Warext-Turkce-Yazim-Denetimi-V1.0.6-XenForo.zip`

The package is published under GitHub **Releases**. Upload the ZIP directly from XenForo ACP → **Add-ons → Install/upgrade from archive** without extracting it. V1.0.6 can be upgraded directly over previous versions.

## Fully local and standalone

At runtime, the add-on does not use external APIs, cloud LLMs, remote NLP services, CDN-based analysis, or any other network service. The dictionary, morphology engine, local language model, semantic knowledge base, contextual spelling system, and paragraph-meaning engine are included in the main installation package.

The former `COMPACT` installation method, which downloaded the complete package over the network, is no longer produced. Current releases are distributed only as **fully self-contained packages**.

## V3.1.3 performance architecture

V1.0.6 limits long-text analysis so it does not unnecessarily occupy the browser's main thread. While the user is typing, the add-on analyzes a small window around the changed region instead of repeatedly running heavy analysis over the entire document. After typing stops, short bounded document windows are scanned gradually, while distributed sentences selected from the full text are used to build a small semantic backbone that helps preserve the paragraph's overall meaning flow.

Long-text runtime segments are limited to at most 1,000 characters. In browsers that support `navigator.scheduling.isInputPending()`, a new heavy analysis pass is not started while user input is pending. Analysis windows use time budgets, and after the user stops typing for 2.4 seconds a deeper but still controlled scan is allowed. This prevents 10,000–50,000+ character messages from synchronously re-analyzing the entire paragraph on every keystroke.

These performance protections do not disable analysis quality: fast local checking continues during live typing, long-text scanning works at sentence/segment level, and document-level semantic checks are enabled after a pause.

## V3.1.2 contextual spelling

Forms that may look valid in isolation to the dictionary or morphological analyzer but are incorrect in sentence context are evaluated separately. The system generates controlled multi-character candidates and re-ranks them with the local dictionary, morphological root, suffix structure, possessive/genitive relationships, and the local n-gram language model.

For example, in `Dünyanın en iyi gonu bugün olabilir`, the form `gonu` may be corrected to `günü` by evaluating both sentence structure and possessive relationships. This is not a fixed one-word replacement rule.

## Paragraph and semantic checks

The V3.1 proposition graph tracks entities, actions, states, quantities, time, pronouns/references, and cause-effect relationships across the paragraph. Real state changes are separated from logical contradictions; conditional, interrogative, reported, and hypothetical statements are not treated as definite facts. Topic drift, broken cause-effect chains, state/event polarity conflicts, quantity inconsistencies, and reference ambiguity are evaluated across the document.

## Optional integration bridge

Since V1.0.5, independent content-review add-ons can use the `window.WarextWritingIntegration` bridge. The bridge does not create a hard dependency and does not store the user's complete text in the integration summary.

## Installation note

If XenForo's archive installer is disabled, add the following setting to `src/config.php`:

```php
$config['enableAddOnArchiveInstaller'] = true;
```

No manual SQL import is required. Add-on tables are managed automatically during installation and upgrades.

## Quality validation

The release pipeline validates JavaScript, PHP, shell, Python, XML, and JSON files and also runs dictionary, grammar, syntax, long-text, semantic benchmark, contextual-spelling, and performance-protection regression tests. A package is attached to the GitHub Release only when these checks pass.

## Repository structure

- `upload/`: add-on files installed into XenForo
- `source/`: language-engine build sources
- `tests/`: regression, benchmark, and performance tests
- `tools/`: fully local build and validation tools

License information and third-party data attributions are stored in the add-on package's `Resources` directory.
