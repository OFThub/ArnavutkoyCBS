// AFAD/İBB acil toplanma alanlarını çeker. src/analysis/evacuation.ts bu veri setini bekliyordu
// ama dosya hiç üretilmemişti; bu adım o boşluğu kapatır. İsteğe bağlıdır.

import * as XLSX from 'xlsx'
import type { Feature, FeatureCollection, Point } from 'geojson'
import { fetchBuffer } from './lib/http'
import { pickResource, resolvePackage } from './lib/ckan'
import { cacheRaw, runAsScript, writeOutput } from './lib/paths'
import { recordDataset } from './lib/manifest'
import { isFiniteCoord, loadDistrictPolygon, pointInDistrict } from './lib/geo'
import { mahalleKey, normalizeName, parseTrNumber, toInt } from './lib/normalize'
import { info, ok, step, warn } from './lib/log'

const SLUGS = ['acil-toplanma-alanlari', 'toplanma-alanlari', 'afet-toplanma-alanlari']
const QUERY = 'acil toplanma alanı'
const ILCE = 'arnavutkoy'

const LON_HINTS = ['boylam', 'longitude', 'lon', 'lng', 'x_koordinat', 'x']
const LAT_HINTS = ['enlem', 'latitude', 'lat', 'y_koordinat', 'y']
const NAME_HINTS = ['alan_adi', 'adi', 'ad', 'toplanma_alani', 'isim']
const ILCE_HINTS = ['ilce', 'ilce_adi']
const MAHALLE_HINTS = ['mahalle', 'mahalle_adi']
const CAPACITY_HINTS = ['kapasite', 'kisi_kapasitesi', 'kapasite_kisi']
const AREA_HINTS = ['alan_m2', 'alan', 'yuzolcumu']

type Row = Record<string, unknown>

function findColumn(columns: string[], hints: string[]): string | null {
  for (const hint of hints) {
    const exact = columns.find((column) => column === hint)
    if (exact) return exact
  }
  for (const hint of hints) {
    const partial = columns.find((column) => column.includes(hint))
    if (partial) return partial
  }
  return null
}

function normalizeRow(row: Row): Row {
  const out: Row = {}
  for (const [key, value] of Object.entries(row)) {
    const column = normalizeName(key).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    out[column] = value
  }
  return out
}

export async function run(): Promise<void> {
  step('09 · Acil toplanma alanları')

  const pkg = await resolvePackage(SLUGS, QUERY)
  const resource = pickResource(pkg, ['XLSX', 'XLS', 'CSV'], 'toplanma')
  info(`kaynak: ${resource.name} → ${resource.url}`)

  const buffer = await cacheRaw(`toplanma-alani.${resource.format.toLowerCase()}`, () =>
    fetchBuffer(resource.url),
  )

  const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 1254 })
  const sheetName = workbook.SheetNames[0]
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined
  if (!sheet) throw new Error('Çalışma sayfası bulunamadı')

  const rows = (XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Row[]).map(normalizeRow)
  info(`satır sayısı: ${rows.length}`)

  const first = rows[0]
  if (!first) throw new Error('Tablo boş')
  const columns = Object.keys(first)

  const lonColumn = findColumn(columns, LON_HINTS)
  const latColumn = findColumn(columns, LAT_HINTS)
  if (!lonColumn || !latColumn) {
    throw new Error(`Koordinat sütunu bulunamadı. Sütunlar: ${columns.join(', ')}`)
  }

  const nameColumn = findColumn(columns, NAME_HINTS)
  const ilceColumn = findColumn(columns, ILCE_HINTS)
  const mahalleColumn = findColumn(columns, MAHALLE_HINTS)
  const capacityColumn = findColumn(columns, CAPACITY_HINTS)
  const areaColumn = findColumn(columns, AREA_HINTS)

  const district = await loadDistrictPolygon()
  const features: Feature<Point>[] = []
  let skippedCoord = 0

  for (const row of rows) {
    if (ilceColumn && mahalleKey(String(row[ilceColumn] ?? '')) !== ILCE) continue

    const lon = parseTrNumber(row[lonColumn] as string)
    const lat = parseTrNumber(row[latColumn] as string)
    if (!isFiniteCoord(lon, lat) || lon === null || lat === null) {
      skippedCoord += 1
      continue
    }
    if (!pointInDistrict(district, lon, lat)) continue

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: {
        ad: nameColumn ? String(row[nameColumn] ?? '').trim() : '',
        mahalle: mahalleColumn ? String(row[mahalleColumn] ?? '').trim() : '',
        kapasite_kisi: capacityColumn ? toInt(row[capacityColumn] as string) : 0,
        alan_m2: areaColumn ? toInt(row[areaColumn] as string) : 0,
        kaynak: 'İBB Açık Veri / AFAD',
      },
    })
  }

  if (skippedCoord > 0) warn(`${skippedCoord} satır geçersiz koordinat nedeniyle atlandı`)
  if (features.length === 0) {
    warn('Arnavutköy içinde toplanma alanı bulunamadı — tahliye analizi boş sonuç verecek')
  }

  const collection: FeatureCollection<Point> = { type: 'FeatureCollection', features }
  const bytes = await writeOutput('toplanma-alani.geojson', collection)
  await recordDataset('toplanmaAlani', {
    file: 'toplanma-alani.geojson',
    count: features.length,
    source: `İBB CKAN / ${pkg.name}`,
    bytes,
  })

  ok(`${features.length} toplanma alanı yazıldı`)
}

await runAsScript(import.meta.url, run)
