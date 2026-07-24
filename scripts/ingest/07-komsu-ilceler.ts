// İstanbul ilçe sınırlarını indirir, Arnavutköy çevresinde iki komşuluk halkası hesaplar ve çalışma alanını yazar.

import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import * as turf from '@turf/turf'
import { fetchJson, politeDelay } from './lib/http'
import { cacheRaw, runAsScript, writeOutput } from './lib/paths'
import { recordDataset } from './lib/manifest'
import { info, ok, step, warn } from './lib/log'

const ISTANBUL_AREA = 3600223474
const ISTANBUL_RELATION = 223474
const ARNAVUTKOY_RELATION = 1766093
const RING_COUNT = 2
const SIMPLIFY_TOLERANCE = 0.0004
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

type AreaFeature = Feature<Polygon | MultiPolygon>

interface OverpassRelation {
  id: number
  tags?: Record<string, string>
}

interface NominatimItem {
  osm_id: number
  geojson?: Polygon | MultiPolygon
}

async function districtList(): Promise<{ id: number; ad: string }[]> {
  const query = `[out:json][timeout:180];
area(${ISTANBUL_AREA})->.il;
relation["admin_level"="6"]["boundary"="administrative"](area.il);
out tags;`

  const buffer = await cacheRaw('istanbul-ilceler.json', async () => {
    let lastError: unknown = null
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: new URLSearchParams({ data: query }),
        })
        if (!response.ok) throw new Error(`Overpass ${response.status}`)
        return Buffer.from(await response.arrayBuffer())
      } catch (error) {
        lastError = error
        warn(`Overpass uç noktası başarısız: ${endpoint}`)
        await politeDelay(2000)
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Overpass yanıt vermedi')
  })

  const parsed = JSON.parse(buffer.toString('utf8')) as { elements: OverpassRelation[] }
  return parsed.elements
    .map((element) => ({ id: element.id, ad: element.tags?.['name'] ?? '' }))
    .filter((item) => item.ad.length > 0)
}

async function provincePolygon(): Promise<AreaFeature> {
  const buffer = await cacheRaw('istanbul-il.json', async () => {
    await politeDelay(1100)
    const url = `https://nominatim.openstreetmap.org/lookup?osm_ids=R${ISTANBUL_RELATION}&format=json&polygon_geojson=1`
    return Buffer.from(JSON.stringify(await fetchJson<NominatimItem[]>(url)), 'utf8')
  })

  const geometry = (JSON.parse(buffer.toString('utf8')) as NominatimItem[])[0]?.geojson
  if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) {
    throw new Error('İstanbul il sınırı alınamadı')
  }
  return { type: 'Feature', properties: { ad: 'İstanbul' }, geometry }
}

async function districtPolygon(id: number, ad: string): Promise<AreaFeature | null> {
  const buffer = await cacheRaw(`ilce-${id}.json`, async () => {
    await politeDelay(1100)
    const url = `https://nominatim.openstreetmap.org/lookup?osm_ids=R${id}&format=json&polygon_geojson=1`
    const items = await fetchJson<NominatimItem[]>(url)
    return Buffer.from(JSON.stringify(items), 'utf8')
  })

  const items = JSON.parse(buffer.toString('utf8')) as NominatimItem[]
  const geometry = items[0]?.geojson
  if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) {
    warn(`${ad}: sınır geometrisi alınamadı`)
    return null
  }

  const feature: AreaFeature = {
    type: 'Feature',
    properties: { ad, osm_id: id },
    geometry,
  }
  return turf.simplify(feature, { tolerance: SIMPLIFY_TOLERANCE, highQuality: false })
}

function assignRings(features: AreaFeature[], seedIndex: number): number[] {
  const rings = features.map(() => -1)
  rings[seedIndex] = 0
  let frontier = [seedIndex]

  for (let ring = 1; ring <= RING_COUNT; ring += 1) {
    const next: number[] = []
    for (const current of frontier) {
      const source = features[current]
      if (!source) continue
      features.forEach((candidate, index) => {
        if (rings[index] !== -1) return
        if (!turf.booleanIntersects(source, candidate)) return
        rings[index] = ring
        next.push(index)
      })
    }
    frontier = next
  }

  return rings
}

export async function run(): Promise<void> {
  step('07 · Komşu ilçeler ve çalışma alanı')

  const list = await districtList()
  info(`İlçe adayı: ${list.length}`)

  const province = await provincePolygon()
  const features: AreaFeature[] = []
  const disariAtilan: string[] = []

  for (const item of list) {
    const polygon = await districtPolygon(item.id, item.ad)
    if (!polygon) continue
    if (!turf.booleanPointInPolygon(turf.pointOnFeature(polygon), province)) {
      disariAtilan.push(item.ad)
      continue
    }
    features.push(polygon)
  }

  if (disariAtilan.length > 0) info(`İstanbul dışı olduğu için elendi: ${disariAtilan.join(', ')}`)
  info(`Sınır geometrisi alınan İstanbul ilçesi: ${features.length}`)

  const seedIndex = features.findIndex((feature) => feature.properties?.['osm_id'] === ARNAVUTKOY_RELATION)
  if (seedIndex < 0) throw new Error('Arnavutköy sınırı ilçe listesinde bulunamadı')

  const rings = assignRings(features, seedIndex)
  const kept = features
    .map((feature, index) => ({ feature, ring: rings[index] ?? -1 }))
    .filter((item) => item.ring >= 0)
    .sort((a, b) => a.ring - b.ring)
    .map(({ feature, ring }) => ({
      ...feature,
      properties: { ...(feature.properties ?? {}), halka: ring } as Record<string, unknown>,
    }))

  for (let ring = 0; ring <= RING_COUNT; ring += 1) {
    const names = kept
      .filter((item) => item.properties['halka'] === ring)
      .map((item) => String(item.properties['ad']))
    info(`Halka ${ring} (${names.length}): ${names.join(', ')}`)
  }

  const collection: FeatureCollection = { type: 'FeatureCollection', features: kept }
  const bbox = turf.bbox(collection)
  collection.bbox = bbox

  const merged = kept.reduce<AreaFeature | null>((accumulated, item) => {
    if (!accumulated) return item as AreaFeature
    return turf.union(turf.featureCollection([accumulated, item as AreaFeature])) ?? accumulated
  }, null)
  if (!merged) throw new Error('Çalışma alanı birleştirilemedi')

  const workArea: FeatureCollection = {
    type: 'FeatureCollection',
    bbox,
    features: [{ ...merged, properties: { ad: 'Çalışma alanı', ilce_sayisi: kept.length } }],
  }

  const districtBytes = await writeOutput('ilceler.geojson', collection)
  const areaBytes = await writeOutput('calisma-alani.geojson', workArea)

  await recordDataset('ilceler', {
    file: 'ilceler.geojson',
    count: kept.length,
    bytes: districtBytes,
    source: 'OSM Overpass + Nominatim',
  })
  await recordDataset('calismaAlani', {
    file: 'calisma-alani.geojson',
    count: 1,
    bytes: areaBytes,
    source: 'Türetilmiş: ilçe birleşimi',
  })

  ok(
    `${kept.length} ilçe yazıldı · bbox ${bbox.map((value) => value.toFixed(4)).join(', ')} · alan ${turf
      .area(merged)
      .toFixed(0)} m²`,
  )
}

await runAsScript(import.meta.url, run)
