// İBB sağlık kurumları tablosunu (XLSX/CSV) okur, Arnavutköy içindekileri nokta GeoJSON olarak yazar.

import * as XLSX from 'xlsx'
import type { Feature, FeatureCollection, Point } from 'geojson'
import { fetchBuffer } from './lib/http'
import { pickResource, resolvePackage } from './lib/ckan'
import { cacheRaw, runAsScript, writeOutput } from './lib/paths'
import { recordDataset } from './lib/manifest'
import { isFiniteCoord, loadDistrictPolygon, pointInDistrict } from './lib/geo'
import { mahalleKey, normalizeName, parseTrNumber } from './lib/normalize'
import { info, ok, step, warn } from './lib/log'

const SLUGS = [
  'istanbul-saglik-kurum-ve-kuruluslari-verisi',
  'saglik-kurumlari',
  'istanbul-saglik-kurumlari',
]
const QUERY = 'sağlık kurum'
const ILCE = 'arnavutkoy'

const LON_HINTS = ['boylam', 'longitude', 'lon', 'lng', 'x_koordinat', 'x']
const LAT_HINTS = ['enlem', 'latitude', 'lat', 'y_koordinat', 'y']
const NAME_HINTS = ['adi', 'ad', 'kurum_adi', 'tesis_adi', 'saglik_kurum_adi', 'unvan']
const TYPE_HINTS = ['tur', 'tipi', 'kurum_turu', 'tip', 'kategori']
const ILCE_HINTS = ['ilce', 'ilce_adi']
const MAHALLE_HINTS = ['mahalle', 'mahalle_adi']

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
  step('05 · İBB sağlık kurumları')

  const pkg = await resolvePackage(SLUGS, QUERY)
  const resource = pickResource(pkg, ['XLSX', 'XLS', 'CSV'], 'saglik')
  info(`kaynak: ${resource.name} → ${resource.url}`)

  const buffer = await cacheRaw(`ibb-saglik.${resource.format.toLowerCase()}`, () =>
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
  const nameColumn = findColumn(columns, NAME_HINTS)
  if (!lonColumn || !latColumn) {
    throw new Error(`Koordinat sütunu bulunamadı. Sütunlar: ${columns.join(', ')}`)
  }
  info(`koordinat sütunları: ${lonColumn} / ${latColumn}`)

  const typeColumn = findColumn(columns, TYPE_HINTS)
  const ilceColumn = findColumn(columns, ILCE_HINTS)
  const mahalleColumn = findColumn(columns, MAHALLE_HINTS)

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
        tur: typeColumn ? String(row[typeColumn] ?? '').trim() : '',
        mahalle: mahalleColumn ? String(row[mahalleColumn] ?? '').trim() : '',
        kaynak: 'İBB Açık Veri',
      },
    })
  }

  if (skippedCoord > 0) warn(`${skippedCoord} satır geçersiz koordinat nedeniyle atlandı`)
  if (features.length === 0) {
    warn('Arnavutköy içinde sağlık kurumu bulunamadı — sütun eşleşmesi kontrol edilmeli')
  }

  const collection: FeatureCollection<Point> = { type: 'FeatureCollection', features }
  const bytes = await writeOutput('saglik-kurumu.geojson', collection)
  await recordDataset('saglikKurumu', {
    file: 'saglik-kurumu.geojson',
    count: features.length,
    source: `İBB CKAN / ${pkg.name}`,
    bytes,
  })

  ok(`${features.length} sağlık kurumu yazıldı`)
}

await runAsScript(import.meta.url, run)
