# Arnavutköy CBS

Arnavutköy Belediyesi coğrafi bilgi sistemi web uygulaması.

İki sayfa sunar:

- `/` — **CBS tezgâhı.** Tam ekran harita, sol enstrüman rayı, katman/araç/analiz panelleri.
  Rol tabanlı: ziyaretçi kamu katmanlarını, personel mülkiyet ve imar katmanlarını görür.
- `/rehber` — **Mahalle karnesi.** Vatandaşa dönük kamu sayfası: bir mahalleye taşınmadan
  önce bakılan göstergeler (deprem senaryosu, günlük ihtiyaçlara mesafe, mahalledeki
  hizmetler, altyapı hasar beklentisi).

Uygulama tek sayfalık (SPA) olduğu için `/rehber` adresinin doğrudan açılabilmesi sunucu
tarafında bir geri düşüş kuralı ister. Netlify için `public/_redirects`, Vercel için
`vercel.json` deposu içinde hazır. nginx kullanıyorsanız:
`try_files $uri $uri/ /index.html;`

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
npm run data:deprem     # İBB deprem senaryosu (38 mahalle + UAVT)
npm run data:mahalle    # mahalle sınırı (geokod → Voronoi, YAKLAŞIK)
npm run data:acilyol    # İBB acil ulaşım yolları
npm run data:saglik     # İBB sağlık kurumları
npm run data:osm        # Overpass anlık görüntüsü (bina, yol, POI, kent hizmetleri, arazi kullanımı)
npm run data:ilceler    # komşu ilçe sınırları
npm run data:durak      # İETT otobüs durakları
npm run data:toplanma   # acil toplanma alanları
```

`data:mahalle` adımı `data:deprem` çıktısına, tüm mekânsal filtreler `data:district` çıktısına bağlıdır.
`data:durak` ve `data:toplanma` isteğe bağlıdır; CKAN veri seti çözülemezse hat devam eder
ve duraklar OSM anlık görüntüsündeki `highway=bus_stop` katmanından beslenir.

## Yazı tipleri

Arayüz yazı tipleri (Archivo, JetBrains Mono) `public/fonts/` altında kendi sunucumuzda
durur — PWA çevrimdışı çalışırken de metin doğru çizilsin diye çalışma anında Google
Fonts'a istek gitmez. Yeniden indirmek için:

```bash
npm run fonts
```

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
