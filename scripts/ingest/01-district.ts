// Nominatim relation 1766093 üzerinden Arnavutköy ilçe sınırını indirir ve district.geojson olarak yazar.

import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson'
import * as turf from '@turf/turf'
import { fetchJson } from './lib/http'
import { runAsScript, writeOutput } from './lib/paths'
import { recordDataset } from './lib/manifest'
import { info, ok, step, warn } from './lib/log'

const RELATION_ID = 1766093
const EXPECTED_BBOX: [number, number, number, number] = [28.4893, 41.0886, 28.8214, 41.4081]
const BBOX_TOLERANCE = 0.05

interface NominatimLookupItem {
  osm_type: string
  osm_id: number
  display_name: string
  geojson?: Geometry
}

function bboxDrift(actual: number[], expected: number[]): number {
  let max = 0
  for (let i = 0; i < 4; i += 1) {
    max = Math.max(max, Math.abs((actual[i] ?? 0) - (expected[i] ?? 0)))
  }
  return max
}

export async function run(): Promise<void> {
  step('01 · İlçe sınırı (Nominatim)')

  const url = `https://nominatim.openstreetmap.org/lookup?osm_ids=R${RELATION_ID}&format=jsonv2&polygon_geojson=1`
  const items = await fetchJson<NominatimLookupItem[]>(url)
  const item = items[0]

  if (!item?.geojson) {
    throw new Error(`Relation ${RELATION_ID} için geometri gelmedi`)
  }
  if (item.geojson.type !== 'Polygon' && item.geojson.type !== 'MultiPolygon') {
    throw new Error(`Beklenmeyen geometri tipi: ${item.geojson.type}`)
  }

  const feature: Feature<Polygon | MultiPolygon> = {
    type: 'Feature',
    geometry: item.geojson,
    properties: {
      ad: 'Arnavutköy',
      il: 'İstanbul',
      osm_type: item.osm_type,
      osm_id: item.osm_id,
      kaynak: 'OpenStreetMap / Nominatim',
      display_name: item.display_name,
    },
  }

  const bbox = turf.bbox(feature)
  const drift = bboxDrift(bbox, EXPECTED_BBOX)
  info(`bbox: ${bbox.map((value) => value.toFixed(4)).join(', ')}`)
  if (drift > BBOX_TOLERANCE) {
    warn(`bbox beklenenden ${drift.toFixed(4)}° sapıyor — OSM sınırı değişmiş olabilir`)
  }

  const km2 = turf.area(feature) / 1_000_000
  info(`alan: ${km2.toFixed(1)} km²`)

  const collection: FeatureCollection<Polygon | MultiPolygon> = {
    type: 'FeatureCollection',
    features: [feature],
  }

  const bytes = await writeOutput('district.geojson', collection)
  await recordDataset('district', {
    file: 'district.geojson',
    count: 1,
    source: `Nominatim relation ${RELATION_ID}`,
    bytes,
  })

  ok(`district.geojson yazıldı (${(bytes / 1024).toFixed(1)} KB)`)
}

await runAsScript(import.meta.url, run)
