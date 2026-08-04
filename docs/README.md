# Arnavutköy CBS — Dokümantasyon

Bu klasör, `ArnavutköyCBS` deposunun tam kaynak kodu okunarak hazırlanmış dört dokümanı içerir:

| Doküman | İçerik | Hedef okuyucu |
|---|---|---|
| [API_VE_MIMARI.md](./API_VE_MIMARI.md) | Teknoloji yığını, klasör yapısı, mimari şema, tüm modül sözleşmeleri (katman/araç/analiz), veritabanı şeması, RLS güvenlik modeli, veri alım hattı, harita etiket ifadeleri, EWKT geometri yazımı, genişletme rehberleri | Geliştirici / mimar |
| [KULLANIM_KILAVUZU.md](./KULLANIM_KILAVUZU.md) | Kurulum, ana ekran, katman/araç/analiz kullanımı, imar planı düzenleme, mahalle bilgisi girişi, rol farkları, mahalle rehberi ve karşılaştırma, sorun giderme | Son kullanıcı / personel |
| [KULLANIM_SENARYOSU.md](./KULLANIM_SENARYOSU.md) | 13 uçtan uca kullanım senaryosu (vatandaş, ziyaretçi, personel, planlamacı, saha ekibi, sistem yöneticisi) | Ürün sahibi / yeni katılan geliştirici |
| [STAJ_RAPORU.md](./STAJ_RAPORU.md) · [PDF](./STAJ_RAPORU.pdf) | Git geçmişine dayalı geliştirme günlüğü, karşılaşılan sorunlar/çözümler, kazanımlar, proje istatistikleri | Staj/eğitim raporu — kişisel/kurumsal alanlar `[...]` ile işaretlidir, doldurulmalıdır |

## Staj raporunun PDF çıktısı

`STAJ_RAPORU.md` teslim edilebilir bir PDF olarak da üretilir:

```bash
npm run docs:pdf     # → docs/STAJ_RAPORU.pdf
```

Üretici (`scripts/staj-raporu-pdf.ts`) markdown kaynağını okuyup jsPDF ile A4 sayfalara basar; Türkçe karakterler için uygulamanın Yazdır aracıyla ortak olan gömülü Noto Sans fontunu kullanır. Başlıklar, tablolar, listeler, kod blokları ve alıntılar biçimlendirilir; sayfa numaraları ve altbilgi otomatik eklenir.

Rapor metnini **`STAJ_RAPORU.md` üzerinden** düzenleyin — özellikle köşeli parantez `[...]` içindeki kişisel/kurumsal alanları doldurun — sonra komutu tekrar çalıştırın; PDF tamamen yeniden üretilir. PDF'i doğrudan düzenlemeyin, bir sonraki üretimde değişiklikleriniz kaybolur.

Ana proje kurulumu için depo kökündeki [README.md](../README.md)'ye bakınız.
