// Mahalle karnesi: taşınmadan önce bakılan göstergeleri mevcut veri setlerinden kırılımlı puana çevirir.
// Tek opak skor üretilmez — her alt başlık kendi ham değeriyle birlikte gösterilir.

import * as turf from '@turf/turf'
import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson'
import { loadDataset } from '../core/dataset'
import { snapshotTheme } from '../data/osmSnapshot'
import { toPoint } from '../layers/osmFeatureLayer'
import { loadMahalleThematic } from '../theming/mahalleData'

// ponytail: eğim ve sel alt puanı yok — DEM döşemesi indirmek kamu sayfasını yavaşlatır.
// Gerekirse TerrainTool'daki DEM yolu buraya bağlanır.

export interface KarneBolumu {
  puan: number
  etiket: string
}

export interface MahalleKarne {
  uavt: string
  ad: string
  merkez: [number, number]
  deprem: KarneBolumu & {
    agirHasarliBina: number
    toplamHasarliBina: number
    canKaybi: number
    geciciBarinma: number
  }
  erisim: KarneBolumu & {
    hastaneM: number | null
    eczaneM: number | null
    okulM: number | null
    parkM: number | null
    durakM: number | null
  }
  hizmet: KarneBolumu & {
    park: number
    kablosuzAg: number
    geriDonusum: number
    pazar: number
    durak: number
  }
  altyapi: KarneBolumu & {
    dogalgazHasari: number
    icmeSuyuHasari: number
    atikSuHasari: number
  }
  genelPuan: number
}

/** Küçük değer iyi: `iyi` değerinde 100, `kotu` değerinde 0. */
export function tersPuan(deger: number, iyi: number, kotu: number): number {
  if (!Number.isFinite(deger)) return 0
  if (deger <= iyi) return 100
  if (deger >= kotu) return 0
  return Math.round(((kotu - deger) / (kotu - iyi)) * 100)
}

/** Büyük değer iyi: `hedef` ve üzerinde 100. */
export function duzPuan(deger: number, hedef: number): number {
  if (!Number.isFinite(deger) || deger <= 0) return 0
  return Math.round(Math.min(1, deger / hedef) * 100)
}

export function puanEtiketi(puan: number): string {
  if (puan >= 80) return 'Çok iyi'
  if (puan >= 60) return 'İyi'
  if (puan >= 40) return 'Orta'
  if (puan >= 20) return 'Zayıf'
  return 'Çok zayıf'
}

/** Merkeze en yakın noktanın metre cinsinden uzaklığı; hiç nokta yoksa null. */
export function enYakinMesafe(merkez: [number, number], noktalar: Feature[]): number | null {
  let enYakin: number | null = null
  const from = turf.point(merkez)

  for (const nokta of noktalar) {
    if (nokta.geometry.type !== 'Point') continue
    const mesafe = turf.distance(from, nokta as Feature<Point>, { units: 'meters' })
    if (enYakin === null || mesafe < enYakin) enYakin = mesafe
  }

  return enYakin
}

const SAGLIK = new Set(['hospital', 'clinic', 'doctors'])
const EGITIM = new Set(['school', 'kindergarten', 'college'])

function tagIs(feature: Feature, key: string, values: Set<string> | string[]): boolean {
  const value = feature.properties?.[key]
  if (typeof value !== 'string') return false
  return Array.isArray(values) ? values.includes(value) : values.has(value)
}

function icindekiler(alan: Feature<Polygon | MultiPolygon>, noktalar: Feature[]): Feature[] {
  return noktalar.filter(
    (nokta) => nokta.geometry.type === 'Point' && turf.booleanPointInPolygon(nokta as Feature<Point>, alan),
  )
}

export async function loadKarneler(): Promise<MahalleKarne[]> {
  const [mahalleler, hizmet, poi, saglik] = await Promise.all([
    loadMahalleThematic(),
    snapshotTheme('hizmet'),
    snapshotTheme('poi'),
    loadDataset<FeatureCollection>('saglikKurumu').catch(
      () => ({ type: 'FeatureCollection', features: [] }) as FeatureCollection,
    ),
  ])

  // OSM'de aynı nesne düğüm veya alan olabilir; mesafe ve alan-içi sayım için hepsi noktaya indirilir.
  const sec = (
    features: Feature[],
    key: string,
    values: Set<string> | string[],
  ): Feature[] => features.filter((f) => tagIs(f, key, values)).map(toPoint)

  const hastaneler = [...sec(poi.features, 'amenity', SAGLIK), ...saglik.features.map(toPoint)]
  const eczaneler = sec(poi.features, 'amenity', ['pharmacy'])
  const okullar = sec(poi.features, 'amenity', EGITIM)
  const parkNoktalari = sec(hizmet.features, 'leisure', ['park', 'garden', 'playground'])
  const duraklar = sec(hizmet.features, 'highway', ['bus_stop'])
  const kablosuz = sec(hizmet.features, 'internet_access', ['wlan'])
  const geriDonusum = sec(hizmet.features, 'amenity', ['recycling'])
  const pazarlar = sec(hizmet.features, 'amenity', ['marketplace'])

  return mahalleler.features.map((mahalle) => {
    const props = mahalle.properties ?? {}
    const merkez = turf.centroid(mahalle as Feature<never>).geometry.coordinates as [number, number]

    const agir =
      Number(props['cok_agir_hasarli_bina_sayisi'] ?? 0) +
      Number(props['agir_hasarli_bina_sayisi'] ?? 0)
    const toplamHasar =
      agir +
      Number(props['orta_hasarli_bina_sayisi'] ?? 0) +
      Number(props['hafif_hasarli_bina_sayisi'] ?? 0)
    const canKaybi = Number(props['can_kaybi_sayisi'] ?? 0)
    const barinma = Number(props['gecici_barinma'] ?? 0)

    const hastaneM = enYakinMesafe(merkez, hastaneler)
    const eczaneM = enYakinMesafe(merkez, eczaneler)
    const okulM = enYakinMesafe(merkez, okullar)
    const parkM = enYakinMesafe(merkez, parkNoktalari)
    const durakM = enYakinMesafe(merkez, duraklar)

    const sayim = {
      park: icindekiler(mahalle, parkNoktalari).length,
      kablosuzAg: icindekiler(mahalle, kablosuz).length,
      geriDonusum: icindekiler(mahalle, geriDonusum).length,
      pazar: icindekiler(mahalle, pazarlar).length,
      durak: icindekiler(mahalle, duraklar).length,
    }

    const dogalgaz = Number(props['dogalgaz_boru_hasari'] ?? 0)
    const icmeSuyu = Number(props['icme_suyu_boru_hasari'] ?? 0)
    const atikSu = Number(props['atik_su_boru_hasari'] ?? 0)

    // Eşikler: ağır hasar 50 bina üzeri kritik, can kaybı 10 üzeri kritik.
    const depremPuan = Math.round(
      (tersPuan(agir, 0, 200) + tersPuan(canKaybi, 0, 20) + tersPuan(barinma, 0, 2000)) / 3,
    )

    // Eşikler: 500 m yürüme mesafesi iyi, 3 km uzak sayılır.
    const erisimPuan = Math.round(
      ([hastaneM, eczaneM, okulM, parkM, durakM] as (number | null)[])
        .map((m) => (m === null ? 0 : tersPuan(m, 500, 3000)))
        .reduce((sum, value) => sum + value, 0) / 5,
    )

    const hizmetPuan = Math.round(
      (duzPuan(sayim.park, 5) +
        duzPuan(sayim.kablosuzAg, 3) +
        duzPuan(sayim.geriDonusum, 5) +
        duzPuan(sayim.pazar, 1) +
        duzPuan(sayim.durak, 10)) /
        5,
    )

    const altyapiPuan = Math.round(
      (tersPuan(dogalgaz, 0, 30) + tersPuan(icmeSuyu, 0, 30) + tersPuan(atikSu, 0, 30)) / 3,
    )

    const genelPuan = Math.round((depremPuan + erisimPuan + hizmetPuan + altyapiPuan) / 4)

    return {
      uavt: String(props['uavt_kod'] ?? ''),
      ad: String(props['ad'] ?? ''),
      merkez,
      deprem: {
        puan: depremPuan,
        etiket: puanEtiketi(depremPuan),
        agirHasarliBina: agir,
        toplamHasarliBina: toplamHasar,
        canKaybi,
        geciciBarinma: barinma,
      },
      erisim: {
        puan: erisimPuan,
        etiket: puanEtiketi(erisimPuan),
        hastaneM,
        eczaneM,
        okulM,
        parkM,
        durakM,
      },
      hizmet: { puan: hizmetPuan, etiket: puanEtiketi(hizmetPuan), ...sayim },
      altyapi: {
        puan: altyapiPuan,
        etiket: puanEtiketi(altyapiPuan),
        dogalgazHasari: dogalgaz,
        icmeSuyuHasari: icmeSuyu,
        atikSuHasari: atikSu,
      },
      genelPuan,
    }
  })
}
