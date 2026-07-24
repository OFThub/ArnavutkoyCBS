// İBB 1. derece acil ulaşım yolu güzergâhlarını indirir, ilçe sınırına göre filtreleyip yazar.

import type { FeatureCollection, LineString, MultiLineString } from 'geojson'
import * as turf from '@turf/turf'
import { fetchBuffer } from './lib/http'
import { pickResource, resolvePackage } from './lib/ckan'
import { cacheRaw, runAsScript, writeOutput } from './lib/paths'
import { recordDataset } from './lib/manifest'
import { clipLineToDistrict, filterToDistrict, loadDistrictPolygon } from './lib/geo'
import { normalizeName } from './lib/normalize'
import { info, ok, step, warn } from './lib/log'

const SLUGS = [
  '1-derece-acil-ulasim-yollari-verisi',
  'acil-ulasim-yollari',
  '1-derece-acil-ulasim-yollari',
]
const QUERY = 'acil ulaşım'

function readDerece(properties: Record<string, unknown> | null): number {
  if (!properties) return 1
  for (const [key, value] of Object.entries(properties)) {
    if (normalizeName(key).includes('derece')) {
      const parsed = Number(String(value).replace(/\D/g, ''))
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }
  }
  return 1
}

export async function run(): Promise<void> {
  step('04 · İBB acil ulaşım yolları')

  const pkg = await resolvePackage(SLUGS, QUERY)
  const resource = pickResource(pkg, ['GeoJSON', 'JSON'], 'acil')
  info(`kaynak: ${resource.name} → ${resource.url}`)

  const buffer = await cacheRaw('ibb-acil-ulasim-yolu.geojson', () => fetchBuffer(resource.url))
  const source = JSON.parse(buffer.toString('utf8')) as FeatureCollection<
    LineString | MultiLineString
  >

  if (source.type !== 'FeatureCollection') {
    throw new Error('Beklenen GeoJSON FeatureCollection gelmedi')
  }
  info(`kaynak geometri sayısı: ${source.features.length}`)

  const district = await loadDistrictPolygon()
  const touching = filterToDistrict(district, source)
  info(`ilçeye değen güzergâh: ${touching.features.length}`)

  const clipped: FeatureCollection<MultiLineString> = { type: 'FeatureCollection', features: [] }
  let toplamKm = 0

  for (const feature of touching.features) {
    const parca = clipLineToDistrict(district, feature)
    if (!parca) continue

    const derece = readDerece(feature.properties as Record<string, unknown> | null)
    const uzunlukKm = Number(turf.length(parca, { units: 'kilometers' }).toFixed(3))
    toplamKm += uzunlukKm
    parca.properties = { ...feature.properties, derece, uzunluk_km: uzunlukKm }
    clipped.features.push(parca)
  }

  if (clipped.features.length === 0) {
    warn('İlçe sınırında acil ulaşım yolu bulunamadı — kaynak kapsamı kontrol edilmeli')
  }

  const bytes = await writeOutput('acil-ulasim-yolu.geojson', clipped)
  await recordDataset('acilUlasimYolu', {
    file: 'acil-ulasim-yolu.geojson',
    count: clipped.features.length,
    source: `İBB CKAN / ${pkg.name}`,
    bytes,
  })

  ok(`${clipped.features.length} güzergâh · ilçe içi toplam ${toplamKm.toFixed(1)} km`)
}

await runAsScript(import.meta.url, run)
