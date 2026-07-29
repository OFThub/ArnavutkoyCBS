// Overpass'tan bina/yol/POI anlık görüntüsünü tek seferlik alır; çalışma anında Overpass hiç çağrılmaz.

import type { Feature, FeatureCollection, Geometry } from 'geojson'
import * as turf from '@turf/turf'
import { politeDelay, USER_AGENT } from './lib/http'
import { cacheRaw, runAsScript, writeOutput } from './lib/paths'
import { recordDataset } from './lib/manifest'
import { DISTRICT_BBOX, featureTouchesDistrict, loadDistrictPolygon } from './lib/geo'
import { info, ok, step, warn } from './lib/log'

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const BETWEEN_QUERIES_MS = 5000
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])
const BBOX = `${DISTRICT_BBOX[1]},${DISTRICT_BBOX[0]},${DISTRICT_BBOX[3]},${DISTRICT_BBOX[2]}`

const POI_AMENITY =
  'hospital|clinic|doctors|pharmacy|school|kindergarten|college|university|police|fire_station|townhall|place_of_worship'

interface Tema {
  id: string
  query: string
}

const TEMALAR: Tema[] = [
  {
    id: 'bina',
    query: `[out:json][timeout:300];(way["building"](${BBOX}););out geom;`,
  },
  {
    id: 'yol',
    query: `[out:json][timeout:300];(way["highway"](${BBOX}););out geom;`,
  },
  {
    id: 'poi',
    query:
      `[out:json][timeout:300];(` +
      `node["amenity"~"^(${POI_AMENITY})$"](${BBOX});` +
      `way["amenity"~"^(${POI_AMENITY})$"](${BBOX});` +
      `node["leisure"="park"](${BBOX});` +
      `way["leisure"="park"](${BBOX});` +
      `);out geom;`,
  },
  {
    // Kent hizmetleri: wifi, kamera, geri dönüşüm, pazar, park, durak, bisiklet, dere.
    id: 'hizmet',
    query:
      `[out:json][timeout:300];(` +
      `node["amenity"~"^(recycling|marketplace)$"](${BBOX});` +
      `way["amenity"~"^(recycling|marketplace)$"](${BBOX});` +
      `node["man_made"="surveillance"](${BBOX});` +
      `node["internet_access"="wlan"](${BBOX});` +
      `way["internet_access"="wlan"](${BBOX});` +
      `node["highway"="bus_stop"](${BBOX});` +
      `node["public_transport"="platform"](${BBOX});` +
      `way["leisure"~"^(park|garden|playground|pitch)$"](${BBOX});` +
      `way["highway"="cycleway"](${BBOX});` +
      `way["bicycle"="designated"](${BBOX});` +
      `way["waterway"~"^(river|stream|canal)$"](${BBOX});` +
      `);out geom;`,
  },
  {
    // İmar planı vekili: OSM arazi kullanımı. Resmî imar lekesi DEĞİLDİR.
    id: 'arazi',
    query:
      `[out:json][timeout:300];(` +
      `way["landuse"~"^(residential|commercial|industrial|retail|cemetery|quarry|allotments)$"](${BBOX});` +
      `);out geom;`,
  },
]

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  tags?: Record<string, string>
  geometry?: { lat: number; lon: number }[]
}

interface OverpassResponse {
  elements: OverpassElement[]
}

async function overpass(query: string): Promise<OverpassResponse> {
  for (const mirror of MIRRORS) {
    try {
      const response = await postWithBackoff(mirror, query)
      return (await response.json()) as OverpassResponse
    } catch (error) {
      warn(`${mirror} başarısız: ${String(error)}`)
    }
  }
  throw new Error('Tüm Overpass aynaları başarısız oldu')
}

async function postWithBackoff(mirror: string, query: string): Promise<Response> {
  const retries = 3
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(mirror, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': USER_AGENT,
      },
      body: new URLSearchParams({ data: query }).toString(),
    })

    if (response.ok) return response
    if (!RETRYABLE_STATUS.has(response.status) || attempt === retries) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }

    const delay = Math.min(5000 * 2 ** attempt, 120_000)
    warn(`Overpass ${response.status}, ${delay / 1000} s sonra yeniden denenecek (slot bekleniyor)`)
    await politeDelay(delay)
  }
  throw new Error('Overpass yeniden deneme sınırı aşıldı')
}

function isClosed(coords: [number, number][]): boolean {
  const first = coords[0]
  const last = coords[coords.length - 1]
  return coords.length > 3 && !!first && !!last && first[0] === last[0] && first[1] === last[1]
}

function toFeature(element: OverpassElement, tema: string): Feature<Geometry> | null {
  const tags = element.tags ?? {}
  const properties = { ...tags, tema, osm_type: element.type, osm_id: element.id }

  if (element.type === 'node') {
    if (element.lon === undefined || element.lat === undefined) return null
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [element.lon, element.lat] },
      properties,
    }
  }

  if (element.type === 'way' && element.geometry && element.geometry.length > 1) {
    const coords = element.geometry.map((node) => [node.lon, node.lat] as [number, number])
    const areal =
      isClosed(coords) &&
      (tags['building'] || tags['leisure'] || tags['amenity'] || tags['landuse'])
    return {
      type: 'Feature',
      geometry: areal
        ? { type: 'Polygon', coordinates: [coords] }
        : { type: 'LineString', coordinates: coords },
      properties,
    }
  }

  return null
}

export async function run(): Promise<void> {
  step('06 · OSM anlık görüntüsü (Overpass)')

  const district = await loadDistrictPolygon()
  const features: Feature<Geometry>[] = []
  const sayim: Record<string, number> = {}

  for (const [index, tema] of TEMALAR.entries()) {
    if (index > 0) await politeDelay(BETWEEN_QUERIES_MS)

    const buffer = await cacheRaw(`osm-${tema.id}.json`, async () => {
      info(`${tema.id} sorgulanıyor…`)
      const body = await overpass(tema.query)
      return Buffer.from(JSON.stringify(body), 'utf8')
    })

    const body = JSON.parse(buffer.toString('utf8')) as OverpassResponse
    let kept = 0

    for (const element of body.elements) {
      const feature = toFeature(element, tema.id)
      if (!feature) continue
      if (!featureTouchesDistrict(district, feature)) continue
      features.push(feature)
      kept += 1
    }

    sayim[tema.id] = kept
    info(`${tema.id}: ${body.elements.length} öğe → ilçe içinde ${kept}`)
  }

  const saglikEgitim = features.filter((feature) => {
    const amenity = String(feature.properties?.['amenity'] ?? '')
    return /^(hospital|clinic|doctors|school|kindergarten|college|university)$/.test(amenity)
  }).length

  const binaAlani = features
    .filter((feature) => feature.properties?.['tema'] === 'bina' && feature.geometry.type === 'Polygon')
    .reduce((sum, feature) => sum + turf.area(feature as Feature<never>), 0)

  const collection: FeatureCollection<Geometry> = { type: 'FeatureCollection', features }
  const bytes = await writeOutput('osm-snapshot.geojson', collection)
  await recordDataset('osmSnapshot', {
    file: 'osm-snapshot.geojson',
    count: features.length,
    source: 'OpenStreetMap / Overpass API',
    bytes,
  })

  ok(
    `bina ${sayim['bina'] ?? 0} · yol ${sayim['yol'] ?? 0} · POI ${sayim['poi'] ?? 0} · ` +
      `hizmet ${sayim['hizmet'] ?? 0} · arazi ${sayim['arazi'] ?? 0} · ` +
      `sağlık+eğitim ${saglikEgitim} · bina alanı ${(binaAlani / 1_000_000).toFixed(2)} km²`,
  )

  if ((sayim['hizmet'] ?? 0) === 0) {
    warn('Kent hizmeti öğesi bulunamadı — wifi/durak/pazar katmanları boş kalacak')
  }

  if ((sayim['bina'] ?? 0) < 4000) {
    warn(`Bina sayısı beklenen ≈5.637'nin belirgin altında — sorgu kapsamı kontrol edilmeli`)
  }
  if (saglikEgitim < 46) {
    warn(`Sağlık+eğitim sayısı ${saglikEgitim}, yer doğruluğu ≥46 bekliyordu`)
  }
}

await runAsScript(import.meta.url, run)
