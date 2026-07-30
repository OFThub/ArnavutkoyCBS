# STAJ RAPORU

> **Not**: Bu rapor, `ArnavutköyCBS` deposunun tam kaynak kodu ve `git` geçmişi taranarak otomatik oluşturulmuştur. Köşeli parantez `[...]` içindeki alanlar kişisel/kurumsal bilgilerdir ve raporu teslim etmeden önce elle doldurulmalıdır — bu bilgiler kod tabanından türetilemez. Teknik içerik (kullanılan teknolojiler, yapılan işler, istatistikler) depodaki gerçek commit geçmişi ve kaynak koddan derlenmiştir.

---

## Kapak Bilgileri

| Alan | Değer |
|---|---|
| Staj yeri | [KURUM/ŞİRKET ADI — örn. Arnavutköy Belediyesi Bilgi İşlem Müdürlüğü] |
| Öğrencinin adı soyadı | Ömer Faruk Türkdoğdu |
| Öğrenci numarası | [ÖĞRENCİ NUMARASI] |
| Üniversite / Fakülte | [ÜNİVERSİTE ADI / FAKÜLTE ADI] |
| Bölüm | [BÖLÜM ADI — örn. Bilgisayar Mühendisliği] |
| Staj türü | [Yazılım Geliştirme Stajı / Zorunlu Staj I-II vb.] |
| Staj tarih aralığı | [BAŞLANGIÇ TARİHİ] – [BİTİŞ TARİHİ] |
| İşyeri staj sorumlusu | [İŞYERİ SORUMLUSU ADI SOYADI, unvanı] |
| Üniversite danışmanı | [DANIŞMAN ÖĞRETİM ÜYESİ ADI SOYADI] |
| Rapor teslim tarihi | 2026-07-30 |

---

## İçindekiler

1. [Giriş](#1-giriş)
2. [Proje Tanıtımı](#2-proje-tanıtımı)
3. [Kullanılan Teknolojiler ve Araçlar](#3-kullanılan-teknolojiler-ve-araçlar)
4. [Sistem Mimarisine Genel Bakış](#4-sistem-mimarisine-genel-bakış)
5. [Yapılan Çalışmalar — Geliştirme Günlüğü](#5-yapılan-çalışmalar--geliştirme-günlüğü)
6. [Karşılaşılan Sorunlar ve Çözüm Yöntemleri](#6-karşılaşılan-sorunlar-ve-çözüm-yöntemleri)
7. [Kazanılan Bilgi ve Beceriler](#7-kazanılan-bilgi-ve-beceriler)
8. [Proje İstatistikleri](#8-proje-istatistikleri)
9. [Sonuç ve Değerlendirme](#9-sonuç-ve-değerlendirme)
10. [Kaynakça](#10-kaynakça)
11. [Ekler](#11-ekler)

---

## 1. Giriş

Bu rapor, staj sürecinde geliştirilen **Arnavutköy CBS** (Coğrafi Bilgi Sistemi) projesindeki çalışmaları özetlemektedir. Proje, bir belediyenin ihtiyaç duyduğu türden gerçek bir kurumsal yazılımı — harita tabanlı karar destek sistemi — sıfırdan tasarlayıp uygulamaya koyma sürecini kapsamaktadır: veritabanı şeması ve güvenlik tasarımından, coğrafi veri işleme algoritmalarına, kullanıcı arayüzüne ve dağıtıma kadar uçtan uca bir yazılım geliştirme yaşam döngüsü deneyimlenmiştir.

Staj kapsamında; talep analizi (bir belediyenin hangi coğrafi verilere, hangi rollerle erişmesi gerektiği), veritabanı tasarımı (PostgreSQL/PostGIS şeması ve Row Level Security), veri mühendisliği (resmî açık veri kaynaklarından otomatik veri alım hattı), algoritma geliştirme (mekânsal analizler, koroplet sınıflandırma, sensör füzyonu), ön yüz geliştirme (React/TypeScript ile harita tabanlı arayüz) ve test/CI disiplini konularında uygulamalı çalışma yürütülmüştür.

## 2. Proje Tanıtımı

**Arnavutköy CBS**, İstanbul Arnavutköy ilçesi için geliştirilen, tarayıcı üzerinden çalışan bir Coğrafi Bilgi Sistemi web uygulamasıdır. Uygulama iki temel bileşenden oluşur:

- **CBS Tezgâhı** (`/`): Tam ekran, katman/araç/analiz tabanlı bir harita çalışma alanı. Rol tabanlı erişim ile ziyaretçiler yalnızca kamuya açık verileri (yol, bina, sağlık kurumu, topografya, afet toplanma alanları vb.), belediye personeli ise ek olarak mülkiyet/imar/kadastro gibi hassas verileri görebilir.
- **Mahalle Rehberi** (`/rehber`): Vatandaşa açık, giriş gerektirmeyen bir sayfa — bir mahalleye taşınmadan önce bakılabilecek deprem riski, hizmetlere erişim ve altyapı göstergelerini 0–100 puanlı bir "karne" olarak sunar.

Projenin veri kaynağı, tamamen **resmî açık veri**dir: İstanbul Büyükşehir Belediyesi (İBB) Açık Veri Portalı (deprem senaryosu, sağlık kurumları, acil ulaşım yolları, otobüs durakları), AFAD (toplanma alanları), OpenStreetMap (bina/yol/POI/kent hizmetleri anlık görüntüsü), Nominatim (idari sınırlar) ve AWS Terrarium yükselti döşemeleri (dijital yükselti modeli). Bu veriler, depoda bulunan `scripts/ingest/` altındaki 9 adımlı bir betik zinciriyle indirilip normalize edilmekte ve hem statik dosyalar hem de PostgreSQL/PostGIS veritabanı üzerinden uygulamaya sunulmaktadır.

Detaylı teknik mimari için bkz. [API_VE_MIMARI.md](./API_VE_MIMARI.md); son kullanıcı özellikleri için bkz. [KULLANIM_KILAVUZU.md](./KULLANIM_KILAVUZU.md) ve [KULLANIM_SENARYOSU.md](./KULLANIM_SENARYOSU.md).

## 3. Kullanılan Teknolojiler ve Araçlar

| Kategori | Teknoloji |
|---|---|
| Programlama dili | TypeScript (strict mod) |
| Ön yüz çatısı | React 19 (fonksiyonel bileşenler, hook'lar) |
| Derleme/geliştirme sunucusu | Vite 8 (Rolldown/Rust tabanlı) |
| Durum yönetimi | Zustand |
| UI bileşen kütüphanesi | Mantine (core, hooks, notifications, charts) |
| Harita motoru | MapLibre GL JS (vektör, raster, raster-dem, hillshade) |
| Coğrafi hesaplama kütüphanesi | Turf.js |
| Kontur/izohips çıkarımı | d3-contour |
| Veritabanı / Arka uç | Supabase (PostgreSQL 17 + PostGIS), Row Level Security, PostgREST |
| Kimlik doğrulama | Supabase Auth (JWT tabanlı, `app_metadata.rol` ile rol yönetimi) |
| Yerel/çevrimdışı depolama | IndexedDB (`idb-keyval`) |
| PDF üretimi | jsPDF (Türkçe karakter desteği için gömülü font) |
| Excel/tablo dışa aktarımı | SheetJS (xlsx) |
| PWA / Service Worker | vite-plugin-pwa + Workbox |
| Test çatısı | Vitest |
| Şema doğrulama | Zod |
| Sürekli entegrasyon | GitHub Actions (tip kontrolü → test → derleme) |
| Sürüm kontrolü | Git / GitHub |
| Veri kaynakları (API) | İBB Açık Veri (CKAN), AFAD, OpenStreetMap Overpass API, Nominatim, AWS Terrarium DEM |

## 4. Sistem Mimarisine Genel Bakış

Sistem üç katmanlı bir mimariyle tasarlanmıştır:

1. **Sunum katmanı**: React bileşenleri (paneller, araç/analiz panoları), tek bir global Zustand deposuna (`appStore`) abone olur.
2. **Kayıt (registry) katmanı**: Harita katmanları, interaktif araçlar ve mekânsal analizler, birer "modül sözleşmesi" (`LayerModule`, `ToolModule`, `AnalysisModule`) üzerinden merkezi kayıt defterlerine (registry) kaydedilir. Bu tasarım sayesinde yeni bir katman/araç/analiz eklemek, yalnızca ilgili diziye bir nesne eklemekle mümkün olur — kullanıcı arayüzü kodu jenerik kalır ve değişmez.
3. **Veri katmanı**: Statik dosyalar (`public/data/*.geojson`, build-time veri alım hattının çıktısı), canlı Supabase/PostgreSQL sorguları (RLS ile korunan), ve tarayıcıda hesaplanan türetilmiş veriler (dijital yükselti modelinden eğim/bakı/TPI hesaplama gibi).

Güvenlik, hem istemci tarafında (rol bazlı arayüz filtrelemesi) hem de — asıl yetkilendirme sınırı olarak — veritabanı seviyesinde (PostgreSQL Row Level Security politikaları + tüm tablolara bağlı otomatik denetim/audit tetikleyicisi) iki kademeli olarak uygulanmıştır. Bu, "istemciye asla güvenme, sunucu tarafında zorla" ilkesinin somut bir uygulamasıdır.

Ayrıntılı mimari şeması, arayüz sözleşmeleri, veritabanı şeması ve genişletme rehberleri için bkz. [API_VE_MIMARI.md](./API_VE_MIMARI.md).

## 5. Yapılan Çalışmalar — Geliştirme Günlüğü

Geliştirme süreci, depodaki commit geçmişine göre 16 aşamalı (Faz 0 – Faz 7.5) bir ilerlemeyle yürütülmüştür. Aşağıdaki tablo, her aşamada hangi alt sistemlerin inşa edildiğini, gerçek commit tarihleri ve değişen dosya istatistikleriyle birlikte özetler:

| Aşama | Tarih | Değişen dosya | Kapsam |
|---|---|---|---|
| İlk kurulum | 2026-07-24 | 1 dosya | Depo/README oluşturuldu |
| **Faz 0** | 2026-07-24 | 56 dosya (+10.055 satır) | Proje iskeleti: Supabase projesi, PostGIS şeması, RLS politikaları, denetim (audit) tetikleyicisi, 9 adımlı veri alım hattı, GitHub Actions CI |
| **Faz 0.5** | 2026-07-24 | 15 dosya (+751) | Harita çekirdeğinin başlangıcı: `MapProvider`, Zustand `appStore`, ilçe konfigürasyonu (`config/district.ts`) |
| **Faz 1** | 2026-07-24 | 34 dosya (+2.220 / −95) | İlk araçlar (12 dosya — ölçüm, tampon, bilgi, koordinat vb.), ilk paneller (Rail, ToolDock, LayerPanel), ilk katmanlar |
| **Faz 1.5** | 2026-07-24 | 37 dosya (+2.399 / −139) | Arazi/topografya katmanları: dijital yükselti modeli indirme (Web Worker), hillshade, eğim, bakı, hipsometrik katmanlar |
| **Faz 2** | 2026-07-24 | 2 dosya | Küçük düzeltme |
| **Faz 2.5** | 2026-07-24 | 14 dosya (+837) | OpenStreetMap anlık görüntüsü tabanlı katmanlar: binalar, yollar, POI, su, kent hizmetleri |
| **Faz 3** | 2026-07-24 | 16 dosya (+588 / −7) | Supabase tabanlı "kurumsal" katmanlar (imar, adres, zemin, vb.) ve ilgili veri alım betikleri |
| **Faz 3.5** | 2026-07-24 | 4 dosya (+29 / −5) | Küçük düzeltme |
| **Faz 4** | 2026-07-25 | 25 dosya (+1.998 / −11) | Mekânsal analiz modülü: 7 analiz (uygunluk/MCDA, taşkın riski, tahliye planı, imar uyumsuzluğu, erişilebilirlik, kazı çakışması, beyan dışı alan) ve saf algoritma çekirdekleri |
| **Faz 5** | 2026-07-25 | 12 dosya (+927 / −5) | Tematik (koroplet) harita, sınıflandırma algoritmaları (Jenks/kantil/eşit aralık), toplu Excel/PDF raporlama |
| **Faz 5.5** | 2026-07-27 | 1 dosya | Tema/görsel cila, PWA doğrulaması |
| **Faz 6** | 2026-07-28 | 25 dosya (+9.868 / −3.151) | Performans ölçüm modülü (`bench/`): cihaz profili, CPU/bellek iş yükleri, paralel ölçekleme testi, GPU kare süresi; sensör füzyonu modülü (`sensors/`): GNSS/pusula/ivmeölçer okuma ve tamamlayıcı filtre |
| **Faz 6.5** | 2026-07-29 | 7 dosya (+187 / −82) | Performans ölçüm modülünde iyileştirme ve hata düzeltmeleri |
| **Faz 7** | 2026-07-29 | 61 dosya (+3.706 / −201) | Mahalle Rehberi (`/rehber`) sayfası: puanlama algoritması, PDF karne dışa aktarımı; yazı tiplerinin yerelleştirilmesi (çevrimdışı çalışma için); ek veri alım betikleri (toplanma alanı, otobüs durağı) |
| **Faz 7.5** | 2026-07-30 | 10 dosya (+283 / −34) | Geliştirici modu (`devMode`) anahtarının bağlanması, Panorama aracındaki tıklama olayı düzeltmesi, katman renk çakışmalarının giderilmesi |

**Genel akış**: Önce veri altyapısı ve güvenlik temeli (Faz 0), ardından harita çekirdeği ve ilk etkileşimli araçlar (Faz 0.5–1.5), sonra üç ana veri kaynağı tipi için katman sistemi (statik/OSM/Supabase — Faz 2–3), mekânsal analiz motoru (Faz 4), görselleştirme/raporlama (Faz 5), performans ve saha-veri toplama yetenekleri (Faz 6), vatandaşa yönelik kamu sayfası (Faz 7) ve son cila/hata düzeltmeleri (Faz 7.5) şeklinde artımlı (incremental) bir geliştirme stratejisi izlenmiştir. Her aşama, bir önceki aşamanın üzerine inşa edilmiş ve test paketi (bkz. [§8](#8-proje-istatistikleri)) sürekli büyütülmüştür.

> **Not**: Yukarıdaki tarihler depo commit geçmişinden alınmıştır ve yoğun bir geliştirme temposunu yansıtır. Resmî staj süresi (iş günü sayısı, haftalık çalışma programı) kurumunuzun staj defterinde ayrıca belirtilmelidir; bu tablo günlük/haftalık staj defteri girdilerinin teknik dayanağı olarak kullanılabilir.

## 6. Karşılaşılan Sorunlar ve Çözüm Yöntemleri

| Sorun | Çözüm |
|---|---|
| jsPDF'in yerleşik fontları Türkçe karakterleri (İ, ı, ş, ğ, ç, ö, ü) doğru basmıyordu. | SIL OFL lisanslı Noto Sans TR fontu base64 olarak gömülüp (`tools/printFont.ts`) jsPDF'e `addFileToVFS`/`addFont` ile kayıt edildi; hem harita çıktısı (Yazdır aracı) hem de mahalle karnesi PDF'i bu ortak altyapıyı kullanacak şekilde birleştirildi. |
| PostGIS bazen geometriyi GeoJSON yerine hex-WKB metni olarak döndürebiliyor (yaygın bir yanlış yapılandırma), bu da sessizce hatalı/boş katman render'ına yol açabilirdi. | `supabaseLayer.ts` içinde bir `toGeometry()` koruması yazıldı: geçersiz satırlar sessizce çizilmek yerine sayılıp atlanıyor; davranış birim testleriyle (`supabaseLayer.test.ts`) sabitlendi. |
| Arnavutköy mahalleleri için resmî, hazır bir sınır (poligon) veri kaynağı bulunamadı. | Her mahallenin merkez noktası Nominatim ile geokodlanıp Turf.js Voronoi algoritmasıyla yaklaşık poligonlar üretildi; veri setinde `yaklasik: true` bayrağıyla bu durumun şeffaf biçimde işaretlenmesi sağlandı (kullanıcıya "resmi sınır değildir" uyarısı olarak yansıtıldı). |
| Tarayıcıdan doğrudan çağrılan bazı dış API'ler (Overpass, AFAD) CORS kısıtlaması nedeniyle geliştirme ortamında erişilemiyordu. | `vite.config.ts` içinde yalnızca geliştirme sunucusu için `/proxy/afad` ve `/proxy/overpass` yönlendirmeleri tanımlandı; üretim ortamı için ayrı bir sunucu tarafı çözüm gerektiği dokümante edildi. |
| Masaüstü bilgisayarlarda gerçek GNSS/pusula/ivmeölçer donanımı bulunmadığından "Saha modu" test edilemiyordu. | Sahte ama gerçekçi bir GPS izi ve sensör verisi üreten bir "tekrar oynatma" (`syntheticTrace`) modu eklendi; kullanıcıya bunun simülasyon olduğu açıkça belirtildi. |
| Büyük dijital yükselti modeli (DEM) döşemelerinin her ziyarette yeniden indirilmesi, arazi araçlarının açılışını yavaşlatıyordu. | IndexedDB tabanlı, sürüm anahtarlı bir önbellekleme katmanı (`core/storage.ts`) eklendi; DEM verisi bir kez indirildikten sonra sınırsız süreyle yerelde saklanıyor. |
| Rol kontrolü yapan `security definer` SQL fonksiyonları, "search path ele geçirme" (search-path hijacking) saldırılarına karşı teorik olarak savunmasızdı. | Ayrı bir "güvenlik sertleştirme" migrasyonuyla (`20260724110000_guvenlik_sertlestirme.sql`) tüm ilgili fonksiyonlarda `search_path` açıkça sabitlendi; denetim tetikleyicisinin doğrudan RPC ile çağrılabilmesi de ayrıca engellendi. |
| Supabase arka ucu yapılandırılmadan (`.env` boşken) uygulamanın çökmesi ya da anlaşılmaz hatalar vermesi riski vardı. | Tüm Supabase-bağımlı katman/araç/analizlerde "yapılandırılmamış" durumu için özel, kullanıcı dostu bilgilendirme mesajları ve zarif geri düşüş (graceful degradation) davranışı standart hale getirildi — uygulama her koşulda "salt-kamu" modda çalışabiliyor. |
| Panorama aracında harita üzerindeki kapsama çizgisine tıklama olayının bazı durumlarda yakalanamaması. | Olay işleyicisi (event handler) haritanın gerçek yaşam döngüsüne (hazır olma durumu) göre yeniden bağlanacak şekilde düzeltildi; tarayıcıda uçtan uca test edilerek doğrulandı. |

## 7. Kazanılan Bilgi ve Beceriler

- **Coğrafi veri sistemleri**: MapLibre GL JS ile vektör/raster/hillshade katman yönetimi; GeoJSON, PostGIS geometri tipleri, koordinat sistemleri ve mekânsal indeksleme (GIST).
- **Mekânsal analiz algoritmaları**: Çok kriterli karar analizi (MCDA/ağırlıklı normalize skorlama), Horn eğim/bakı algoritması, topografik konum endeksi (TPI), marching-squares kontur çıkarımı, Jenks doğal kırılım noktaları sınıflandırması, hex-grid tabanlı mekânsal örnekleme.
- **Veritabanı ve güvenlik**: PostgreSQL/PostGIS şema tasarımı, Row Level Security (RLS) ile rol tabanlı veri erişimi, `security definer` fonksiyonların güvenli yazımı, otomatik denetim (audit) izi tasarımı.
- **Ön yüz mimarisi**: React 19 hook'ları, TypeScript strict mod (özellikle `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes` gibi katı ayarlarla "savunmacı" kod yazımı), Zustand ile merkezi durum yönetimi, kayıt (registry) tabanlı eklenti mimarisi tasarımı.
- **Performans mühendisliği**: Web Worker'lar ile paralel hesaplama, Amdahl yasası ile ölçeklenebilirlik analizi, tarayıcı GPU/CPU profil ölçümü.
- **Sensör programlama**: Tamamlayıcı filtre (complementary filter) ile pusula/jiroskop füzyonu, GNSS doğruluk eşiklemesi, sabit-demir (hard-iron) manyetometre kalibrasyonu.
- **PWA ve çevrimdışı mimari**: Service worker yaşam döngüsü, Workbox önbellekleme stratejileri (Stale-While-Revalidate, Cache-First), kullanıcı onaylı güncelleme akışı tasarımı.
- **Yazılım kalitesi disiplini**: Test güdümlü/test destekli geliştirme (Vitest, saf fonksiyonların birim testleriyle sabitlenmesi), sürekli entegrasyon (CI) hattı kurulumu (tip kontrolü → test → derleme).
- **Açık veri entegrasyonu**: Resmî kurumsal açık veri portallarıyla (İBB CKAN, AFAD), OpenStreetMap Overpass API'siyle ve coğrafi kodlama servisleriyle (Nominatim) programatik çalışma; format tutarsızlıklarına (Windows-1254 kodlaması, değişken sütun adları) karşı dayanıklı ayrıştırma yazımı.

## 8. Proje İstatistikleri

| Ölçüt | Değer |
|---|---|
| Kaynak kod dosyası (`.ts`/`.tsx`, `src/`) | 150 dosya |
| Toplam kod satırı (`src/`) | ~14.767 satır |
| Birim test dosyası | 14 dosya |
| Toplam test senaryosu | 184 (tümü geçiyor) |
| Veritabanı migrasyon dosyası | 6 dosya (~548 satır SQL) |
| Veritabanı tablosu | 18 iş tablosu + 1 denetim (audit) tablosu |
| Harita katmanı | 33 |
| İnteraktif araç | 15 |
| Mekânsal analiz | 7 |
| Veri alım hattı adımı | 9 (3 zorunlu, 6 isteğe bağlı) |
| Git commit sayısı (geliştirme aşamaları) | 16 |
| Kapsanan mahalle sayısı | 38 |

## 9. Sonuç ve Değerlendirme

Bu staj sürecinde, gerçek bir kamu kurumunun ihtiyacına yönelik, uçtan uca bir CBS web uygulaması geliştirilmiştir. Proje; veri toplama ve normalizasyonundan, güvenli veritabanı tasarımına, karmaşık mekânsal algoritmaların uygulanmasından, erişilebilir ve rol duyarlı bir kullanıcı arayüzüne kadar modern bir yazılım projesinin neredeyse tüm katmanlarını kapsamıştır. Özellikle rol tabanlı erişim kontrolünün hem istemci hem veritabanı seviyesinde iki kademeli uygulanması, resmî açık veri kaynaklarıyla çalışırken veri kalitesi/format tutarsızlıklarına karşı dayanıklı kod yazma pratiği ve sürekli büyüyen bir test paketiyle (184 test) değişikliklerin güvenle yapılabilmesi, staj boyunca edinilen en değerli mühendislik alışkanlıkları olmuştur.

Geliştirilen sistem, hâlihazırda üretime hazır durumda olup (CI hattı, tip güvenliği, test kapsamı ve PWA çevrimdışı desteğiyle) gerçek belediye verisiyle çalıştırılabilir niteliktedir. İleriye dönük olarak önerilen geliştirmeler arasında üretim ortamı için kalıcı bir CORS proxy çözümü, ek analiz türlerinin eklenmesi ve mobil saha kullanımının genişletilmesi yer almaktadır (bkz. [API_VE_MIMARI.md §24](./API_VE_MIMARI.md#24-bilinen-sınırlamalar-ve-teknik-notlar)).

[Bu bölüme, stajyerin kişisel gözlem ve değerlendirmelerini — staj yerinin çalışma ortamı, ekip içi iletişim, kurumun stajyere sağladığı imkanlar gibi idari/deneyimsel notları — eklemesi önerilir.]

## 10. Kaynakça

- İstanbul Büyükşehir Belediyesi (İBB) Açık Veri Portalı — deprem senaryosu, sağlık kurumları, acil ulaşım yolları, otobüs durakları veri setleri.
- AFAD (Afet ve Acil Durum Yönetimi Başkanlığı) — acil toplanma alanları veri seti.
- OpenStreetMap katkıcıları — bina, yol, POI, kent hizmetleri anlık görüntüsü (Overpass API).
- OpenFreeMap — vektör harita döşemeleri (basemap).
- Nominatim (OpenStreetMap) — idari sınır ve coğrafi kodlama servisi.
- AWS Terrarium açık yükselti döşemeleri (`elevation-tiles-prod`) — dijital yükselti modeli.
- Open-Meteo / OpenTopoData — referans yükselti API'leri (çapraz doğrulama).
- Mapillary — sokak görünümü (panorama) kapsama servisi.
- Supabase resmî dokümantasyonu — PostgreSQL, PostGIS, Row Level Security, Auth.
- MapLibre GL JS resmî dokümantasyonu.
- Turf.js resmî dokümantasyonu — mekânsal analiz fonksiyonları.
- [Varsa kurumun/danışmanın önerdiği ek kaynaklar, akademik referanslar]

## 11. Ekler

- **Ek A**: [API_VE_MIMARI.md](./API_VE_MIMARI.md) — tam teknik mimari, veritabanı şeması, tüm katman/araç/analiz envanteri.
- **Ek B**: [KULLANIM_KILAVUZU.md](./KULLANIM_KILAVUZU.md) — son kullanıcı kılavuzu.
- **Ek C**: [KULLANIM_SENARYOSU.md](./KULLANIM_SENARYOSU.md) — 10 uçtan uca kullanım senaryosu.
- **Ek D**: [Staj defteri / imzalı devam çizelgesi — kurum tarafından sağlanan fiziksel/dijital belge]
- **Ek E**: [Varsa ekran görüntüleri, benchmark çıktısı (`Başarım testi` aracından alınan Excel/JSON dışa aktarım), örnek PDF çıktıları]
