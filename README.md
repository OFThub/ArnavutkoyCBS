# Arnavutköy CBS

Arnavutköy Belediyesi coğrafi bilgi sistemi web uygulaması.

## Gereksinimler

- Node.js 20 veya üzeri
- [Supabase CLI](https://supabase.com/docs/guides/cli) (veritabanı migration'ları için)

## Kurulum

```bash
npm install
cp .env.example .env
```

`.env` içindeki `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` değerlerini Supabase proje ayarlarından doldurun. Bu değerler boşken uygulama salt-kamu modunda çalışır.

## Veri hattı

Tüm resmî veriyi indirip normalize eder ve `public/data/` altına yazar:

```bash
npm run data:build            # tüm adımlar
npm run data:build -- --fresh # ham indirme önbelleğini atlayarak yeniden çek
```

Tek tek çalıştırmak için:

```bash
npm run data:district   # ilçe sınırı (Nominatim)
npm run data:deprem     # İBB deprem senaryosu (39 mahalle + UAVT)
npm run data:mahalle    # mahalle sınırı (geokod → Voronoi, YAKLAŞIK)
npm run data:acilyol    # İBB acil ulaşım yolları
npm run data:saglik     # İBB sağlık kurumları
npm run data:osm        # Overpass anlık görüntüsü
```

`data:mahalle` adımı `data:deprem` çıktısına, tüm mekânsal filtreler `data:district` çıktısına bağlıdır.

## Veritabanı

```bash
npx supabase link --project-ref <proje-ref>
npm run db:push     # migration'ları uygula
npm run db:reset    # yerel veritabanını sıfırla
```

## Geliştirme

```bash
npm run dev         # http://localhost:5173
npm run build       # tsc -b && vite build
npm run preview     # üretim çıktısını yerelde sun
npm run typecheck   # yalnızca tip kontrolü
npm run test        # birim testleri
npm run test:watch  # izleme modunda testler
```
