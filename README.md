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
