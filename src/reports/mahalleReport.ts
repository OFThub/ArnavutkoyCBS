// Mahalle deprem senaryosu verisinden Excel ve PDF rapor üretimi; BI panosu ve rapor yöneticisi bunu paylaşır.

import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { MAHALLE_FIELDS } from '../theming/mahalleData'

export interface MahalleReportRow {
  ad: string
  uavt: string
  values: Record<string, number>
}

export function buildReportRows(
  collection: FeatureCollection<Polygon | MultiPolygon>,
): MahalleReportRow[] {
  return collection.features
    .map((feature) => {
      const props = feature.properties ?? {}
      const values: Record<string, number> = {}
      for (const field of MAHALLE_FIELDS) values[field.key] = Number(props[field.key]) || 0
      return { ad: String(props['ad'] ?? ''), uavt: String(props['uavt_kod'] ?? ''), values }
    })
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
}

export function reportTotals(rows: MahalleReportRow[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const field of MAHALLE_FIELDS) {
    totals[field.key] = rows.reduce((sum, row) => sum + (row.values[field.key] ?? 0), 0)
  }
  return totals
}

export async function exportMahalleExcel(rows: MahalleReportRow[]): Promise<string> {
  const XLSX = await import('xlsx')
  const header = ['Mahalle', 'UAVT', ...MAHALLE_FIELDS.map((field) => field.label)]
  const body = rows.map((row) => [
    row.ad,
    row.uavt,
    ...MAHALLE_FIELDS.map((field) => row.values[field.key] ?? 0),
  ])
  const totals = reportTotals(rows)
  body.push(['TOPLAM', '', ...MAHALLE_FIELDS.map((field) => totals[field.key] ?? 0)])

  const sheet = XLSX.utils.aoa_to_sheet([header, ...body])
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Deprem Senaryosu')

  const fileName = `arnavutkoy-mahalle-raporu-${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(book, fileName)
  return fileName
}

export async function exportMahallePdf(rows: MahalleReportRow[]): Promise<string> {
  const { jsPDF } = await import('jspdf')
  const { PDF_FONT_BASE64, PDF_FONT_FILE, PDF_FONT_NAME } = await import('../tools/printFont')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.addFileToVFS(PDF_FONT_FILE, PDF_FONT_BASE64)
  doc.addFont(PDF_FONT_FILE, PDF_FONT_NAME, 'normal')
  doc.setFont(PDF_FONT_NAME, 'normal')

  doc.setFontSize(14)
  doc.text('Arnavutköy — Mahalle Deprem Senaryosu Raporu', 12, 14)
  doc.setFontSize(8)
  doc.text(`İBB Açık Veri · ${rows.length} mahalle · ${new Date().toLocaleString('tr-TR')}`, 12, 20)

  const columns = ['Mahalle', 'Çok ağır', 'Ağır', 'Orta', 'Can kaybı', 'Barınma']
  const keys = [
    'cok_agir_hasarli_bina_sayisi',
    'agir_hasarli_bina_sayisi',
    'orta_hasarli_bina_sayisi',
    'can_kaybi_sayisi',
    'gecici_barinma',
  ]
  const colX = [12, 70, 110, 140, 170, 210]

  let y = 30
  doc.setFontSize(8)
  columns.forEach((col, index) => doc.text(col, colX[index] ?? 12, y))
  y += 2
  doc.setDrawColor(180, 180, 180)
  doc.line(12, y, 280, y)
  y += 4

  doc.setFontSize(7)
  for (const row of rows) {
    if (y > 195) {
      doc.addPage()
      y = 16
    }
    doc.text(row.ad.slice(0, 28), colX[0]!, y)
    keys.forEach((key, index) => {
      doc.text(String(row.values[key] ?? 0), colX[index + 1]!, y)
    })
    y += 4.5
  }

  const fileName = `arnavutkoy-mahalle-raporu-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(fileName)
  return fileName
}
