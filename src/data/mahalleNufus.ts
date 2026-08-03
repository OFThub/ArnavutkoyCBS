// Mahalle nüfus/yüzölçümü verisi: yerel seed dosyası taban, Supabase'deki gerçek kayıt üstün.
// Seed tahminidir (bkz. scripts/ingest/10-mahalle-nufus.ts); personel gerçek TÜİK değerini
// girdiği anda o mahalle için tahmin devre dışı kalır ve `tahmini: false` olur.

import { loadDataset } from '../core/dataset'
import { haneBasinaKisi, yogunluk } from '../core/nufus'
import { supabase } from '../lib/supabase'

export interface MahalleNufus {
  uavt: string
  ad: string
  nufus: number | null
  hane: number | null
  alanKm2: number | null
  yogunlukKisiKm2: number | null
  haneBasinaKisi: number | null
  tahmini: boolean
  veriYili: number | null
  kaynak: string
}

interface SeedKayit {
  uavt_kod: string
  ad: string
  nufus: number
  hane: number
  alan_km2: number
  tahmini: boolean
  veri_yili: number
  kaynak: string
}

interface SeedDosya {
  ilce_nufus?: number
  ilce_nufus_yil?: number
  yontem?: string
  kayitlar?: SeedKayit[]
}

interface SunucuKayit {
  uavt_kod: string
  ad: string | null
  nufus: number | null
  hane: number | null
  alan_km2: number | null
  veri_yili?: number | null
  nufus_kaynak?: string | null
}

export interface MahalleNufusSeti {
  kayitlar: Map<string, MahalleNufus>
  ilceNufus: number | null
  ilceAlanKm2: number | null
  ilceYogunlugu: number | null
  /** En az bir mahalle hâlâ tahmini değer taşıyorsa arayüz bunu belirtmeli. */
  tahminIceriyor: boolean
  yontem: string
}

function sayi(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Sunucudaki gerçek kayıtlar. `mahalle` tablosu kamuya açık okunabilir (RLS `mahalle_okuma_herkes`),
 * bu yüzden karne sayfası oturum açmadan da gerçek veriyi görebilir.
 * Sunucu yoksa ya da sorgu düşerse seed ile devam edilir — kamu sayfası bu yüzden hata vermemeli.
 */
async function sunucudanOku(): Promise<Map<string, SunucuKayit>> {
  const bos = new Map<string, SunucuKayit>()
  if (!supabase) return bos

  const { data, error } = await supabase
    .from('mahalle')
    .select('uavt_kod, ad, nufus, hane, alan_km2, veri_yili, nufus_kaynak')
  if (error || !data) return bos

  const sonuc = new Map<string, SunucuKayit>()
  for (const row of data as unknown as SunucuKayit[]) {
    sonuc.set(String(row.uavt_kod), row)
  }
  return sonuc
}

let setPromise: Promise<MahalleNufusSeti> | null = null

export function loadMahalleNufus(): Promise<MahalleNufusSeti> {
  setPromise ??= (async () => {
    const [seed, sunucu] = await Promise.all([
      loadDataset<SeedDosya>('mahalleNufus'),
      sunucudanOku(),
    ])

    const kayitlar = new Map<string, MahalleNufus>()
    let tahminIceriyor = false

    for (const satir of seed.kayitlar ?? []) {
      const uzak = sunucu.get(satir.uavt_kod)
      const gercekNufus = sayi(uzak?.nufus)
      const gercekHane = sayi(uzak?.hane)
      // Sunucuda nüfus varsa tahmin tamamen devre dışı; hane sunucuda yoksa boş bırakılır,
      // tahmini hane ile gerçek nüfusu karıştırmak yanıltıcı olurdu.
      const gercek = gercekNufus !== null

      const nufus = gercek ? gercekNufus : satir.nufus
      const hane = gercek ? gercekHane : satir.hane
      const alanKm2 = sayi(uzak?.alan_km2) ?? sayi(satir.alan_km2)
      if (!gercek) tahminIceriyor = true

      kayitlar.set(satir.uavt_kod, {
        uavt: satir.uavt_kod,
        ad: uzak?.ad ?? satir.ad,
        nufus,
        hane,
        alanKm2,
        yogunlukKisiKm2: yogunluk(nufus, alanKm2),
        haneBasinaKisi: haneBasinaKisi(nufus, hane),
        tahmini: !gercek,
        veriYili: gercek ? (sayi(uzak?.veri_yili) ?? null) : satir.veri_yili,
        kaynak: gercek ? (uzak?.nufus_kaynak ?? 'Belediye kaydı') : satir.kaynak,
      })
    }

    let ilceNufus = 0
    let ilceAlan = 0
    for (const kayit of kayitlar.values()) {
      ilceNufus += kayit.nufus ?? 0
      ilceAlan += kayit.alanKm2 ?? 0
    }

    return {
      kayitlar,
      ilceNufus: ilceNufus > 0 ? ilceNufus : null,
      ilceAlanKm2: ilceAlan > 0 ? Number(ilceAlan.toFixed(2)) : null,
      ilceYogunlugu: yogunluk(ilceNufus, ilceAlan),
      tahminIceriyor,
      yontem: seed.yontem ?? '',
    }
  })().catch((error: unknown) => {
    setPromise = null
    throw error
  })

  return setPromise
}
