# Warext Studios | Türkçe Yazım Denetimi

XenForo 2.3+ için tamamen yerel çalışan Türkçe yazım, dilbilgisi, noktalama, anlam ve paragraf bütünlüğü denetimi eklentisi.

## İndirme ve doğrudan kurulum

Güncel kararlı sürüm GitHub **Releases** bölümünde `V1.0.4` olarak yayımlanır.

Önerilen tam kurulum paketi:

`Warext-Turkce-Yazim-Denetimi-V1.0.4-XenForo.zip`

Daha küçük alternatif paket:

`Warext-Turkce-Yazim-Denetimi-V1.0.4-XenForo-COMPACT.zip`

ZIP dosyasını çıkarmadan XenForo yönetim panelindeki **Add-ons → Install/upgrade from archive** alanına yükleyin. V1.0.4 önceki sürümlerin üzerine doğrudan yükseltilebilir. Statik çalışma zamanı dosyalarında sürüm anahtarlı önbellek kırma kullanılır.

Yeni sürümlerde paketleme işlemi tamamlandığında tam ve compact kurulum arşivleri aynı GitHub Release sürümüne otomatik eklenir; sürüm numarası `addon.json` içinden alınır.

## Yerel V3.1.2 dil ve anlam motoru

V1.0.4 ile sözlükte veya morfolojik çözümlemede tek başına geçerli görünebilen fakat cümle içinde yanlış olan biçimler için bağlama duyarlı yazım katmanı eklendi. Sistem yalnızca bir harflik Türkçe karakter dönüşümlerine bağlı kalmaz; sınırlı ve güvenli çoklu ünlü adayları üretir, adayları yerel sözlük, morfolojik kök, ek yapısı ve yerel dil modeliyle yeniden sıralar.

Tamlayan-tamlanan yapıları ayrıca değerlendirilir. Örneğin `Dünyanın en iyi gonu bugün olabilir` cümlesindeki `gonu`, tek başına sözlük/morfoloji katmanlarından kaçabilse bile `Dünyanın ...` tamlayanı ve beklenen iyelikli isim yapısı birlikte değerlendirilerek `günü` önerisine dönüştürülebilir. Aynı mekanizma belirli bir kelimeye sabitlenmiş değildir; benzer çoklu-harf ve ünlü uyumu kaçaklarını bağlama göre araştırır.

V3.1.1 önerme grafiği de korunur. Paragraf; varlık, eylem, durum, miktar, zaman ve gönderim ilişkilerinden oluşan yerel bir önerme grafiğine dönüştürülür. Gerçek durum değişiklikleri ile çelişkiler ayrılır; koşullu, sorulu, aktarılmış ve varsayımsal cümleler kesin olgu gibi değerlendirilmez. Zamirlerin olası referansları izlenir, eylem-özne/nesne semantik rolleri denetlenir ve yerel neden-sonuç bilgi tabanı ile çıkarımlar sınanır.

Belge düzeyinde konu sapması, kopuk neden-sonuç zinciri, durum ve olay kutupluluk çatışması, nicelik tutarsızlığı, gönderim belirsizliği ve doğal Türkçe akışından belirgin sapmalar birlikte değerlendirilir.

Tüm sözlük, morfoloji, yerel dil modeli, semantik bilgi tabanı ve anlam çıkarım bileşenleri eklenti paketinin içindedir. Çalışma zamanında harici API, bulut modeli, uzak yapay zekâ servisi, CDN tabanlı NLP veya başka bir ağ servisi kullanılmaz.

XenForo arşiv kurucusu kapalıysa `src/config.php` içine aşağıdaki ayarın eklenmesi gerekir:

```php
$config['enableAddOnArchiveInstaller'] = true;
```

Manuel SQL içe aktarma gerekmez. Eklentiye ait tablolar kurulum sırasında otomatik oluşturulur.

## Kalite doğrulaması

Paketleme hattı JavaScript, PHP, shell, Python, XML ve JSON doğrulamalarına ek olarak sözlük, dilbilgisi, sözdizimi, uzun metin, V3.1.1 semantik benchmark ve V3.1.2 bağlamsal yazım regresyonlarını çalıştırır. Paket yalnızca bu kontroller ve dosya bütünlüğü denetimi başarılı olduğunda oluşturulur.

## Depo yapısı

- `upload/`: XenForo'ya kurulacak eklenti dosyaları
- `source/`: dil motoru üretim kaynakları
- `tests/`: regresyon, benchmark ve kalite testleri
- `tools/`: tamamen yerel derleme ve doğrulama araçları

Lisans ve üçüncü taraf veri atıfları eklenti paketinin `Resources` dizininde tutulur.
