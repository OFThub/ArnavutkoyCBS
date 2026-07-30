# Arnavutköy CBS

Arnavutköy Belediyesi için geliştirilen, tarayıcı üzerinde çalışan bir **Coğrafi Bilgi Sistemi (CBS)** tek-sayfa uygulaması (SPA). Belediyenin sahip olduğu mekânsal veriyi (imar, kadastro, altyapı, deprem senaryosu, kent hizmetleri, topografya) tek bir harita üzerinde birleştirir; rol tabanlı erişimle hem vatandaşa hem belediye personeline hizmet verir.

İki sayfa sunar:

- **`/` — CBS tezgâhı.** Tam ekran harita, sol enstrüman rayı, katman/araç/analiz panelleri. Rol tabanlı: ziyaretçi kamu katmanlarını, personel mülkiyet ve imar katmanlarını görür.
- **`/rehber` — Mahalle karnesi.** Vatandaşa dönük kamu sayfası: bir mahalleye taşınmadan önce bakılan göstergeler (deprem senaryosu, günlük ihtiyaçlara mesafe, mahalledeki hizmetler, altyapı hasar beklentisi) 0–100 puanlı bir karne olarak sunulur, giriş gerektirmez.

Uygulama tek sayfalık (SPA) olduğu için `/rehber` adresinin doğrudan açılabilmesi sunucu tarafında bir geri düşüş kuralı ister. Netlify için `public/_redirects`, Vercel için `vercel.json` depo içinde hazır bulunur. nginx kullanıyorsanız: `try_files $uri $uri/ /index.html;`

Backend (Supabase) yapılandırılmamışsa uygulama otomatik olarak **"salt-kamu" moda** düşer: yalnızca statik/açık veri katmanları çalışır, hiçbir şey çökmez.

---

## İçindekiler

1. [Özellikler](#özellikler)
2. [Teknoloji Yığını](#teknoloji-yığını)
3. [Proje Yapısı](#proje-yapısı)
4. [Gereksinimler](#gereksinimler)
5. [Kurulum](#kurulum)
6. [Ortam Değişkenleri](#ortam-değişkenleri)
7. [Veritabanı](#veritabanı)
8. [Veri Hattı](#veri-hattı)
9. [Yazı Tipleri](#yazı-tipleri)
10. [Geliştirme Komutları](#geliştirme-komutları)
11. [Test ve Kalite Kontrol](#test-ve-kalite-kontrol)
12. [Dağıtım (Deployment)](#dağıtım-deployment)
13. [Çevrimdışı Kullanım (PWA)](#çevrimdışı-kullanım-pwa)
14. [Katmanlar, Araçlar ve Analizler](#katmanlar-araçlar-ve-analizler)
15. [Rol Tabanlı Erişim](#rol-tabanlı-erişim)
16. [Dokümantasyon](#dokümantasyon)
17. [Lisans](#lisans)

---

## Özellikler

- 🗺️ **33 harita katmanı** — topografya (yükselti, eğim, bakı, hillshade, kontur), kent (bina, yol, su, POI, sağlık kurumu), altyapı, mülkiyet/imar ve afet risk katmanları.
- 🛠️ **15 interaktif araç** — ölçüm, tampon, çizim, bilgi sorgulama, koordinat, yükselti profili, paylaşım, numarataj, panorama (Mapillary), çalışma alanı kaydetme, veri içe aktarma, saha modu (GNSS), başarım testi, yazdırma (PDF).
- 📊 **7 mekânsal analiz** — uygun yer seçimi (çok kriterli karar analizi/MCDA), taşkın riski, afet tahliye planı, imar uyumsuzluğu/kaçak yapı tespiti, ulaşım erişilebilirliği, altyapı kazı çakışması, vergi/beyan dışı alan tespiti.
- 🔐 **Rol tabanlı erişim kontrolü** — hem istemci hem veritabanı (PostgreSQL Row Level Security) seviyesinde uygulanan üç kademeli rol modeli (ziyaretçi / personel / yönetici).
- 🏘️ **Mahalle Rehberi** — vatandaşa açık, giriş gerektirmeyen, 38 mahalle için otomatik hesaplanan deprem/erişim/hizmet/altyapı karnesi + PDF dışa aktarımı.
- 📡 **Saha modu** — GNSS/pusula/ivmeölçer sensör füzyonu ile canlı iz kaydı; masaüstünde sentetik tekrar oynatma ile test edilebilir.
- ⚡ **Başarım testi** — cihazın CPU/GPU/depolama performansını ölçen, Excel/JSON dışa aktarılabilir yerleşik benchmark modülü.
- 📶 **Tam PWA desteği** — kullanıcı onaylı güncelleme akışı, ince ayarlı Workbox önbellekleme stratejileriyle çevrimdışı çalışma.
- 🧾 **Denetim (audit) izi** — tüm veri tablolarına bağlı, sahte edilemez, yalnızca yöneticinin görebildiği otomatik değişiklik kaydı.
- 🇹🇷 **Türkçe odaklı** — arayüz, PDF çıktıları (gömülü Türkçe font ile), veri kaynakları ve kod içi tanımlayıcılar Türkçedir.

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Dil | TypeScript 5.9 (strict mod) |
| Ön yüz çatısı | React 19.2 |
| Derleme / dev sunucu | Vite 8 (Rolldown/Rust motoru) |
| Durum yönetimi | Zustand 5 |
| UI bileşen kütüphanesi | Mantine 8 (core, hooks, notifications, charts) |
| Harita motoru | MapLibre GL JS 6 |
| Coğrafi hesaplama | Turf.js 7 |
| Kontur çıkarımı | d3-contour |
| Arka uç / veritabanı | Supabase (PostgreSQL 17 + PostGIS), Row Level Security, PostgREST |
| Yerel/çevrimdışı depolama | IndexedDB (`idb-keyval`) |
| PDF üretimi | jsPDF (gömülü Türkçe karakter fontu) |
| Excel/tablo dışa aktarımı | SheetJS (`xlsx`) |
| PWA | `vite-plugin-pwa` + Workbox |
| Test | Vitest 4 |
| Şema doğrulama | Zod |
| CI/CD | GitHub Actions |

## Proje Yapısı

```
src/
├── analysis/     # 7 mekânsal analiz + saf algoritma çekirdekleri (analysis/core)
├── auth/         # Personel girişi bileşeni
├── bench/        # Cihaz/GPU performans ölçüm modülü
├── config/       # İlçe sabitleri ve dış kaynak kayıtları
├── core/         # Paylaşılan çekirdek: tipler, kayıt (registry) altyapısı, erişim kontrolü,
│                 # harita durumu (URL hash), depolama (IndexedDB), arazi matematiği
├── data/         # DEM/yükselti, arama indeksi, OSM anlık görüntüsü, geliştirme demo verisi
├── guide/        # "/rehber" mahalle karnesi sayfası + puanlama algoritması + PDF
├── layers/       # 33 harita katmanı tanımı + üretici (factory) fonksiyonlar
├── lib/          # Supabase istemci kurulumu
├── map/          # MapLibre sarmalayıcıları: Provider, hook'lar, overlay yönetimi
├── panels/       # Sol rayda görünen paneller
├── pwa/          # Service worker kayıt/güncelleme UX'i
├── reports/      # Yönetici tarafı toplu Excel/PDF raporu
├── sensors/      # GNSS/pusula/ivmeölçer okuma + sensör füzyonu matematiği
├── store/        # Tek Zustand store (appStore.ts)
├── theming/      # Koroplet harita, sınıflandırma algoritmaları, tasarım tokenları
└── tools/        # 15 interaktif harita aracı + kayıt (registry)

supabase/migrations/   # 6 SQL migrasyonu: şema, audit, RLS, güvenlik sertleştirme, kent rehberi
scripts/ingest/        # 9 adımlı resmî veri indirme/normalize hattı
scripts/               # generate-icons.ts, fetch-fonts.ts (build-time varlık üretimi)
public/data/           # İndirilmiş/normalize edilmiş statik veri (GeoJSON/JSON) + manifest.json
docs/                  # Ayrıntılı dokümantasyon (bkz. Dokümantasyon bölümü)
```

Tam mimari açıklaması, modül sözleşmeleri ve genişletme rehberleri için [docs/API_VE_MIMARI.md](docs/API_VE_MIMARI.md) belgesine bakınız.

## Gereksinimler

- Node.js 20 veya üzeri
- [Supabase CLI](https://supabase.com/docs/guides/cli) (veritabanı migration'ları için)

## Kurulum

```bash
npm install
cp .env.example .env
```

`.env` içindeki `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` değerlerini Supabase proje ayarlarından doldurun. Bu değerler boşken uygulama salt-kamu modunda çalışır.

```bash
npm run dev   # http://localhost:5173
```

## Ortam Değişkenleri

| Değişken | Zorunlu mu? | Amaç |
|---|---|---|
| `VITE_SUPABASE_URL` | Hayır (ikisi birlikte) | Supabase proje URL'i — boşsa uygulama salt-kamu modda çalışır |
| `VITE_SUPABASE_ANON_KEY` | Hayır (ikisi birlikte) | Supabase anon genel anahtarı |
| `VITE_MAPILLARY_TOKEN` | Hayır | Panorama aracı için Mapillary erişim jetonu — yoksa araç bilgilendirici bir uyarı gösterip devre dışı kalır |
| `VITE_ORS_API_KEY` | Hayır | Rezerve edilmiş (rota/yönlendirme servisi için) |

## Veritabanı

Şema; ilçe/mahalle sınırları, deprem senaryosu, kadastro parselleri, binalar, adresler, imar planları/lekeleri, kazı ruhsatları, beyanlar, toplanma alanları, projeler, zemin etütleri, yol rayiç değerleri ve otomatik denetim (audit) izini kapsayan 18 iş tablosundan oluşur. Tüm tablolarda PostgreSQL **Row Level Security** etkindir — rol tabanlı okuma/yazma kuralları veritabanı seviyesinde zorlanır. Ayrıntılar için [docs/API_VE_MIMARI.md §13](docs/API_VE_MIMARI.md#13-veri-katmanı--supabase--postgresql--postgis).

```bash
npx supabase link --project-ref <proje-ref>
npm run db:push     # migration'ları uygula
npm run db:reset    # yerel veritabanını sıfırla
npm run db:diff     # şema farkını görüntüle
```

## Veri Hattı

Tüm resmî veriyi (İBB Açık Veri, AFAD, OpenStreetMap, Nominatim) indirip normalize eder ve `public/data/` altına yazar:

```bash
npm run data:build            # tüm adımlar
npm run data:build -- --fresh # ham indirme önbelleğini atlayarak yeniden çek
```

Tek tek çalıştırmak için:

```bash
npm run data:district   # ilçe sınırı (Nominatim)
npm run data:deprem     # İBB deprem senaryosu (38 mahalle + UAVT)
npm run data:mahalle    # mahalle sınırı (geokod → Voronoi, YAKLAŞIK)
npm run data:acilyol    # İBB acil ulaşım yolları
npm run data:saglik     # İBB sağlık kurumları
npm run data:osm        # Overpass anlık görüntüsü (bina, yol, POI, kent hizmetleri, arazi kullanımı)
npm run data:ilceler    # komşu ilçe sınırları
npm run data:durak      # İETT otobüs durakları
npm run data:toplanma   # acil toplanma alanları
```

`data:mahalle` adımı `data:deprem` çıktısına, tüm mekânsal filtreler `data:district` çıktısına bağlıdır. `data:durak` ve `data:toplanma` isteğe bağlıdır; CKAN veri seti çözülemezse hat devam eder ve duraklar OSM anlık görüntüsündeki `highway=bus_stop` katmanından beslenir. İlerleme, hattın sonunda `public/data/manifest.json`'a yazılan kayıt sayısı/boyut özetiyle raporlanır.

## Yazı Tipleri

Arayüz yazı tipleri (Archivo, JetBrains Mono) `public/fonts/` altında kendi sunucumuzda durur — PWA çevrimdışı çalışırken de metin doğru çizilsin diye çalışma anında Google Fonts'a istek gitmez. Yeniden indirmek için:

```bash
npm run fonts
```

PWA ikonlarını yeniden üretmek için (bağımlılıksız, elle yazılmış PNG üreticisi):

```bash
npm run icons
```

## Geliştirme Komutları

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu — http://localhost:5173 |
| `npm run build` | `tsc -b && vite build` — tip kontrolü + üretim derlemesi (`dist/`) |
| `npm run preview` | Üretim çıktısını yerelde sun |
| `npm run typecheck` | Yalnızca tip kontrolü (`tsc -b`) |
| `npm run test` | Birim testlerini bir kez çalıştır (Vitest) |
| `npm run test:watch` | Testleri izleme modunda çalıştır |
| `npm run db:push` / `db:reset` / `db:diff` | Supabase migration yönetimi |
| `npm run data:build` | Tüm veri alım hattını çalıştır |
| `npm run data:*` | Veri alım hattının tek bir adımını çalıştır (yukarıya bakınız) |
| `npm run icons` | PWA ikonlarını üret |
| `npm run fonts` | Yazı tiplerini yerelleştir |

## Test ve Kalite Kontrol

Proje, 14 test dosyasında toplam **184 birim testiyle** kapsanmaktadır (Vitest, Node ortamı) — puanlama algoritmaları, sınıflandırma (Jenks/kantil), sensör füzyonu, benchmark istatistikleri, mekânsal analiz çekirdekleri ve katman fabrikaları gibi saf/hesaplama mantığı hedeflenir:

```bash
npm run test
```

`.github/workflows/ci.yml`, `main` dalına her push/PR'da sırasıyla `npm ci` → `npm run typecheck` → `npm run test` → `npm run build` adımlarını çalıştırır.

## Dağıtım (Deployment)

Uygulama statik bir SPA olarak (`npm run build` → `dist/`) herhangi bir statik barındırma sağlayıcısına dağıtılabilir:

- **Vercel**: depo köküyle birlikte gelen `vercel.json` tüm yolları `index.html`'e yönlendirir.
- **Netlify**: `public/_redirects` dosyası aynı kuralı sağlar.
- **nginx / diğer**: `try_files $uri $uri/ /index.html;` kuralını ekleyin.

Bu geri düşüş kuralı olmadan `/rehber` adresi doğrudan açıldığında (yenilendiğinde) 404 alınır. Geliştirme ortamında `vite.config.ts` içinde tanımlı `/proxy/afad` ve `/proxy/overpass` CORS proxy'lerinin üretimde bir eşdeğerinin (sunucu tarafı yönlendirme/fonksiyon) sağlanması gerekir.

## Çevrimdışı Kullanım (PWA)

Uygulama `vite-plugin-pwa` ve Workbox ile tam bir İlerici Web Uygulamasıdır: tarayıcının "yükle"/"ana ekrana ekle" özelliğiyle kurulabilir, önceden ziyaret edilen veri ve harita döşemeleri önbelleğe alınır, yeni sürüm yayınlandığında kullanıcı onayı istenen ("Yenile"/"Sonra") bir bildirim gösterilir — otomatik/zorla yenileme yapılmaz.

## Katmanlar, Araçlar ve Analizler

Uygulama, **kayıt (registry) tabanlı** bir mimariyle her biri kendi erişim düzeyini (`public`/`personel`) bildiren modüllerden oluşur:

- **33 katman** — 5'i (`imar-lekesi`, `imar-uygulama-alani`, `numarataj`, `yol-rayic`, `zemin-etut`) yalnızca personel girişiyle görünür; geri kalanı kamuya açıktır.
- **15 araç** — yalnızca "Veri içe aktar" personel girişi gerektirir.
- **7 analiz** — 3'ü (imar uyumsuzluğu, kazı çakışması, beyan dışı alan) yalnızca personel girişiyle çalıştırılabilir.

Tam envanter tabloları (her katman/araç/analizin veri kaynağı, erişim düzeyi ve amacı) için [docs/API_VE_MIMARI.md](docs/API_VE_MIMARI.md); kullanıcı gözünden adım adım kullanım için [docs/KULLANIM_KILAVUZU.md](docs/KULLANIM_KILAVUZU.md) ve [docs/KULLANIM_SENARYOSU.md](docs/KULLANIM_SENARYOSU.md) belgelerine bakınız.

## Rol Tabanlı Erişim

Üç kademeli rol modeli (`public` < `personel` < `yonetici`) Supabase Auth JWT'sindeki `app_metadata.rol` alanına yazılır ve **hem istemci tarafında** (arayüz filtrelemesi, `src/core/access.ts`) **hem veritabanı tarafında** (PostgreSQL Row Level Security, asıl güvenlik sınırı) aynı kuralla uygulanır. Rol yalnızca sunucu tarafında (bir yönetici tarafından) atanabilir; uygulamada kendi kendine kayıt (signup) akışı yoktur.

## Dokümantasyon

Ayrıntılı belgeler `docs/` klasöründedir:

- [docs/API_VE_MIMARI.md](docs/API_VE_MIMARI.md) — teknoloji yığını, mimari şema, katman/araç/analiz sözleşmeleri, veritabanı şeması ve RLS güvenlik modeli, genişletme rehberleri.
- [docs/KULLANIM_KILAVUZU.md](docs/KULLANIM_KILAVUZU.md) — kurulumdan başlayarak son kullanıcı için adım adım kullanım kılavuzu.
- [docs/KULLANIM_SENARYOSU.md](docs/KULLANIM_SENARYOSU.md) — vatandaş, personel ve saha ekibi için uçtan uca 10 kullanım senaryosu.
- [docs/STAJ_RAPORU.md](docs/STAJ_RAPORU.md) — geliştirme geçmişine dayalı staj raporu şablonu.

## Lisans

Bu depo `package.json` içinde `"private": true` olarak işaretlidir ve bir açık kaynak lisansı içermez — Arnavutköy Belediyesi'ne özel, dahili bir kurumsal projedir.
