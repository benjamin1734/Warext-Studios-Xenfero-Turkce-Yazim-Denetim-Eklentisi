# Değişiklik Geçmişi

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
