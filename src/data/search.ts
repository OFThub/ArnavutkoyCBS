// Yerel arama indeksi: mahalle adları ve OSM anlık görüntüsündeki adlandırılmış yerler.
// Ağ isteği yok — indeks zaten yüklü veri setlerinden kurulur, çevrimdışı da çalışır.

import * as turf from '@turf/turf'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { loadDataset } from '../core/dataset'
import { snapshotTheme } from '../data/osmSnapshot'

export interface SearchHit {
  id: string
  ad: string
  tur: string
  merkez: [number, number]
}

const TUR_ETIKETI: Record<string, string> = {
  hospital: 'Hastane',
  clinic: 'Poliklinik',
  doctors: 'Aile hekimi',
  pharmacy: 'Eczane',
  school: 'Okul',
  kindergarten: 'Anaokulu',
  college: 'Yüksekokul',
  police: 'Polis',
  fire_station: 'İtfaiye',
  townhall: 'Belediye',
  place_of_worship: 'İbadet yeri',
  marketplace: 'Semt pazarı',
  recycling: 'Geri dönüşüm',
  park: 'Park',
  bus_stop: 'Otobüs durağı',
}

/** Türkçe'ye duyarlı normalleştirme: "İSTASYON" ile "istasyon" eşleşmeli. */
export function normalize(value: string): string {
  return value
    .replace(/I/g, 'ı')
    .replace(/İ/g, 'i')
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

export function score(ad: string, sorgu: string): number {
  const a = normalize(ad)
  const q = normalize(sorgu)
  if (q.length === 0) return 0
  if (a === q) return 3
  if (a.startsWith(q)) return 2
  if (a.includes(q)) return 1
  return 0
}

export function rank(hits: SearchHit[], sorgu: string, limit = 12): SearchHit[] {
  return hits
    .map((hit) => ({ hit, puan: score(hit.ad, sorgu) }))
    .filter((item) => item.puan > 0)
    .sort((a, b) => b.puan - a.puan || a.hit.ad.localeCompare(b.hit.ad, 'tr'))
    .slice(0, limit)
    .map((item) => item.hit)
}

function turOf(props: Record<string, unknown> | null): string {
  for (const key of ['amenity', 'leisure', 'highway', 'shop']) {
    const value = props?.[key]
    if (typeof value === 'string') return TUR_ETIKETI[value] ?? value
  }
  return 'Yer'
}

function centerOf(feature: Feature): [number, number] | null {
  try {
    return turf.centroid(feature as Feature<never>).geometry.coordinates as [number, number]
  } catch {
    return null
  }
}

let indexPromise: Promise<SearchHit[]> | null = null

export function loadSearchIndex(): Promise<SearchHit[]> {
  indexPromise ??= (async () => {
    const [mahalle, poi, hizmet] = await Promise.all([
      loadDataset<FeatureCollection<Polygon | MultiPolygon>>('mahalle'),
      snapshotTheme('poi'),
      snapshotTheme('hizmet'),
    ])

    const hits: SearchHit[] = []

    for (const feature of mahalle.features) {
      const merkez = centerOf(feature)
      const ad = String(feature.properties?.['ad'] ?? '')
      if (!merkez || ad.length === 0) continue
      hits.push({
        id: `mahalle:${String(feature.properties?.['uavt_kod'] ?? ad)}`,
        ad,
        tur: 'Mahalle',
        merkez,
      })
    }

    for (const feature of [...poi.features, ...hizmet.features]) {
      const props = feature.properties
      const ad = props?.['name:tr'] ?? props?.['name']
      if (typeof ad !== 'string' || ad.length === 0) continue
      const merkez = centerOf(feature)
      if (!merkez) continue
      hits.push({
        id: `osm:${String(props?.['osm_type'])}/${String(props?.['osm_id'])}`,
        ad,
        tur: turOf(props),
        merkez,
      })
    }

    return hits
  })().catch((error: unknown) => {
    indexPromise = null
    throw error
  })

  return indexPromise
}
