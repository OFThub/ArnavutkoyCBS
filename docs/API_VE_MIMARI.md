# Arnavutköy CBS — API ve Mimari Dokümantasyonu

> Bu belge, `c:\Projects\ArnavutköyCBS` deposundaki kaynak kodun tamamı okunarak hazırlanmıştır. Uygulamanın geleneksel bir REST/GraphQL API'si yoktur; "API" burada **uygulama içi modül sözleşmelerini** (katman/araç/analiz kayıt arayüzleri), **Supabase (PostgreSQL/PostGIS) veri API'sini** ve **dış servis entegrasyonlarını** kapsar.

## İçindekiler

1. [Genel Bakış](#1-genel-bakış)
2. [Teknoloji Yığını](#2-teknoloji-yığını)
3. [Klasör Yapısı](#3-klasör-yapısı)
4. [Mimari Şeması](#4-mimari-şeması)
5. [Uygulama Girişi ve Yönlendirme](#5-uygulama-girişi-ve-yönlendirme)
6. [Durum Yönetimi — Zustand Store](#6-durum-yönetimi--zustand-store)
7. [Harita Çekirdeği](#7-harita-çekirdeği)
8. [Rol Tabanlı Erişim Kontrolü (RBAC)](#8-rol-tabanlı-erişim-kontrolü-rbac)
9. [Katman Sistemi](#9-katman-sistemi-layers)
10. [Araç Sistemi](#10-araç-sistemi-tools)
11. [Analiz Sistemi](#11-analiz-sistemi-analysis)
12. [Panel / UI Bileşenleri](#12-panel--ui-bileşenleri)
13. [Veri Katmanı — Supabase / PostgreSQL / PostGIS](#13-veri-katmanı--supabase--postgresql--postgis)
14. [Kimlik Doğrulama](#14-kimlik-doğrulama)
15. [Veri Alım Hattı (Ingest Pipeline)](#15-veri-alım-hattı-ingest-pipeline)
16. [Rehber (`/rehber`) Sayfası Mimarisi](#16-rehber-rehber-sayfası-mimarisi)
17. [Tema ve Görselleştirme](#17-tema-ve-görselleştirme)
18. [PWA Mimarisi](#18-pwa-mimarisi)
19. [Sensör Füzyonu ve Saha Modu](#19-sensör-füzyonu-ve-saha-modu)
20. [Performans Ölçüm Modülü (bench)](#20-performans-ölçüm-modülü-bench)
21. [Build, Test ve CI/CD](#21-build-test-ve-cicd)
22. [Ortam Değişkenleri](#22-ortam-değişkenleri)
23. [Genişletme Rehberleri](#23-genişletme-rehberleri)
24. [Bilinen Sınırlamalar ve Teknik Notlar](#24-bilinen-sınırlamalar-ve-teknik-notlar)

---

## 1. Genel Bakış

**Arnavutköy CBS**, Arnavutköy Belediyesi için geliştirilen, tarayıcı tabanlı bir **Coğrafi Bilgi Sistemi (CBS)** tek-sayfa uygulamasıdır (SPA). İki ayrı sayfa sunar:

| Rota | Amaç | Hedef kullanıcı |
|---|---|---|
| `/` | Tam ekran harita "tezgâhı": katmanlar, araçlar, mekânsal analizler | Ziyaretçi (kamu) + Personel (giriş yapmış belediye çalışanı) |
| `/rehber` | "Mahalle karnesi": bir mahalleye taşınmadan önce bakılacak göstergeler (deprem riski, hizmetlere mesafe, altyapı hasar beklentisi) | Vatandaş (kimlik doğrulama gerektirmez) |

Uygulama **rol tabanlı** çalışır: kimliği doğrulanmamış ziyaretçi yalnızca kamuya açık katman/araç/analizleri görür; `personel` veya `yonetici` rolüyle giriş yapan belediye çalışanı mülkiyet, imar ve kurumsal verilere erişebilir. Roller Supabase Auth üzerinden JWT `app_metadata` alanına yazılır; istemci tarafı bunu yalnızca **arayüz filtrelemesi** için kullanır — gerçek güvenlik sınırı veritabanındaki Row Level Security (RLS) politikalarıdır (bkz. [§13](#13-veri-katmanı--supabase--postgresql--postgis)).

Backend (Supabase) yapılandırılmamışsa (`.env` boşsa) uygulama otomatik olarak **"salt-kamu" moda** düşer: yalnızca statik/açık veri katmanları çalışır, hiçbir şey çökmez.

## 2. Teknoloji Yığını

| Katman | Teknoloji | Sürüm | Notlar |
|---|---|---|---|
| UI çatısı | React | 19.2 | Fonksiyonel bileşenler, hook tabanlı |
| Derleyici / dev sunucu | Vite | 8.1 (Rolldown/Rust motoru) | `rolldownOptions` ile elle chunk bölme |
| Dil | TypeScript | 5.9 | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| UI bileşen kütüphanesi | Mantine (core/hooks/notifications/charts) | 8.3 | Tema `createTheme`, `defaultColorScheme="auto"` |
| Harita motoru | MapLibre GL JS | 6.0 | Vektör + raster + raster-dem + hillshade |
| Durum yönetimi | Zustand | 5.0 | Tek global store, ara katman (middleware) yok |
| Coğrafi hesaplama | Turf.js (`@turf/turf`) | 7.3 | Alan, mesafe, kesişim, buffer, hex grid vb. |
| Kontur çıkarımı | `d3-contour` | 4.0 | Marching squares |
| Yerel önbellek | `idb-keyval` (IndexedDB) | 6.3 | DEM, OSM anlık görüntüsü, çalışma alanları |
| Arka uç / veritabanı | Supabase (PostgreSQL + PostGIS) | `@supabase/supabase-js` 2.95 | Auth, RLS, PostgREST |
| PDF üretimi | `jspdf` | 4.2 | Türkçe karakter destekli gömülü font |
| Tablo/Excel dışa aktarım | `xlsx` (SheetJS) | 0.18 | Rapor ve benchmark dışa aktarımı |
| İkonlar | `@tabler/icons-react` | 3.46 | Araç dock'u ikonları |
| Grafikler | `@mantine/charts` (Recharts tabanlı) | 8.3 | Tembel yüklenir (`lazy`/`Suspense`) |
| PWA | `vite-plugin-pwa` + Workbox | 1.3 / 7.4 | Manuel güncelleme onaylı service worker |
| Test | Vitest | 4.0 | Node ortamı, saf fonksiyon testleri |
| Doğrulama şeması | Zod | 4.3 | Veri alım hattında (ingest) satır doğrulama |

## 3. Klasör Yapısı

```
src/
├── analysis/        # 7 mekânsal analiz + saf algoritma çekirdekleri (analysis/core)
├── auth/            # Personel girişi bileşeni (AuthControl.tsx)
├── bench/           # Cihaz/GPU performans ölçüm modülü
├── config/          # İlçe sabitleri (district.ts) ve dış kaynak kayıtları (sources.ts)
├── core/            # Paylaşılan çekirdek: tipler, kayıt (registry) altyapısı, erişim kontrolü,
│                     # harita durumu (URL hash), depolama (IndexedDB), arazi/terrain matematiği
├── data/             # DEM/yükselti, arama indeksi, OSM anlık görüntüsü, geliştirme demo verisi
├── guide/            # "/rehber" mahalle karnesi sayfası + puanlama algoritması + PDF
├── layers/           # 35 harita katmanı tanımı + üretici (factory) fonksiyonlar
├── lib/              # Supabase istemci kurulumu
├── map/               # MapLibre sarmalayıcıları: Provider, hook'lar, overlay yönetimi
├── panels/            # Sol rayda görünen paneller (katman, araç, analiz, arama, vb.)
├── pwa/               # Service worker kayıt/güncelleme UX'i
├── reports/           # Yönetici tarafı toplu Excel/PDF raporu (tüm mahalleler)
├── sensors/           # GNSS/pusula/ivmeölçer okuma + sensör füzyonu matematiği
├── store/             # Tek Zustand store (appStore.ts)
├── theming/           # Koroplet (tematik) harita, sınıflandırma algoritmaları, tasarım tokenları
├── tools/             # 17 interaktif harita aracı + kayıt (registry)
├── App.tsx            # Ana CBS tezgâhı bileşeni
└── main.tsx            # Uygulama girişi: kayıtlar, oturum, sağlayıcılar, yönlendirme

supabase/
└── migrations/         # 6 SQL migrasyonu: şema, audit, RLS, güvenlik sertleştirme, kent rehberi

scripts/
├── ingest/             # 9 adımlı resmî veri indirme/normalize hattı + paylaşılan yardımcılar
├── generate-icons.ts   # PWA ikonlarını üretir (bağımlılıksız PNG encoder)
└── fetch-fonts.ts      # Google Fonts'tan Archivo/JetBrains Mono'yu yerelleştirir

public/data/            # İndirilmiş/normalize edilmiş statik veri (GeoJSON/JSON) + manifest.json
```

## 4. Mimari Şeması

```mermaid
flowchart TB
    subgraph UI["React UI (src/panels, src/guide)"]
        Rail["Rail.tsx — sol enstrüman rayı"]
        LayerPanel["LayerPanel.tsx"]
        ToolDock["ToolDock.tsx"]
        AnalysisDock["AnalysisDock.tsx"]
        GuidePage["GuidePage.tsx (/rehber)"]
    end

    subgraph Store["Durum (src/store/appStore.ts — Zustand)"]
        AppStore["role, session, activeLayers,\nactiveTool, activeAnalysis, sketch,\nbasemap, devMode, terrain3d ..."]
    end

    subgraph Registries["Kayıt Katmanı (src/core/*Registry.ts + src/tools/registry.ts)"]
        LayerReg["layerRegistry — 35 katman"]
        ToolReg["tools/registry — 17 araç"]
        AnalysisReg["analysisRegistry — 7 analiz"]
    end

    subgraph MapCore["Harita Çekirdeği (src/map/*)"]
        MapProvider["MapProvider.tsx — MapLibre örneği + Context"]
        LayerHost["useLayerHost.ts — registry → MapLibre köprüsü"]
        Overlays["overlays.ts / analysisOverlay.ts / resultOverlay.ts"]
    end

    subgraph Data["Veri Kaynakları"]
        StaticFiles["public/data/*.geojson — statik (build-time)"]
        Supabase[("Supabase\nPostgreSQL + PostGIS + RLS")]
        DEM["AWS Terrarium DEM tiles + Web Worker"]
        OSMSnap["OSM Overpass anlık görüntüsü"]
    end

    UI --> Store
    Store --> Registries
    Registries --> LayerHost
    LayerHost --> MapProvider
    MapProvider --> Overlays
    Registries -.rol filtresi (core/access.ts).-> Store
    LayerHost --> StaticFiles
    LayerHost --> Supabase
    LayerHost --> DEM
    LayerHost --> OSMSnap
    AnalysisDock --> AnalysisReg
    AnalysisReg --> MapCore
    AnalysisReg --> Supabase
```

Uygulamanın temel prensibi: **"bir kayıt (registry), bir React bağlayıcı hook, bir jenerik render yolu."** Yeni bir katman/araç/analiz eklemek, yeni bir UI kod yolu yazmayı gerektirmez — yalnızca ilgili registry dizisine bir nesne eklenir (bkz. [§23](#23-genişletme-rehberleri)).

## 5. Uygulama Girişi ve Yönlendirme

**`src/main.tsx`** tek bootstrap dosyasıdır; sırasıyla:

1. Mantine `theme` nesnesini özel renk skalalarıyla (`kadastro` kırmızı, `tarim` yeşil, `su` mavi) kurar.
2. Modül yüklenirken (render'dan önce) `installLayers()`, `installAnalyses()`, `installTools()` çağrılarak üç registry'nin (`layerRegistry`, `analysisRegistry`, `tools/registry`) modül seviyesinde `Map`'leri doldurulur.
3. `currentSession()` (Supabase) ile başlangıç oturumunu okuyup **React dışında**, doğrudan `useAppStore.getState().setSession(session)` ile store'a yazar; ardından `onAuthChange(...)` ile gelecekteki oturum değişikliklerine abone olur.
4. `registerPwa()` çağrılır (service worker kaydı, [§18](#18-pwa-mimarisi)).
5. `#root` içine şu sağlayıcı hiyerarşisiyle render eder: `StrictMode > MantineProvider > Notifications > ErrorBoundary > Router`.

**Yönlendirme** son derece basittir — gerçek bir router kütüphanesi kullanılmaz. `src/core/route.ts`'teki `useRoute()`, `window.location.pathname`'in `/rehber` ile bitip bitmediğine bakar (kayan çizgiye toleranslı); `main.tsx`'teki `Router()` bileşeni bu değere göre `<GuidePage />` ya da `<App />` render eder.

**`src/App.tsx`**, ana CBS tezgâhının kök bileşenidir: `MapProvider` içinde haritayı kurar, `Rail` (sol rayı), aktif panel/araç/analiz kartlarını ve `Antet` (durum çubuğunu) bir araya getirir.

## 6. Durum Yönetimi — Zustand Store

`src/store/appStore.ts`, uygulamanın **tek** global durumudur (ara katman/middleware yok, `persist` kullanılmaz — kalıcılık gereken yerler [WorkspaceTool] kendi IndexedDB kaydını kullanır). Başlıca durum dilimleri:

- **Kimlik/rol**: `role: Role` (`public|personel|yonetici`, varsayılan `public`), `session: Session|null` — `setSession` her çağrıldığında rolü oturumdan yeniden hesaplar.
- **Harita görünümü**: `basemap`, `visibleLayers` (görünür katman id'leri kümesi), `terrain3d`, `terrainExaggeration`, `building3d`, `contourInterval`.
- **Aktif seçimler**: `activeToolId`, `activeAnalysisId` — panel/dock bileşenleri bunlara göre tek bir aracın/analizin panelini render eder.
- **Çizim verisi**: `sketch: Feature[]` — `SketchTool`'da oluşturulan taslaklar; araç değişse de kalıcıdır (global store'da tutulduğu için).
- **Geliştirici modu**: `devMode` — açıkken kurumsal (Supabase) katmanlar gerçek veri yerine `data/devDemoData.ts`'teki demo geometriyi gösterir; backend olmadan geliştirme/demo yapılabilmesini sağlar.

Bileşenler `useAppStore((s) => s.xyz)` seçici (selector) deseniyle abone olur; store dışı kod (örn. `main.tsx`, `map/useMapStateSync.ts`) `useAppStore.getState()`/`.setState()` ile doğrudan erişir.

## 7. Harita Çekirdeği

`src/map/` dizini, MapLibre GL'i React'e bağlayan ince bir sarmalayıcı katmandır:

- **`MapProvider.tsx`**: `maplibregl.Map` örneğini oluşturur, `MapContext` (React context) üzerinden `{ map, overlays, ready }` sağlar. `overlays`, aşağıda açıklanan `OverlayManager`'dır.
- **`mapContext.ts`**: `useMapContext()` hook'u — her araç/panel, harita hazır olana kadar (`ready`) etkilerini beklemeye alır.
- **`useLayerHost.ts`**: **registry → MapLibre köprüsü**. `useAppStore.visibleLayers` ve rol değiştikçe, `listLayers(role)`'dan gelen her `LayerModule` için `register(map)`/`setVisible(map, visible)` çağırır. Bir katmanın LayerPanel'de tıklanmasından haritada belirmesine kadarki tüm akış buradan geçer.
- **`basemap.ts`**: Alt harita (liberty/esriImagery/cartoDark/openTopoMap) değişimini yönetir; stil değiştiğinde tüm kayıtlı katmanları yeniden kurar (MapLibre `setStyle` katmanları siler).
- **`overlays.ts`**: `OverlayManager` — kaynak/katman ekleme-güncelleme (`upsertLayer`) için jenerik, tekrar kullanılabilir yardımcılar; çoğu katman ve araç bunun üzerine inşa edilir.
- **`draw.ts`**: `startDrawSession(map, overlays, opts)` — dışarıdan kütüphane kullanmadan elle yazılmış nokta/çizgi/alan çizim etkileşimi (tıkla-ekle, çift tık/Enter ile bitir, Backspace ile geri al, Esc ile sıfırla, sürükle-düzenle). Ölçüm, tampon, çizim, saha ve profil araçlarının ortak temelidir.
- **`resultOverlay.ts`**: `createResultOverlay(map, overlays, id, color)` — tek seferlik "bu sonucu doldur/çizgi/nokta olarak boya" fabrikası; Buffer/Coordinate/Field gibi araçlarca kullanılır.
- **`analysisOverlay.ts`**: Analiz sonuçları için **tek** paylaşılan overlay (`analiz-sonuc` kaynağı) — her analiz çalıştırıldığında öncekinin üstüne yazılır.
- **`terrainSource.ts` / `vectorSource.ts` / `gridImage.ts`**: Sırasıyla 3B arazi kaynağı, vektör kaynak yardımcıları, ve DEM türevi ızgaraların canvas üzerinde piksel piksel PNG'e dönüştürülüp `image` kaynağı olarak yüklenmesi.
- **`use*.ts` senkronizasyon hook'ları**: `useMapStateSync` (URL hash ↔ harita durumu), `useBuildingSync` (3B/2B bina geçişi), `useSketchOverlay` (store'daki `sketch`'i haritada kalıcı çizer), `useTerrainSync` (3B arazi açık/kapalı, abartı), `useWorkAreaBounds` (çalışma alanı dışına kaydırmayı/yakınlaştırmayı sınırlar).

## 8. Rol Tabanlı Erişim Kontrolü (RBAC)

`src/core/access.ts` ve `src/core/types.ts` içinde tanımlıdır:

```ts
type Role   = 'public' | 'personel' | 'yonetici'   // 3 kademeli kullanıcı rolü
type Access = 'public' | 'personel'                 // 2 kademeli kaynak erişim düzeyi

const RANK = { public: 0, personel: 1, yonetici: 2 }

canAccess(role, access) = access === 'public' || RANK[role] >= RANK.personel
canWrite(role)          = RANK[role] >= RANK.personel
isAdmin(role)           = role === 'yonetici'
```

Her `LayerModule`/`ToolModule`/`AnalysisModule` kendi `access` alanını bildirir; üç registry de (`layerRegistry`, `analysisRegistry`, `tools/registry`) listeleme fonksiyonlarında (`listLayers`, `listAnalyses`, `listTools`) bu tek `canAccess` fonksiyonuyla filtreler. Yani **erişim kontrolü rol/registry başına değil, deklaratif olarak modül başına** tanımlanır.

> ⚠️ Bu istemci tarafı filtreleme yalnızca **arayüz** içindir. Gerçek güvenlik sınırı veritabanındaki RLS politikalarıdır ([§13](#13-veri-katmanı--supabase--postgresql--postgis)) — `access.ts` içindeki yorum bunu "RLS ile aynı kuralın istemci tarafındaki karşılığı" olarak tanımlar.

Rol yalnızca sunucu tarafında (Supabase Auth `app_metadata.rol`) atanabilir; kullanıcı kendi rolünü kendi kendine yükseltemez ([§14](#14-kimlik-doğrulama)).

## 9. Katman Sistemi (Layers)

### 9.1 Sözleşme

```ts
interface LayerModule {
  id: string; title: string; group: LayerGroup; access: Access; order?: number
  register(map: MapLibreMap): void | Promise<void>
  setVisible(map: MapLibreMap, visible: boolean): void
  themable?: ThemableField[]; legend?: LegendItem[]; paintLayers?: string[]
}
// LayerGroup: 'altlik' | 'topografya' | 'kent' | 'mulkiyet' | 'altyapi' | 'risk' | 'demografi'
```

`src/core/layerRegistry.ts`, `id`'ye göre indekslenen bir `Map` tutar: `registerLayer` (aynı id farklı nesneyle kayıtlıysa hata fırlatır — "Katman kimliği zaten kayıtlı"), `getLayer`, `listLayers(role)`, `listLayersByGroup(role)` (LayerPanel'in gruplu görünümünü besler), `clearLayerRegistry()` (yalnızca test).

### 9.2 Üç üretici (factory) deseni

Katmanların çoğu, tekrarlanan MapLibre boyama kodunu yazmak yerine üç jenerik fabrikadan biriyle üretilir:

| Fabrika | Dosya | Veri kaynağı | Kullanan katman sayısı |
|---|---|---|---|
| `osmFeatureLayer(spec)` | `layers/osmFeatureLayer.ts` | Build-time OSM anlık görüntüsü (`osm-snapshot.geojson`), etiket eşleşmesiyle filtrelenir | 9 (`kentHizmetleriLayers`) |
| `supabaseLayer(spec)` | `layers/supabaseLayer.ts` | Canlı PostgREST sorgusu (`supabase.from(table).select(...)`) | 9 (`kurumsalLayers`) |
| `createGridLayer(options)` | `layers/gridLayer.ts` | DEM türevi ızgara (`terrainDerived.ts`), piksel piksel boyanmış `image` kaynağı | 4 (hipsometrik, eğim, bakı, topografik konum) |

`supabaseLayer`, `devMode` açıkken Supabase yerine `data/devDemoData.ts`'teki demo geometriyi gösterir; Supabase yapılandırılmamışsa veya tablo boşsa, her spec'in kendi `bosMesaj` (boş-durum mesajı) metnini bildirim olarak gösterir — sessiz başarısızlık yoktur. `toGeometry()` PostGIS'in hex-WKB döndürdüğü (yanlış yapılandırma) durumları tespit edip o satırları çizmeden sayar.

### 9.3 Katman envanteri (35 katman)

| Grup | id | Başlık | Erişim | Veri kaynağı |
|---|---|---|---|---|
| altlik | `calisma-alani-maske` | Çalışma alanı dışı maskesi | public | Statik GeoJSON |
| altlik | `ilce-maske` | İlçe dışı maskesi | public | Statik GeoJSON |
| altlik | `komsu-ilceler` | Komşu ilçeler | public | Statik GeoJSON |
| altlik | `mahalle-sinir` | Mahalle sınırları (ad etiketli) | public | Statik GeoJSON (`mahalle.geojson`) |
| altlik | `ilce-sinir` | İlçe sınırı | public | Statik GeoJSON (Nominatim R1766093) |
| topografya | `hipsometrik` | Hipsometrik yükselti | public | DEM türevi (raster) |
| topografya | `egim` | Eğim sınıfları | public | DEM türevi (raster) |
| topografya | `baki` | Bakı (yamaç yönü) | public | DEM türevi (raster) |
| topografya | `topografik-konum` | Topografik konum (TPI) | public | DEM türevi (raster) |
| topografya | `golgelendirme` | Kabartma gölgelendirme | public | `raster-dem` (Terrarium tiles, native MapLibre hillshade) |
| topografya | `kontur` | Eşyükselti eğrileri | public | DEM türevi, marching-squares |
| kent | `su` | Su yüzeyleri/akarsular | public | OpenMapTiles vektör döşemeleri |
| kent | `binalar` | Binalar (2B/3B) | public | OSM anlık görüntüsü |
| kent | `yollar` | Yollar | public | OpenMapTiles vektör döşemeleri |
| kent | `poi` | Önemli noktalar | public | OpenMapTiles vektör döşemeleri |
| kent | `saglik-kurumu` | Sağlık kurumları (İBB) | public | Statik GeoJSON (İBB açık veri) |
| kent | `kablosuz-ag`, `sehir-kamerasi`, `geri-donusum`, `pazar-bolgesi`, `park-bahce` | Kent hizmetleri (5 adet) | public | OSM anlık görüntüsü (`osmFeatureLayer`) |
| altyapi | `otobus-duragi`, `bisiklet-yolu`, `dere-alani` | Altyapı (3 adet) | public | OSM anlık görüntüsü |
| altyapi | `fen-isleri` | Fen işleri çalışmaları | public | Supabase `kazi_ruhsat` |
| altyapi | `projeler` | Projeler | public | Supabase `proje` |
| altyapi | `zemin-etut` | Zemin etüd çalışmaları | **personel** | Supabase `zemin_etut` |
| mulkiyet | `arazi-kullanimi` | Arazi kullanımı (imar planı değildir) | public | OSM anlık görüntüsü |
| mulkiyet | `imar-lekesi` | İmar planı (lekeler) | **personel** | Supabase `imar_lekesi` |
| mulkiyet | `imar-tesisi` | İmar tesisleri (leke içi) | **personel** | Supabase `imar_tesisi` |
| mulkiyet | `imar-uygulama-alani` | İmar uygulama alanları | **personel** | Supabase `imar_uygulama_alani` |
| mulkiyet | `numarataj` | Numarataj (adres noktaları) | **personel** | Supabase `adres` |
| mulkiyet | `yol-rayic` | Yol rayiç değerleri | **personel** | Supabase `yol_rayic` |
| mulkiyet | `askidaki-imar-plani` | Askıdaki imar planları | public | Supabase `imar_lekesi` ⋈ `imar_plani` (yalnızca `durum='askida'`) |
| risk | `toplanma-alani` | Afet acil toplanma alanları | public | Supabase `toplanma_alani` |

**Erişim özeti**: 35 katmandan yalnızca **6'sı** (`imar-lekesi`, `imar-tesisi`, `imar-uygulama-alani`, `numarataj`, `yol-rayic`, `zemin-etut`) personel-kilitlidir — hepsi kadastro/imar/adres/değerleme gibi hassas mülkiyet verisi. Afet/toplanma, devam eden kamu işleri (`projeler`, `fen-isleri`) ve askıya çıkmış imar planları bilinçli olarak kamuya açıktır.

#### Harita etiketleri (`SupabaseLayerSpec.label`)

`labelField` tek bir sütunu yazar. Zengin künye için `label.text` alanına doğrudan bir **MapLibre ifadesi** verilir; imar katmanları bunu kullanır ve künye çizimin üstünde okunur:

```
İmar lekesi                       İmar tesisi
─────────────                     ────────────
Dini tesis                        Merkez Camii
Ada/Parsel 1520/7                 Cami · 1200 m² · 750 kişi
E:0.5 · T:0.25 · Hmax:24.5 · 2 kat    Planlanan · 2027
```

İfade parçaları `core/imar.ts` içinde üretilir: `etiketIfadesi()` slug'ı (`dini-tesis`) insan okunur etikete çevirir, `sayiEki`/`tamSayiEki`/`metinEki` ise **boş alanı satırdan tamamen düşürür** — aksi halde " · m²" gibi yarım parçalar görünürdü. `shape: 'fill'` olan katmanlarda etiket poligonun ortasına, nokta/çizgi katmanlarında simgenin altına oturur. `label.allowOverlap` açıkken etiket altlık yazılarıyla çakışsa da gizlenmez (plan bilgisi kaybolmamalı); yoğun nokta katmanları bu bayrağı kullanmaz.

Etiket ifadeleri `src/layers/imarLabels.test.ts` içinde MapLibre'nin **gerçek stil şemasıyla derlenip değerlendirilir** — haritada çıkacak metnin birebir aynısı test edilir, bozuk ifade CI'da yakalanır.

## 10. Araç Sistemi (Tools)

### 10.1 Sözleşme

```ts
interface ToolModule {
  id: string; title: string; description: string
  access: Access            // 'public' | 'personel'
  Panel: ComponentType       // prop almaz, context/store'dan kendi okur
}
```

`src/tools/registry.ts` aynı desendedir (`registerTool`, `listTools(role)`). İkonlar kasıtlı olarak `ToolModule`'da **değil**, `ToolDock.tsx` içindeki yerel `ICONS` haritasında tutulur — "araç modüllerinin bir UI bağımlılığına ihtiyacı olmasın" yorumuyla. `ToolDock`, o an yalnızca **tek bir** aracın panelini monte eder; araç değiştiğinde önceki panelin `useEffect` temizleme (cleanup) mantığı (çizim oturumunu yok etme, harita event handler'larını sökme) devreye girer.

### 10.2 Araç envanteri (17 araç)

| id | Başlık | Erişim | Ne yapar | Ana bağımlılıklar |
|---|---|---|---|---|
| `bilgi` | Bilgi (Inspector) | public | Haritadaki herhangi bir nesneye tıkla → öznitelik, arazi örneklemi, mahalle, sunucu tarafı denetim izi/ekler | `data/osmSnapshot`, `data/records`, `data/terrainDerived`, `data/mahalleIndex` |
| `olcum` | Ölçüm (Measure) | public | Çizgi (mesafe) veya alan ölçümü, segment etiketleri | `@turf/turf`, `map/draw.ts` |
| `tampon` | Tampon (Buffer) | public | Nokta/çizgi/alan çiz → belirli yarıçapta tampon, isteğe bağlı ilçeye kırpma | `@turf/turf` (`buffer`, `intersect`) |
| `cizim` | Çizim (Sketch) | public | Serbest not/işaretleme, global store'da kalıcı, GeoJSON olarak indirilebilir | `store.sketch`, `map/useSketchOverlay` |
| `arazi` | Arazi (Terrain) | public | DEM ızgarası indirir, 3B arazi + abartı, kontur aralığı, harici API ile karşılaştırma | `data/dem`, `data/terrainDerived`, `data/elevationApi` |
| `profil` | Yükselti profili (Profile) | public | Çizgi çiz → mesafe/yükselti grafiği (yükseliş/iniş) | `core/profile.ts`, `@mantine/charts` (lazy) |
| `koordinat` | Koordinat (Coordinate) | public | Ondalık/DMS koordinat gir → git, mevcut merkezi göster | `core/coords.ts` |
| `paylas` | Paylaş (Share) | public | Mevcut görünümü URL hash'inde kodlayan kalıcı bağlantı üretir | `core/mapState.ts` |
| `numarataj` | Numarataj (Numbering) | public | 20 haneli MAKS-UAVT adres kodu üretir/doğrular (haritasız, saf mantık) | `analysis/core/uavt.ts` |
| `panorama` | Panorama | public | Mapillary sokak görünümü kapsama katmanı + gömülü görüntü modalı | Mapillary vektör döşemeleri (`VITE_MAPILLARY_TOKEN` gerektirir) |
| `calisma-alani` | Çalışma alanı (Workspace) | public | Görünüm+katman+taslak durumunu adlandırıp yerel olarak kaydet/geri yükle | `core/workspace.ts`, `core/storage.ts` (IndexedDB) |
| `imar-duzenle` | İmar planı düzenle | **personel** | Plan aç/seç/sil → imar lekesi çiz veya köşe koordinatlarını elle gir → lekenin içine tesis (cami, okul, park…) ekle. Üç seviyede de tam CRUD | `core/imar.ts`, `data/imarRepo.ts`, `map/draw.ts` |
| `mahalle-bilgi` | Mahalle bilgileri | **personel** | Mahalle nüfus/hane/veri yılı/kaynak girer; yoğunluk ve sınıf anında hesaplanır | `core/nufus.ts`, `lib/supabase.ts` |
| `veri-ice-aktar` | Veri içe aktar (Import) | **personel** | GeoJSON dosyasını 9 Supabase tablosundan birine toplu yükler (`mahalle` hedefi upsert) | `lib/supabase.ts`, `core/imar.ts` (EWKT) |
| `saha` | Saha modu (Field) | public | Canlı GNSS/pusula/ivmeölçer okuma, iz kaydı, sentetik tekrar oynatma modu | `sensors/fusion.ts`, `sensors/source.ts` |
| `basarim` | Başarım testi (Benchmark) | public | Cihaz CPU/GPU/depolama performansını ölçer, Excel/JSON dışa aktarır | `src/bench/*` |
| `yazdir` | Yazdır (Print) | public | Mevcut görünümü başlık/ölçek çubuğu/kuzey oku ile A4 PDF olarak dışa aktarır | `jspdf`, `tools/print.ts` |

**Veri içe aktar**, **İmar planı düzenle** ve **Mahalle bilgileri** registry seviyesinde `personel` kilitlidir; üçü de panel içinde rol ve backend kontrolünü tekrarlar (savunma derinliği), asıl yetkilendirme sınırı ise RLS'tir.

#### Geometri yazımı — EWKT

Yazma yolundaki tüm geometriler `core/imar.ts:toEwkt()` ile `SRID=4326;…` metnine çevrilir. Sebep: PostgREST gövdesindeki JSON, geometri sütununa PostGIS `geometry_in` fonksiyonuyla yazılır ve bu fonksiyon **GeoJSON nesnesi kabul etmez**, EWKT'yi ise her sürümde kabul eder. `imar_lekesi` ve `imar_uygulama_alani` sütunları `geometry(MultiPolygon,…)` olduğundan çizilen `Polygon` yazılmadan önce `toMultiPolygon()` ile sarmalanır. Bozuk koordinat (`NaN`, eksik eksen) `null` döndürür ve kayıt sessizce yarım yazılmak yerine atlanır.

#### Çizim oturumu — koordinat girişi

`map/draw.ts` oturumu `setVertices(pairs, finished?)` / `getVertices()` ile dışarıdan sürülebilir; `onChange` geri çağrısının ikinci parametresi köşe dizisidir. İmar aracındaki koordinat tablosu ([`tools/imar/VertexTable.tsx`](../src/tools/imar/VertexTable.tsx)) bu API üzerinden haritayla **çift yönlü** çalışır: haritada çizilen köşe tabloya düşer, tabloda yazılan koordinat haritayı günceller. Kayıtlı bir geometriyi düzenlemeye almak da aynı yoldan yapılır. Toplu yapıştırma `core/coords.ts:parseCoordinate` ile hem ondalık derece hem DMS satırlarını okur.

## 11. Analiz Sistemi (Analysis)

### 11.1 Sözleşme ve akış

```ts
interface AnalysisModule<P> {
  id: string; title: string
  category: 'mekansal'|'risk'|'ulasim'|'imar'|'afet'|'idari'
  access: 'public' | 'personel'
  params: ParamSpec[]        // number | select | boolean | geometry
  run(ctx: AnalysisContext, params: P): Promise<AnalysisResult>
}
type AnalysisResult = {
  summary: string; metrics: AnalysisMetric[]
  geojson?: FeatureCollection; style?: LayerStyleSpec
  table?: AnalysisTable; chart?: ChartSpec
}
```

`AnalysisDock.tsx → runAnalysis(analysis, map, role, params)` (`src/analysis/runner.ts`) → `AnalysisContext = { map, district, role, loadDataset, signal? }` oluşturur ve `analysis.run(ctx, params)`'ı çağırır. `AnalysisResult` tek jenerik sözleşmedir; `ResultPanel`/`ResultChart` hangi alanlar doluysa (tablo/grafik/geojson) onu render eder — analiz başına özel UI kodu yoktur. Georeferanslı sonuçlar (7'den 5'i) tek paylaşılan `analysisOverlay`'e (`analiz-sonuc` kaynağı) çizilir; yeni bir çalıştırma önceki sonucu değiştirir.

Mimari desen: **`analysis/core/X.ts`** (saf, test edilebilir algoritma — turf/Supabase yok) + **`analysis/X.ts`** (veri çekme/şekillendirme sarmalayıcısı, `core` fonksiyonunu çağırıp `AnalysisResult`'a dönüştürür). `analysis/support.ts`, dört ızgara/nokta tabanlı analizin (uygunluk, taşkın, erişilebilirlik) paylaştığı yardımcıları barındırır (`buildHexGrid`, `nearestDistanceM`, `districtArea` vb.).

### 11.2 Analiz envanteri (7 analiz)

| id | Başlık | Kategori | Erişim | Sorduğu soru | Algoritma çekirdeği |
|---|---|---|---|---|---|
| `uygun-yer` | Uygun yer seçimi (MCDA) | mekansal | public | Yeni tesis için en uygun konum nerede? (eğim, yol/tesis yakınlığı, bina yoğunluğu) | `core/mcda.ts` — çok kriterli karar analizi (ağırlıklı normalize skorlama) |
| `taskin-riski` | Taşkın riski | risk | public | Hangi bölgeler/binalar taşkın riski altında? | `core/flood.ts` — yükselti/eğim/su mesafesi ağırlıklı endeks |
| `tahliye-plani` | Afet tahliye planı | afet | public | Mahalle toplanma alanı kapasitesi resmi ihtiyacı karşılıyor mu? | `core/evacuation.ts` — tablo farkı (geometri yok) |
| `imar-uyumsuzluk` | İmar uyumsuzluğu / kaçak yapı | imar | **personel** | Hangi binalar yapıya kapalı imar parsellerinde? | Boole kesişim taraması (`booleanIntersects`) |
| `erisilebilirlik` | Ulaşım ve erişilebilirlik | ulasim | public | Bölgeler sağlık/eğitim/güvenlik tesisine ne kadar uzak? | En yakın mesafe (hex ızgara + turf `nearestPoint`) |
| `kazi-cakisma` | Altyapı kazı çakışması | idari | **personel** | İki kazı ruhsatı aynı yerde/zamanda çakışıyor mu? | `core/excavation.ts` — tarih aralığı ∩ mesafe eşiği |
| `beyan-disi` | Vergi ve beyan dışı alan | idari | **personel** | Hangi binaların beyan edilen alanı gerçek alandan küçük? | `core/declaration.ts` — yüzde fark sınıflandırması |

**Erişim özeti**: 4/7 kamuya açık (uygunluk, taşkın, erişilebilirlik, tahliye — tümü açık veri/OSM/arazi tabanlı, Supabase gerektirmez), 3/7 yalnızca personel (imar uyumsuzluğu, kazı çakışması, beyan dışı — hassas kadastro/ruhsat/vergi verisine dokunur). Supabase tabanlı üç analiz de backend yapılandırılmamışsa veya tablo boşsa açıklayıcı bir sonuçla (hata fırlatmadan) düşer; kazı çakışması ayrıca her zaman gösterilebilir olması için 3 kayıtlık sentetik bir demo veri setine sahiptir.

## 12. Panel / UI Bileşenleri

`src/panels/` altındaki bileşenler, store ve registry'leri React ağacına bağlar:

| Bileşen | Görev |
|---|---|
| `Rail.tsx` | Sol enstrüman rayı — katman/araç/analiz/arama girişleri |
| `LayerPanel.tsx` | `listLayersByGroup(role)` çıktısını gruplu liste + görünürlük anahtarı + opaklık kaydırıcısı (varsa `paintLayers`) olarak render eder |
| `ToolDock.tsx` | `listTools(role)` çıktısını ikon ızgarası olarak render eder, aktif aracın panelini monte eder |
| `AnalysisDock.tsx` | `listAnalysesByCategory(role)` çıktısını akordeon olarak render eder, parametre formu üretir, `runAnalysis` çağırır |
| `DashboardPanel.tsx` | Özet/istatistik gösterge paneli |
| `ResultPanel.tsx` / `ResultChart.tsx` | `AnalysisResult`'ı jenerik olarak (özet/metrik/tablo/grafik) render eder |
| `SearchBox.tsx` | `data/search.ts` üzerinden mahalle+POI arama |
| `BasemapSwitcher.tsx` | Alt harita seçimi |
| `Antet.tsx` (→ `MapAntet`) | Sol alt durum çubuğu: ölçek, imleç koordinatı, veri sürümü, açık/koyu tema anahtarı |

## 13. Veri Katmanı — Supabase / PostgreSQL / PostGIS

### 13.1 Şema (18 iş tablosu + 1 denetim tablosu)

`supabase/migrations/20260724100100_schema.sql` içinde tanımlı, PostGIS geometri sütunlarının tümünde GIST indeksi vardır:

| Tablo | Anahtar sütunlar | Amaç |
|---|---|---|
| `mahalle` | PK `uavt_kod`, `geom MultiPolygon`, `nufus`, `hane`, `alan_km2`, `veri_yili`, `nufus_kaynak`, `yaklasik` | Mahalle sınırları (yaklaşık Voronoi kaynaklı) + nüfus künyesi |
| `deprem_senaryo` | PK=FK `mahalle_uavt`, hasar/ölüm/yaralı/barınma sayıları | İBB deprem senaryosu, mahalle başına |
| `parsel` | `mahalle_uavt`, `ada`/`parsel`, `geom`, `nitelik`, `alan_m2` | Kadastro parselleri |
| `bina` | `parsel_id`, `mahalle_uavt`, `geom`, `kat`, `alan_m2`, `uavt_bina_kod` | Binalar |
| `adres` | `bina_id`, `mahalle_uavt`, `csbm`, `kapi_no` | Adresler (UAVT) |
| `imar_plani` | `ad`, `olcek`, `onay_tarihi`, `aski_baslangic/bitis`, `durum` | İmar planları (taslak/askıda/yürürlükte/iptal) |
| `imar_lekesi` | `plan_id`, `geom MultiPolygon`, `fonksiyon`, `taks`/`kaks`, `hmax`, `kat_adedi`, `yapi_nizami`, `ada`/`parsel`, `plan_notu` | İmar plan lekeleri (plan paftasındaki tam künye) |
| `imar_tesisi` | `leke_id` (→ `imar_lekesi`, cascade), `geom Polygon`, `tur`, `ad`, `alan_m2`, `kapasite`, `durum`, `yil`, `aciklama` | Lekenin **içindeki** tesis: cami, okul, park, otopark… `durum` ∈ mevcut/yapim_asamasinda/planlanan/iptal; `yil` duruma göre yapım ya da hedef yılı |
| `kazi_ruhsat` | `geom LineString`, `kurum`, `baslangic`/`bitis`, `durum` | Kazı ruhsatları |
| `beyan` | `bina_id`, `beyan_alan_m2`, `beyan_tarihi`, `mukellef_no` | Bina beyanları (vergi) |
| `toplanma_alani` | `mahalle_uavt`, `geom`, `kapasite_kisi`, `alan_m2` | Acil toplanma alanları (AFAD) |
| `acil_ulasim_yolu` | `geom MultiLineString`, `ad`, `derece`, `uzunluk_km` | Acil ulaşım yolları |
| `analiz_calismasi` | `sahip` (→ `auth.users`), `parametreler jsonb`, `sonuc jsonb`, `paylasim_kodu`, `herkese_acik` | Kaydedilmiş analiz çalışmaları |
| `ek_dosya` | `tablo`/`kayit_id` (çok biçimli referans), `storage_yolu`, `yukleyen` | Genel ek dosyalar |
| `proje` *(kent rehberi eki)* | `geom`, `tur`, `durum`, `yuklenici`, `butce_tl` | Belediye projeleri |
| `zemin_etut` *(kent rehberi eki)* | `mahalle_uavt`, `geom`, `zemin_sinifi`, `tasima_gucu_kpa`, `sivilasma_riski` | Zemin etütleri |
| `yol_rayic` *(kent rehberi eki)* | `mahalle_uavt`, `geom`, `yil`, `rayic_tl_m2` | Yol rayiç değerleri |
| `imar_uygulama_alani` *(kent rehberi eki)* | `plan_id`, `geom`, `uygulama_turu`, `encumen_karar_no` | İmar uygulama (18. madde) alanları |
| `islem_log` *(denetim)* | `kullanici_id/eposta`, `tablo`, `kayit_id`, `islem`, `eski`/`yeni jsonb`, `zaman` | Otomatik denetim izi (audit trail) |

### 13.2 Güvenlik modeli (RLS)

Üç SQL fonksiyonu JWT `app_metadata.rol` alanını okuyup rol kontrolü yapar: `rol()`, `personel_mi()`, `yonetici_mi()`. Politika deseni:

- **Kamuya açık tablolar** (`mahalle`, `deprem_senaryo`, `toplanma_alani`, `acil_ulasim_yolu`, `proje`): `anon`+`authenticated` için `select (true)`.
- **Yalnızca personel okuyabilir** (`parsel`, `bina`, `adres`, `imar_lekesi`, `imar_tesisi`, `kazi_ruhsat`, `beyan`, `ek_dosya`, `zemin_etut`, `yol_rayic`, `imar_uygulama_alani`): `select` yalnızca `personel_mi()`.
- **Yazma her zaman personel+**: neredeyse her iş tablosunda `for all` politikası `personel_mi()` gerektirir.
- **`imar_plani`** (özel): personel her zaman okuyabilir; ziyaretçi yalnızca `durum in ('askida','yururlukte')` VE bugünün tarihi `aski_baslangic`/`aski_bitis` aralığındaysa okuyabilir — taslak planlar veya askı süresi dışındaki planlar görünmez.
- **`analiz_calismasi`** (özel): sahiplik tabanlı — `herkese_acik` veya `sahip = auth.uid()` ise okunur; yazma yalnızca sahibine açık.
- **`islem_log`** (özel): `select` yalnızca `yonetici_mi()`; `insert/update/delete` `anon`/`authenticated`'dan tamamen kaldırılmış — yalnızca `security definer` tetikleyici fonksiyon yazabilir.

`20260724110000_guvenlik_sertlestirme.sql` ek olarak: tüm rol fonksiyonlarında `search_path` sabitlenir (arama-yolu ele geçirme saldırılarına karşı) ve `audit_trigger()`'ın doğrudan RPC ile çağrılabilmesi engellenir.

### 13.3 Denetim (Audit)

`audit_trigger()` (`security definer`), tüm 13+ iş tablosuna `do $$ ... $$` döngüsüyle bağlanmış tek bir genel tetikleyicidir; her INSERT/UPDATE/DELETE'i `islem_log`'a (`geom` alanı hariç tutularak) yazar. `dokunulma_zamani()` adlı ikinci bir tetikleyici, `updated_at` sütunu olan tablolarda bu alanı otomatik günceller.

### 13.4 İstemci kurulumu

`src/lib/supabase.ts`: `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` okunur, biçim doğrulanır (boş/placeholder/geçersiz URL ise `supabase = null`); `isBackendConfigured()` bu durumu yansıtır. `persistSession: true, autoRefreshToken: true, detectSessionInUrl: true`.

## 14. Kimlik Doğrulama

`src/auth/AuthControl.tsx`: **kayıt (signup) arayüzü yoktur** — yalnızca "Personel girişi" (e-posta+şifre, `signInWithPassword`) modalı. Backend yapılandırılmamışsa buton devre dışı (tooltip ile açıklanır). Giriş yapıldığında rol rozeti (`Ziyaretçi`/`Personel`/`Yönetici`) ve e-posta gösterilir; "Çıkış yap" `signOut()`'u çağırır. Giriş öncesi hiçbir rol rozeti gösterilmez.

Rol ataması **tamamen sunucu taraflıdır**: `session.user.app_metadata.rol` (veya eski `role` anahtarı) yalnızca `personel`/`yonetici` değerlerini kabul eder (`parseRole()`), aksi halde `public`'e düşer. Bir kullanıcı kendi rolünü kendi başına yükseltemez — bunu ancak bir yönetici Supabase Auth panelinden ayarlayabilir.

## 15. Veri Alım Hattı (Ingest Pipeline)

`npm run data:build` (`scripts/ingest/index.ts`), resmî veriyi indirip normalize ederek `public/data/` altına yazar. 9 adım sırayla çalışır; 01–03 **zorunlu** (biri başarısız olursa hat durur), 04–09 **isteğe bağlı** (hata loglanır, hat devam eder):

| # | Betik | Kaynak | Çıktı | Bağımlılık |
|---|---|---|---|---|
| 01 | `01-district.ts` | Nominatim (OSM ilişkisi R1766093) | `district.geojson` | — |
| 02 | `02-ibb-deprem.ts` | İBB CKAN (deprem senaryosu, CSV) | `deprem-senaryo.json` | — |
| 03 | `03-mahalle-geom.ts` | Nominatim geokodlama + Turf Voronoi | `mahalle.geojson` | 02, 01 |
| 04 | `04-ibb-acil-yol.ts` | İBB CKAN (acil ulaşım yolları) | `acil-ulasim-yolu.geojson` | 01 |
| 05 | `05-ibb-saglik.ts` | İBB CKAN (sağlık kurumları, XLSX/CSV) | `saglik-kurumu.geojson` | 01 |
| 06 | `06-osm-snapshot.ts` | Overpass API (2 ayna, geri çekilmeli) | `osm-snapshot.geojson` | 01 |
| 07 | `07-komsu-ilceler.ts` | Overpass + Nominatim | `ilceler.geojson`, `calisma-alani.geojson` | 01 |
| 08 | `08-iett-durak.ts` | İBB CKAN (İETT durakları) — opsiyonel, OSM'ye düşer | `otobus-duragi.geojson` | 06 (yedek) |
| 09 | `09-toplanma-alani.ts` | İBB CKAN (AFAD toplanma alanları) | `toplanma-alani.geojson` | 01 |
| 10 | `10-mahalle-nufus.ts` | Türetilmiş (TÜİK ilçe nüfusu ⋈ OSM bina taban alanı) | `mahalle-nufus.json` | 03, 06 |

> **10. adım bir tahmindir, ölçüm değildir.** Mahalle bazlı nüfus açık veride yayımlanmıyor: TÜİK ADNKS'nin API'si yok, İBB açık verisindeki nüfus setlerinin tamamı ilçe kırılımlı (arama sonucu: "Nüfus Bilgileri", "Belediye Nüfusları", 40+ VDYM seti — hepsi ilçe). Bu yüzden ilçe toplamı, mahallelerin OSM bina taban alanı payına göre dağıtılır. Konut dışı 14 yapı tipi (hangar, sera, depo, sanayi…) hariç tutulur, tek binanın katkısı 2.000 m² ile sınırlanır, apartman ×4 / konut ×1 kat çarpanı uygulanır — aksi halde havalimanı çevresindeki tek bir hangar kırsal mahalleyi ilçenin en kalabalık yeri gibi gösteriyordu. Üretilen her kayıt `tahmini: true` taşır ve arayüzde bu şekilde etiketlenir.

Her betik `recordDataset()` ile paylaşılan `public/data/manifest.json`'a kayıt/boyut bilgisi yazar; `src/config/sources.ts`'teki `DATASETS` bu dosya yollarını çalışma zamanı kodunun (`core/dataset.loadDataset`) kullanacağı mantıksal anahtarlara eşler. `--fresh` bayrağı ham HTTP önbelleğini atlar.

## 16. Rehber (`/rehber`) Sayfası Mimarisi

`GuidePage.tsx`, `guideScore.loadKarneler()` ile 38 mahallenin tamamı için bir "karne" (report card) hesaplar:

- **Puanlama** (`guide/guideScore.ts`): dört alt puan — Deprem, Erişim, Hizmet, Altyapı (her biri 0–100, `tersPuan`/`duzPuan` ile iyi/kötü eşiklerinden lineer enterpolasyon) — ortalanarak `genelPuan` elde edilir. 38 mahalle arasında `siralama` (sıralama) hesaplanır.
- **Veri**: `theming/mahalleData.ts` (mahalle ⋈ deprem senaryosu), OSM anlık görüntüsü (`hizmet`/`poi` temaları), İBB sağlık kurumları veri seti.
- **Nüfus ve alan** (`core/nufus.ts` + `data/mahalleNufus.ts`): nüfus, yüzölçümü, yoğunluk (kişi/km²), hane sayısı, hane başına kişi. Yoğunluk beş mutlak kademeye ayrılır — `Kırsal` (<250) · `Seyrek` (250–1.500) · `Orta` (1.500–5.000) · `Yoğun` (5.000–12.000) · `Çok yoğun` (≥12.000) — ve ayrıca ilçe ortalamasına oranlanır ("ilçe ortalamasının 6,3 katı"). Mutlak sınıf tek başına yanıltıcı olurdu (Arnavutköy geneli zaten seyrek), ikisi birlikte anlamlıdır.
  **Bu bölüm bilerek puanlanmaz** ve `genelPuan`'a girmez: yüksek yoğunluk objektif olarak iyi ya da kötü değildir (hizmete erişimi artırır, kişi başına açık alanı azaltır). `karsilastirma.ts` içinde `nufus` grubunun tüm metrikleri `yon: 'notr'` taşır; bir test bu kuralı kilitler.
  Veri kaynağı iki katmanlıdır: yerel seed dosyası taban, Supabase `mahalle` kaydı üstündür. Bir mahalleye gerçek nüfus girildiği anda o mahallede tahmin devre dışı kalır.
- **Karşılaştırma** (`karsilastirma.ts` + `SiralamaTablosu.tsx` + `KarsilastirmaTablosu.tsx`): 22 metrik altı grupta (Genel, Nüfus ve alan, Deprem, Erişim, Hizmetler, Altyapı) tanımlıdır; her metriğin bir **yönü** vardır (`yuksek-iyi` / `dusuk-iyi` / `notr`).
  - *Sıralama tablosu*: 38 mahalle tek tabloda, altı sütunun herhangi birine göre sıralanabilir, mini çubuklarla. Yönlü metrikte ilk tıklama doğru yöne açılır (mesafede küçükten büyüğe). **Değeri olmayan mahalle asla en iyi sayılmaz, sona düşer.**
  - *Yan yana karne*: en fazla 3 mahalle sütun sütun; yönlü göstergelerde en iyi değer ▲ ile işaretlenir, berabere kalanların hepsi vurgulanır, hepsi eşitse vurgulama yapılmaz (bilgi taşımaz). Açılışta en yoğun ve en seyrek mahalle otomatik karşılaştırmaya gelir.
- **Çıktı**: seçilebilir mahalle listesi, antet kimlik bloğu, "taşınmadan önce" kontrol listesi (eşik aşımına göre otomatik uyarılar), 5 bölüm kartı, sıralama + karşılaştırma bölümü, haritada aç bağlantısı (`encodeMapState` ile derin bağlantı), `karnePdf.exportKarnePdf()` ile tek sayfalık PDF indirme.
- Nüfus tahmini içeren bir karne varsa sayfanın en üstünde, göz ardı edilemeyecek bir uyarı kutusu gösterilir: nüfusun neden türetildiğini, nerede saptığını (sanayi/havalimanı çevresi) ve hangi göstergelerin bundan **etkilenmediğini** (deprem, erişim, hizmet, altyapı) açıkça yazar.
- Backend/veri seti eksikse hata yerine "yöneticiye `npm run data:build` çalıştırması" mesajı gösterir.

## 17. Tema ve Görselleştirme

- **`theming/classify.ts`**: koroplet sınıflandırma — `equalInterval`, `quantile`, gerçek **Jenks doğal kırılımları** (dinamik programlama varyans minimizasyonu) — `rampColors()` (6 kademeli kırmızı sıralı ramp) ve `buildLegend()` ile birleşir.
- **`theming/ThematicPanel.tsx`**: kullanıcı bir alan + sınıflandırma yöntemi + sınıf sayısı (3–6) seçer; MapLibre `step` ifadesiyle canlı choropleth üretir.
- **`theming/tokens.css`**: "kadastro paftası" temalı tasarım tokenları (kırmızı=kadastro/hata, yeşil=tarım/iyi, mavi=su, amber=askıda/orta), Archivo + JetBrains Mono fontları, `prefers-color-scheme` ve Mantine manuel anahtarına duyarlı koyu/açık mod, `prefers-reduced-motion` desteği.
- **`reports/mahalleReport.ts`**: yönetici/BI tarafı toplu Excel/yatay-A4-PDF dışa aktarımı (38 mahallenin ham verisi) — `guide/karnePdf.ts`'ten farklı olarak puanlama içermez, tek mahalle yerine tüm listeyi kapsar.

## 18. PWA Mimarisi

`vite-plugin-pwa` + Workbox, `registerType: 'prompt'` (otomatik değil, **kullanıcı onaylı** güncelleme). `src/pwa/registerPwa.tsx`, `onNeedRefresh()`'te kalıcı bir "Yenile / Sonra" bildirimi gösterir; `onOfflineReady()`'de 6 saniyelik "artık çevrimdışı çalışıyor" bildirimi. Veri tipine göre farklı önbellek stratejileri: `/data/*` → StaleWhileRevalidate (1 yıl), OpenFreeMap döşemeleri → CacheFirst (1 hafta), AWS Terrarium DEM döşemeleri → CacheFirst (1 yıl, 300 giriş). Yazı tipleri (`scripts/fetch-fonts.ts`) ve ikonlar (`scripts/generate-icons.ts`) build-time'da yerelleştirilir — çalışma anında Google Fonts'a istek gitmez.

## 19. Sensör Füzyonu ve Saha Modu

`src/sensors/source.ts`: `navigator.geolocation`, `DeviceOrientationEvent`, `DeviceMotionEvent` üzerinden gerçek cihaz sensörlerini okur (iOS 13+ izin akışı dahil); masaüstünde gerçekçi bir **sentetik tekrar oynatma** (`syntheticTrace`) sunar. `src/sensors/fusion.ts`: pusula+jiroskop için **tamamlayıcı filtre** (`complementaryHeading`, ayarlanabilir ağırlık), sabit-demir (hard-iron) manyetometre kalibrasyonu, GNSS doğruluk eşiğine göre okuma reddi (`acceptFix`), doğruluk-ağırlıklı iz yumuşatma (`smoothTrack`). `FieldTool.tsx` bunları birleştirip canlı iz + yön konisi çizer.

## 20. Performans Ölçüm Modülü (bench)

`src/bench/`: gerçek uygulama iş yüklerini (Terrarium PNG çözme, Horn eğim/bakı, TPI, marching-squares kontur, bellek/IndexedDB testleri) senkron ölçer (`workloads.ts`, `stats.ts`), çoklu Web Worker ile CPU ölçeklenme eğrisi + Amdahl yasası seri kısım tahmini çıkarır (`parallel.ts`), ve harita kare süresini (`gpu.ts`) ölçer. Sonuç `report.ts` ile Excel/JSON olarak dışa aktarılır. **Not**: bu modül tamamen bilgilendirme amaçlıdır — hiçbir yerde ölçüm sonucu otomatik olarak harita/arazi kalitesini ayarlamaz.

## 21. Build, Test ve CI/CD

- **Derleme** (`vite.config.ts`): `optimizeDeps.exclude: ['maplibre-gl']`, ES2022 hedef, `rolldownOptions` ile `maplibre-gl`/`@turf/turf`/Mantine/React için ayrı, önbelleklenebilir chunk'lar. Geliştirme sunucusunda `/proxy/afad` ve `/proxy/overpass` CORS proxy'leri tanımlıdır (yalnızca `vite dev`; üretimde eşdeğer bir sunucu tarafı proxy gerekir).
- **Test** (`vitest.config.ts`): Node ortamı (jsdom yok — tüm testler saf/hesaplama fonksiyonları üzerinedir: puanlama, sınıflandırma, sensör füzyonu, bench istatistikleri, analiz çekirdekleri, imar satır hazırlama, nüfus yoğunluğu, karşılaştırma mantığı). `window`'a bağlanan çizim oturumu için testte asgari bir kabuk tanımlanır. Bu belgenin yazıldığı anda **241 test, 19 dosyada, tümü geçiyor**.
- **Etiket testleri**: `layers/imarLabels.test.ts`, MapLibre etiket ifadelerini `@maplibre/maplibre-gl-style-spec` ile gerçek stil şeması üzerinden derleyip değerlendirir — haritada görünecek metnin birebir aynısı doğrulanır. Bozuk ifade ya da yarım ek çalışma zamanında değil, CI'da yakalanır.
- **CI** (`.github/workflows/ci.yml`): `main`'e push/PR'da sırasıyla `npm ci` → `npm run typecheck` → `npm run test` → `npm run build`.
- **TypeScript**: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters`, `verbatimModuleSyntax`.

## 22. Ortam Değişkenleri

| Değişken | Zorunlu mu? | Amaç |
|---|---|---|
| `VITE_SUPABASE_URL` | Hayır (ikisi birlikte) | Supabase proje URL'i — boşsa "salt-kamu" mod |
| `VITE_SUPABASE_ANON_KEY` | Hayır (ikisi birlikte) | Supabase anon genel anahtarı |
| `VITE_MAPILLARY_TOKEN` | Hayır | Panorama aracı için Mapillary erişim jetonu — yoksa araç bilgilendirici bir uyarı gösterip devre dışı kalır |
| `VITE_ORS_API_KEY` | Hayır | Rezerve edilmiş (rota/yönlendirme servisi için) — bu taramada hiçbir dosyada tüketildiği görülmedi |
| `SUPABASE_SERVICE_ROLE_KEY` | Yalnızca `npm run admin:create` için | Yönetici/personel hesabı açan betiğin kullandığı gizli anahtar. `VITE_` öneki **taşımaz**, bu yüzden tarayıcı paketine sızmaz. Rol JWT'de `app_metadata.rol` olarak taşınır ve bu alanı yalnızca service_role yazabilir — anon anahtarla açılan hesap `public` rolünde kalır. `.env` zaten `.gitignore`'dadır. |

### Yönetici hesabı açma

```bash
# .env'e SUPABASE_SERVICE_ROLE_KEY=... ekleyin (Supabase panosu → Project Settings → API → service_role)
npm run admin:create -- --email=ad@kurum.gov.tr --password="en-az-12-karakter" --rol=yonetici
```

`scripts/create-admin.ts` tekrar çalıştırılabilir: hesap varsa parolasını ve rolünü günceller, yoksa oluşturur. `--rol` yalnızca `personel` veya `yonetici` alır.

## 23. Genişletme Rehberleri

**Yeni bir katman eklemek:**
1. En sık durum — OSM anlık görüntüsünden bir tema: `layers/kentHizmetleri.ts`'teki `SPECS` dizisine bir nesne ekle. Sıfır yeni dosya.
2. Canlı Supabase tablosundan: `layers/kurumsal.ts`'teki `SPECS` dizisine ekle (+ `data/devDemoData.ts`'e demo veri, önerilir).
3. DEM türevi raster: yeni bir `createGridLayer({...})` dosyası + `layers/index.ts`'e bir satır.
4. Bütünüyle özel (vektör döşeme, elle GeoJSON mantığı): `LayerModule`'ü doğrudan uygulayan yeni bir dosya + `layers/index.ts`'e ekleme.

**Yeni bir araç eklemek**: `ToolModule`'ü uygulayan bir bileşen dosyası yaz, `tools/index.ts`'teki diziye ekle, `ToolDock.tsx`'teki `ICONS` haritasına bir ikon ekle.

**Yeni bir analiz eklemek**: Gerekiyorsa `analysis/core/yeniSey.ts`'e saf algoritmayı yaz; `analysis/yeniSey.ts`'te veri çekip `AnalysisModule` olarak sarmalayan `run()` fonksiyonunu yaz; `analysis/index.ts`'teki diziye ekle. Form üretimi, çalıştırma, harita çizimi ve sonuç render'ı zaten jeneriktir — başka hiçbir dosya değişmez.

Her üç durumda da `registerLayer`/`registerTool`/`registerAnalysis`, aynı id iki farklı nesneyle kayıt edilmeye çalışılırsa **açılışta hata fırlatır** — tek gerçek koruma budur.

## 24. Bilinen Sınırlamalar ve Teknik Notlar

- `osmFeatureLayer.ts` ve `supabaseLayer.ts`, neredeyse özdeş boyama/renklendirme kodunu (`colorExpression`/`paintFor`) tekrarlar — ortak bir yardımcıya çıkarılabilir, ancak veri çekme/hata anlambilimi yeterince farklı olduğu için ayrı tutulmuş.
- `LayerModule.themable` alanı tipte tanımlı ama hiçbir katman tarafından doldurulmuyor — kullanılmayan bir genişletme noktası.
- `LayerGroup` birleşiminde `demografi` tanımlı ama şu anda hiçbir katman tarafından kullanılmıyor.
- `analysis/core/uavt.ts`, 7 analizden biri **değildir** — Numarataj aracıyla paylaşılan bir adresleme yardımcı modülüdür; dokümantasyon/rapor sayımlarında 8. analiz olarak karıştırılmamalıdır.
- Üretim ortamında `/proxy/afad` ve `/proxy/overpass` için `vite dev`'deki proxy'ye eşdeğer bir sunucu tarafı çözüm gerekir (Vercel/Netlify yönlendirme kuralı veya ayrı bir fonksiyon) — bu depoda üretime özel bir proxy implementasyonu bulunmamaktadır.
- `VITE_ORS_API_KEY` ortam değişkeni tanımlı ama kod tabanında hiçbir yerde tüketilmiyor — muhtemelen planlanan ama henüz uygulanmamış bir rotalama özelliği için ayrılmış.
- **Mahalle nüfusu tahminidir.** Mahalle bazlı gerçek nüfus açık veride yayımlanmadığı için `mahalle-nufus.json` türetilmiş bir seed'dir (bkz. [§15](#15-veri-alım-hattı-ingest-pipeline)). OSM bina kapsamı ilçe genelinde eşit değildir ve taban alanı nüfus için zayıf bir vekildir; havalimanı ve sanayi çevresindeki mahallelerde belirgin sapma vardır. Gerçek TÜİK verisi **Mahalle bilgileri** aracıyla ya da **Veri içe aktar** ile girilene kadar karne sayfası bu durumu üst sırada uyarı olarak gösterir. Deprem, erişim, hizmet ve altyapı puanları bu tahminden etkilenmez.
- Mahalle sınırları Voronoi türevi olduğundan yüzölçümü ve dolayısıyla yoğunluk da yaklaşıktır; `mahalle-sinir` katmanı resmî olmayan sınırları kesikli çizgiyle ayırır.
- İmar tesisi geometrisi yalnızca `Polygon`'dur (nokta desteklenmez) — "şu kadar alan alacak" ifadesi alan gerektirir ve `alan_m2` geometriden hesaplanabilir. Nokta gerekirse sütun `geometry(Geometry,4326)`'ya genişletilmelidir.
- Tesis üst lekenin dışına taşarsa uyarıyla kaydedilir, **tamamen** dışarıdaysa reddedilir. MultiPolygon leke parçalarına ayrılıp tek tek denenir; turf'ün `booleanWithin`'i kapsayıcı olarak MultiPolygon'u güvenilir biçimde ele almıyor.
- Yazma sonrası katman tazeleme (`appStore.dataVersion`) tüm kurumsal katmanları söküp yeniden kurar. Tek seferlik bir işlem olduğu için kabul edilebilir; katman başına seçici tazeleme henüz yok.
