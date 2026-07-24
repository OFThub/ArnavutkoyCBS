// Mahalle adlarını geokodlar, merkezlerden Voronoi üretir ve ilçeye kırparak YAKLAŞIK mahalle sınırı yazar.

import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson'
import * as turf from '@turf/turf'
import { fetchJson, politeDelay } from './lib/http'
import { cacheRaw, runAsScript, readOutput, writeOutput } from './lib/paths'
import { recordDataset } from './lib/manifest'
import { areaKm2, clipToDistrict, DISTRICT_BBOX, loadDistrictPolygon, pointInDistrict } from './lib/geo'
import { normalizeName } from './lib/normalize'
import { info, ok, step, warn } from './lib/log'
import type { DepremSenaryoDosyasi } from './02-ibb-deprem'

const NOMINATIM_DELAY_MS = 1100
const GEOMETRI_KAYNAK = 'yaklasik-voronoi'

interface NominatimSearchItem {
  lon: string
  lat: string
  display_name: string
}

async function geocodeMahalle(ad: string): Promise<[number, number] | null> {
  const query = `${ad} Mahallesi, Arnavutköy, İstanbul, Türkiye`
  const viewbox = DISTRICT_BBOX.join(',')
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=tr` +
    `&viewbox=${viewbox}&bounded=1&q=${encodeURIComponent(query)}`

  const cacheName = `geocode-${normalizeName(ad).replace(/[^a-z0-9]+/g, '-')}.json`
  const buffer = await cacheRaw(cacheName, async () => {
    await politeDelay(NOMINATIM_DELAY_MS)
    const items = await fetchJson<NominatimSearchItem[]>(url)
    return Buffer.from(JSON.stringify(items), 'utf8')
  })

  const items = JSON.parse(buffer.toString('utf8')) as NominatimSearchItem[]
  const first = items[0]
  if (!first) return null

  const lon = Number(first.lon)
  const lat = Number(first.lat)
  return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null
}

export async function run(): Promise<void> {
  step('03 · Mahalle sınırı (geokod → Voronoi → kırpma)')

  const senaryo = await readOutput<DepremSenaryoDosyasi>('deprem-senaryo.json')
  if (!senaryo || senaryo.kayitlar.length === 0) {
    throw new Error('deprem-senaryo.json yok — önce npm run data:deprem çalıştırın')
  }

  const district = await loadDistrictPolygon()

  const seeds: Feature<Point>[] = []
  const missing: string[] = []

  for (const kayit of senaryo.kayitlar) {
    const coord = await geocodeMahalle(kayit.mahalle_adi)
    if (!coord) {
      missing.push(kayit.mahalle_adi)
      continue
    }
    if (!pointInDistrict(district, coord[0], coord[1])) {
      warn(`${kayit.mahalle_adi}: geokod noktası ilçe dışında, yine de kullanılıyor`)
    }
    seeds.push(
      turf.point(coord, {
        uavt_kod: kayit.mahalle_koy_uavt,
        ad: kayit.mahalle_adi,
      }),
    )
  }

  info(`geokodlanan mahalle: ${seeds.length}/${senaryo.kayitlar.length}`)
  if (missing.length > 0) {
    warn(`geokodlanamayan: ${missing.join(', ')}`)
  }
  if (seeds.length < 3) {
    throw new Error('Voronoi için en az 3 merkez gerekiyor')
  }

  const cells = turf.voronoi(turf.featureCollection(seeds), { bbox: DISTRICT_BBOX })

  const features: Feature<Polygon | MultiPolygon>[] = []
  for (let i = 0; i < seeds.length; i += 1) {
    const seed = seeds[i]
    const cell = cells.features[i]
    if (!seed || !cell) {
      warn(`Voronoi hücresi üretilemedi: ${String(seeds[i]?.properties?.['ad'])}`)
      continue
    }

    const clipped = clipToDistrict(district, cell as Feature<Polygon>)
    if (!clipped) {
      warn(`İlçeye kırpılamadı: ${String(seed.properties?.['ad'])}`)
      continue
    }

    const coords = seed.geometry.coordinates as [number, number]
    clipped.properties = {
      uavt_kod: seed.properties?.['uavt_kod'],
      ad: seed.properties?.['ad'],
      merkez_lon: coords[0],
      merkez_lat: coords[1],
      alan_km2: areaKm2(clipped),
      geometri_kaynak: GEOMETRI_KAYNAK,
      yaklasik: true,
    }
    features.push(clipped)
  }

  const collection: FeatureCollection<Polygon | MultiPolygon> = {
    type: 'FeatureCollection',
    features,
  }

  const bytes = await writeOutput('mahalle.geojson', collection)
  await recordDataset('mahalle', {
    file: 'mahalle.geojson',
    count: features.length,
    source: 'Nominatim geokod + Voronoi (YAKLAŞIK SINIR)',
    bytes,
  })

  const toplamAlan = features.reduce(
    (sum, feature) => sum + Number(feature.properties?.['alan_km2'] ?? 0),
    0,
  )
  ok(`${features.length} mahalle poligonu yazıldı · toplam ${toplamAlan.toFixed(1)} km² · sınırlar YAKLAŞIK`)
}

await runAsScript(import.meta.url, run)
