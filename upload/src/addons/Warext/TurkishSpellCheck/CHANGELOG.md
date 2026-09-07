# Değişiklik Geçmişi

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