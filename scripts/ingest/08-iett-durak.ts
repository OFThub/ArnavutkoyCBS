// İETT otobüs duraklarını İBB CKAN'dan çeker; Arnavutköy içindekileri nokta GeoJSON olarak yazar.
// Bu adım isteğe bağlıdır: CKAN çözülemezse OSM anlık görüntüsündeki "otobus-duragi" katmanı devrede kalır.

import * as XLSX from 'xlsx'
import type { Feature, FeatureCollection, Point } from 'geojson'
import { fetchBuffer } from './lib/http'
import { pickResource, resolvePackage } from './lib/ckan'
import { cacheRaw, runAsScript, writeOutput } from './lib/paths'
import { recordDataset } from './lib/manifest'
import { isFiniteCoord, loadDistrictPolygon, pointInDistrict } from './lib/geo'
import { normalizeName, parseTrNumber } from './lib/normalize'
import { info, ok, step, warn } from './lib/log'

const SLUGS = ['iett-durak-listesi', 'iett-duraklari', 'otobus-duraklari']
const QUERY = 'iett durak'

const LON_HINTS = ['boylam', 'longitude', 'lon', 'lng', 'x_koordinat', 'x']
const LAT_HINTS = ['enlem', 'latitude', 'lat', 'y_koordinat', 'y']
const NAME_HINTS = ['durak_adi', 'adi', 'ad', 'durak', 'isim']
const CODE_HINTS = ['durak_kodu', 'kod', 'duraknoo', 'durak_no']
const TYPE_HINTS = ['durak_tipi', 'tip', 'tipi', 'fiziki_durum']

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
  step('08 · İETT otobüs durakları')

  const pkg = await resolvePackage(SLUGS, QUERY)
  const resource = pickResource(pkg, ['XLSX', 'XLS', 'CSV'], 'durak')
  info(`kaynak: ${resource.name} → ${resource.url}`)

  const buffer = await cacheRaw(`iett-durak.${resource.format.toLowerCase()}`, () =>
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
  info(`koordinat sütunları: ${lonColumn} / ${latColumn}`)

  const nameColumn = findColumn(columns, NAME_HINTS)
  const codeColumn = findColumn(columns, CODE_HINTS)
  const typeColumn = findColumn(columns, TYPE_HINTS)

  const district = await loadDistrictPolygon()
  const features: Feature<Point>[] = []
  let skippedCoord = 0

  for (const row of rows) {
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
        kod: codeColumn ? String(row[codeColumn] ?? '').trim() : '',
        tur: typeColumn ? String(row[typeColumn] ?? '').trim() : '',
        kaynak: 'İBB Açık Veri / İETT',
      },
    })
  }

  if (skippedCoord > 0) warn(`${skippedCoord} satır geçersiz koordinat nedeniyle atlandı`)
  if (features.length === 0) {
    warn('Arnavutköy içinde durak bulunamadı — OSM durak katmanı devrede kalacak')
  }

  const collection: FeatureCollection<Point> = { type: 'FeatureCollection', features }
  const bytes = await writeOutput('otobus-duragi.geojson', collection)
  await recordDataset('otobusDuragi', {
    file: 'otobus-duragi.geojson',
    count: features.length,
    source: `İBB CKAN / ${pkg.name}`,
    bytes,
  })

  ok(`${features.length} otobüs durağı yazıldı`)
}

await runAsScript(import.meta.url, run)
