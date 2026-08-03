// Mahalle nüfusu için BAŞLANGIÇ (seed) verisi üretir.
//
// Neden türetiyoruz: TÜİK ADNKS mahalle nüfusunu açık API ile sunmuyor, İBB açık verisindeki
// nüfus setlerinin hepsi ilçe kırılımlı. Gerçek veri gelene kadar karşılaştırma ekranının
// boş kalmaması için ilçe toplamı, mahallelerin OSM bina taban alanına göre dağıtılır.
//
// Bu bir TAHMİNDİR. Üretilen her kayıt `tahmini: true` taşır ve arayüzde böyle etiketlenir.
// Gerçek TÜİK tablosu geldiğinde "Mahalle bilgileri" paneli ya da "Veri içe aktar" ile
// üzerine yazılır; Supabase'deki değer daima seed'in önüne geçer.

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { area, bbox, booleanPointInPolygon, centroid } from '@turf/turf'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'

// TÜİK ADNKS 2023 Arnavutköy ilçe nüfusu. Yeni yıl verisi çıktığında burayı güncelleyip
// `npm run data:nufus` komutunu tekrar çalıştırın.
const ILCE_NUFUS = 335_000
const ILCE_NUFUS_YIL = 2023

// TÜİK 2023 İstanbul ortalama hane halkı büyüklüğü 3,1; çeper ilçelerde hane biraz daha kalabalık.
const HANE_BUYUKLUGU = 3.4

interface MahalleNufus {
  uavt_kod: string
  ad: string
  nufus: number
  hane: number
  alan_km2: number
  yogunluk_kisi_km2: number
  tahmini: boolean
  veri_yili: number
  kaynak: string
}

interface Cikti {
  uretim: string
  ilce_nufus: number
  ilce_nufus_yil: number
  yontem: string
  kayitlar: MahalleNufus[]
}

function oku<T>(dosya: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), dosya), 'utf8')) as T
}

type Alan = Feature<Polygon | MultiPolygon>

// İnsan oturmayan yapılar hariç: havalimanı çevresindeki tek bir hangar ya da sera,
// kırsal mahalleyi yanlışlıkla ilçenin en kalabalık yeri gibi gösteriyordu.
const KONUT_DISI = new Set([
  'industrial',
  'warehouse',
  'hangar',
  'depot',
  'greenhouse',
  'garages',
  'roof',
  'shed',
  'bunker',
  'dam',
  'tower',
  'construction',
  'train_station',
  'no',
])

// Kat sayısı bilinmediği için tip başına kaba çarpan; apartman aynı tabandan daha çok kişi barındırır.
const KAT_CARPANI: Record<string, number> = {
  apartments: 4,
  residential: 2,
  house: 1,
  yes: 1.5,
}

/** Tek bir devasa yapı mahalleyi domine etmesin: konut taban alanı üst sınırı (m²). */
const TABAN_UST_SINIRI = 2_000

/** Bina taban alanı, bina sayısından daha iyi bir yoğunluk vekili: köy evi ile apartman aynı sayılmaz. */
function binaAgirliklari(
  mahalleler: Alan[],
  binalar: Feature[],
): Map<string, number> {
  const kutular = mahalleler.map((mahalle) => ({
    uavt: String(mahalle.properties?.['uavt_kod'] ?? ''),
    kutu: bbox(mahalle),
    mahalle,
  }))
  const agirlik = new Map<string, number>()
  for (const { uavt } of kutular) agirlik.set(uavt, 0)

  for (const bina of binalar) {
    if (bina.geometry.type !== 'Polygon' && bina.geometry.type !== 'MultiPolygon') continue
    const tur = String(bina.properties?.['building'] ?? 'yes')
    if (KONUT_DISI.has(tur)) continue

    const merkez = centroid(bina)
    const [lng, lat] = merkez.geometry.coordinates as [number, number]
    const tabanAlani = area(bina)
    if (!Number.isFinite(tabanAlani) || tabanAlani <= 0) continue

    const pay = Math.min(tabanAlani, TABAN_UST_SINIRI) * (KAT_CARPANI[tur] ?? 1)

    for (const { uavt, kutu, mahalle } of kutular) {
      const [bati, guney, dogu, kuzey] = kutu
      if (lng < bati || lng > dogu || lat < guney || lat > kuzey) continue
      if (!booleanPointInPolygon(merkez, mahalle)) continue
      agirlik.set(uavt, (agirlik.get(uavt) ?? 0) + pay)
      break
    }
  }

  return agirlik
}

function main(): void {
  const mahalle = oku<FeatureCollection<Polygon | MultiPolygon>>('public/data/mahalle.geojson')
  const snapshot = oku<FeatureCollection>('public/data/osm-snapshot.geojson')
  const binalar = snapshot.features.filter((feature) => feature.properties?.['tema'] === 'bina')

  const mahalleler = mahalle.features as Alan[]
  const agirlik = binaAgirliklari(mahalleler, binalar)
  const toplamAgirlik = [...agirlik.values()].reduce((sum, value) => sum + value, 0)

  if (toplamAgirlik <= 0) {
    throw new Error('Hiçbir bina mahalle sınırına düşmedi; osm-snapshot.geojson eksik olabilir.')
  }

  // Binası hiç olmayan mahalle de sıfır nüfuslu gösterilmemeli: en az bir taban pay verilir.
  const TABAN_PAY = 0.002
  const paylar = mahalleler.map((feature) => {
    const uavt = String(feature.properties?.['uavt_kod'] ?? '')
    const ham = (agirlik.get(uavt) ?? 0) / toplamAgirlik
    return { uavt, feature, pay: Math.max(ham, TABAN_PAY) }
  })
  const payToplami = paylar.reduce((sum, item) => sum + item.pay, 0)

  const kayitlar: MahalleNufus[] = paylar.map(({ uavt, feature, pay }) => {
    const nufus = Math.round((pay / payToplami) * ILCE_NUFUS)
    const alanKm2 = Number(feature.properties?.['alan_km2'] ?? 0) || area(feature) / 1_000_000
    return {
      uavt_kod: uavt,
      ad: String(feature.properties?.['ad'] ?? uavt),
      nufus,
      hane: Math.round(nufus / HANE_BUYUKLUGU),
      alan_km2: Number(alanKm2.toFixed(3)),
      yogunluk_kisi_km2: alanKm2 > 0 ? Math.round(nufus / alanKm2) : 0,
      tahmini: true,
      veri_yili: ILCE_NUFUS_YIL,
      kaynak: 'Tahmini · ilçe nüfusu OSM bina taban alanına göre dağıtıldı',
    }
  })

  kayitlar.sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))

  const cikti: Cikti = {
    uretim: new Date().toISOString(),
    ilce_nufus: ILCE_NUFUS,
    ilce_nufus_yil: ILCE_NUFUS_YIL,
    yontem:
      'TÜİK ADNKS ilçe nüfusu, mahallelerin OSM bina taban alanı payına göre dağıtıldı. ' +
      'Mahalle bazlı gerçek nüfus açık veride bulunmadığı için tahmindir.',
    kayitlar,
  }

  writeFileSync(
    resolve(process.cwd(), 'public/data/mahalle-nufus.json'),
    `${JSON.stringify(cikti, null, 2)}\n`,
    'utf8',
  )

  const toplam = kayitlar.reduce((sum, item) => sum + item.nufus, 0)
  console.log(`  ${kayitlar.length} mahalle · toplam ${toplam.toLocaleString('tr-TR')} kişi`)
  const sirali = [...kayitlar].sort((a, b) => b.yogunluk_kisi_km2 - a.yogunluk_kisi_km2)
  console.log(`  en yoğun : ${sirali[0]?.ad} · ${sirali[0]?.yogunluk_kisi_km2} kişi/km²`)
  console.log(
    `  en seyrek: ${sirali[sirali.length - 1]?.ad} · ${sirali[sirali.length - 1]?.yogunluk_kisi_km2} kişi/km²`,
  )
}

main()
