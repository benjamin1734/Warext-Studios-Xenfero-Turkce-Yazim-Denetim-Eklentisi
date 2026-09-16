# Değişiklik Geçmişi

## V1.1.0

- Üç bağımsız çalışma modu eklendi: Yerel, AI ve AI + Yerel destekli
- Hybrid modda yerel motorun adayları metin bağlamıyla birlikte AI'ya gönderilir; AI yanlış pozitifleri eler ve nihai öneriyi üretir
- Hybrid adayları editör nesil kimliğiyle eşleştirildi; önceki metin durumundan kalan yerel adayların yeni AI isteğine taşınması engellendi
- Warext AI İçerik Denetimi V1.2.0+ ile zorunlu bağımlılık oluşturmayan ortak AI sağlayıcı sözleşmesi eklendi
- Ortak kullanımda seçili provider, model, API anahtarı, bütçe ve kullanım takibi AI İçerik Denetimi üzerinden paylaşılabilir
- Ortak provider çağrısı yalnız tam yazılmış mesaj kapsamı uygun olduğunda moderasyon + Türkçe yazım sonucunu birlikte döndürebilir; aktif pencere çağrıları gereksiz moderasyon tokenı tüketmez
- Standalone OpenAI Responses API, OpenRouter/OpenAI-compatible, özel OpenAI-compatible ve Ollama yolları eklendi
- OpenAI-compatible base URL doğrulaması sıkılaştırıldı; geçersiz protokol ve URL içine gömülü kimlik bilgileri reddedilir
- API anahtarları tarayıcıya gönderilmez; istemci yalnız same-origin XenForo endpoint'ine CSRF token ile erişir
- AI endpoint'i ACP çalışma modunu sunucu tarafında zorunlu doğrular; istemci AI kapalıyken doğrudan endpoint çağrısıyla provider tüketemez
- Canlı editör `editor-v400.js` ile yeniden yazıldı ve V4.1 performans katmanına yükseltildi
- Eski her-girdide geniş belge durumunu senkron çıkaran `editor-v110.js` runtime'dan kaldırıldı
- Her tuş için ayrı `keyup` analiz kuyruğu kaldırıldı
- Canlı yerel denetim imleç çevresindeki sınırlı cümle/paragraf penceresine bağlandı
- Çok uzun metin veya 24 ms üstü analiz algılandığında pencere ve debounce otomatik olarak daha korumacı moda geçer
- `requestIdleCallback()` ile düşük öncelikli yerel analiz boş zamana taşınır
- AI yalnız gerçek input/paste/cut değişikliğinden sonra çalışır; focus ve click tek başına yeni provider sorgusu üretmez
- AI istekleri arasında ikinci bir minimum süre koruması eklendi; varsayılan 2500 ms
- Canlı AI çalışma penceresi varsayılan 2200 karakterle sınırlandı; 10.000+ karakter metinde otomatik 1600 karaktere daralır
- AI istekleri `AbortController` ile iptal edilebilir hale getirildi; yeni metin değişikliği eski isteği sonlandırır
- Aynı AI çalışma penceresi için kısa süreli istemci önbelleği eklendi
- AI-only modda ağır yerel sözlük/entity/deyim/dil modeli/semantik paketleri hiç yüklenmez
- Uzun metin motoru V2.1'e geçirildi; kullanıcı yazarken tam belge taraması yapılmaz, 1500 ms sakinleşme sonrasında idle dilimlerinde ilerler
- Uzun metin taramasında tek idle dilimi en fazla 2 segment ve yaklaşık 6 ms ana-thread bütçesi kullanır
- Froala gizli textarea ile görünen contenteditable yüzeyinin iki ayrı editör gibi bağlanması uzun metin ve belge katmanlarında engellendi
- Belge düzeyi semantik katman 5000+ karakter metinde canlı tam-belge analizini atlar ve yalnız yazım durduktan sonra derin tarama yapar
- Belge katmanı editör açılışından sonra gecikmeli ve idle yüklenir
- Standalone yazım AI cevabından gereksiz tam `corrected_text` üretimi kaldırıldı; yalnız hata/düzeltme aralıkları döndürülür
- ACP'ye AI kaynağı, provider/model/base URL, timeout, AI karakter sınırları, AI ve yerel debounce, canlı analiz pencere boyutu, AI çalışma penceresi ve minimum AI istek aralığı ayarları eklendi
- V4.1 editör + V2.1 uzun metin + V3.1.3 belge performans regresyon sözleşmesi ve release audit kuralları güncellendi

## V1.0.6

- V3.1.3 uyarlanabilir performans koruma katmanı eklendi
- Uzun metinlerde her tuş vuruşunda tüm belgenin ağır senkron analiz edilmesi engellendi
- Kullanıcı yazarken yalnızca değişen bölgenin sınırlı analiz penceresi işlenir
- Yazma 2,4 saniye durduğunda daha derin fakat yine süre ve pencere bütçeli belge analizi yapılır
- Uzun metin segmentleri çalışma zamanında en fazla 1000 karaktere sınırlandırıldı
- Desteklenen tarayıcılarda `navigator.scheduling.isInputPending()` ile kullanıcı girişi beklerken ağır analiz ertelenir
- Çok uzun metinlerde dağıtılmış cümlelerden sınırlı semantik omurga oluşturularak genel paragraf anlamı korunur
- Ana iş parçacığında aynı anda işlenecek belge penceresi ve analiz süresi bütçelendi
- Ağ üzerinden tam paketi indiren COMPACT kurulum yaklaşımı kaldırıldı; güncel sürüm yalnızca kendi kendine yeten tam paket olarak yayımlanır
- Yeni performans telemetrisi ve regresyon sözleşmesi eklendi
- README, Release açıklama üretimi, hata bildirim şablonu ve sürüm metinleri güncel sürümle eşitlendi
- Harici çalışma zamanı NLP/API/model bağımlılığı yok

## V1.0.5

- Warext AI İçerik Denetim Sistemi ve benzeri eklentiler için opsiyonel entegrasyon köprüsü eklendi
- Entegrasyon zorunlu bağımlılık oluşturmaz; Yazım Denetimi tek başına aynı şekilde çalışmaya devam eder
- Kabul edilen yazım önerilerinin sayısı, eklenen/silinen/değişen karakter miktarı ve işlem zamanları oturum bazlı özetlenir
- Entegrasyon verisi `window.WarextWritingIntegration` üzerinden okunabilir
- Tam kullanıcı metni entegrasyon özetinde saklanmaz
- Yeni köprü yalnızca editör bulunduğunda yüklenir ve mevcut V3.1.2 analiz motoruna müdahale etmez

## V1.0.4

- V3.1.2 bağlama duyarlı çoklu-harf yazım onarımı
- Tamlayan-tamlanan ve iyelik yapısına göre morfolojik aday doğrulaması
- Yerel n-gram dil modeliyle bağlamsal aday yeniden sıralaması
- Sözlükte tek başına geçerli görünüp cümle içinde yanlış olan biçimler için ikinci doğrulama katmanı
- `Dünyanın en iyi gonu bugün olabilir` gerçek ortam regresyonu ve `günü` önerisi
- Doğru `günü`, `gol`, `göl`, `kul`, `kül` ve benzeri biçimler için yanlış pozitif koruması
- V3.1.1 paragraf önerme grafiği ve tüm önceki yerel analiz katmanları korunur
- Harici çalışma zamanı NLP/API/model bağımlılığı yok

## V1

- Yerel Türkçe yazım, dilbilgisi, morfoloji, noktalama, bağlam ve anlam denetimi
- Yerel sözlük, yer adı, deyim, n-gram ve semantik bilgi katmanları
- Fiil istemi, özne-nesne anlam uyumu ve hafif dependency çözümleme
- Zamir/gönderim, zaman, koşul, karşıtlık, neden-sonuç ve olumsuzluk analizi
- Uzun metin taraması, teknik içerik koruması ve özel sözlükler
- Same-origin kullanıcı geri bildirimi ve ACP öğrenme yönetimi
- Harici çalışma zamanı NLP/API/model bağımlılığı yok
