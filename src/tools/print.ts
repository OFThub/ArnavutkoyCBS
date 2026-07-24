// Harita görüntüsünü gömülü Türkçe fontla başlık, ölçek çubuğu, kuzey oku ve künye ekleyerek A4 PDF'e basar.

import { jsPDF } from 'jspdf'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { formatDecimal } from '../core/coords'
import { formatDistance, metersPerPixel, niceScaleBar, type ScaleBar } from '../core/format'
import { PDF_FONT_BASE64, PDF_FONT_FILE, PDF_FONT_NAME } from './printFont'

export type PrintOrientation = 'portrait' | 'landscape'

export interface PrintOptions {
  title: string
  orientation: PrintOrientation
  dataVersion: string
}

const MARGIN = 12
const HEADER = 14
const FOOTER = 20
const TARGET_BAR_MM = 45

async function waitForRender(map: MapLibreMap): Promise<void> {
  await new Promise<void>((resolve) => {
    map.once('idle', () => resolve())
    map.triggerRepaint()
  })
}

function registerFont(doc: jsPDF): void {
  doc.addFileToVFS(PDF_FONT_FILE, PDF_FONT_BASE64)
  doc.addFont(PDF_FONT_FILE, PDF_FONT_NAME, 'normal')
  doc.setFont(PDF_FONT_NAME, 'normal')
}

function drawNorthArrow(doc: jsPDF, cx: number, cy: number, radius: number, bearing: number): void {
  const rotation = (-bearing * Math.PI) / 180
  const at = (angle: number, length: number): [number, number] => [
    cx + Math.sin(angle + rotation) * length,
    cy - Math.cos(angle + rotation) * length,
  ]
  const [tipX, tipY] = at(0, radius)
  const [leftX, leftY] = at(Math.PI * 0.78, radius * 0.82)
  const [rightX, rightY] = at(-Math.PI * 0.78, radius * 0.82)

  doc.setFillColor(15, 23, 42)
  doc.triangle(tipX, tipY, leftX, leftY, rightX, rightY, 'F')
  doc.setFontSize(7)
  const [labelX, labelY] = at(0, radius + 3.2)
  doc.text('K', labelX, labelY, { align: 'center' })
}

function drawScaleBar(doc: jsPDF, x: number, y: number, bar: ScaleBar): void {
  doc.setDrawColor(15, 23, 42)
  doc.setLineWidth(0.4)
  doc.line(x, y, x + bar.millimeters, y)
  doc.line(x, y, x, y - 1.8)
  doc.line(x + bar.millimeters, y, x + bar.millimeters, y - 1.8)
  doc.setFontSize(7)
  doc.text(formatDistance(bar.meters), x + bar.millimeters + 2, y)
}

export async function exportMapPdf(map: MapLibreMap, options: PrintOptions): Promise<string> {
  await waitForRender(map)

  const doc = new jsPDF({ orientation: options.orientation, unit: 'mm', format: 'a4' })
  registerFont(doc)

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  doc.setFontSize(15)
  doc.setTextColor(15, 23, 42)
  doc.text(options.title, MARGIN, MARGIN + 4)

  const source = map.getCanvas()
  const frameX = MARGIN
  const frameY = MARGIN + HEADER
  const frameWidth = pageWidth - MARGIN * 2
  const frameHeight = pageHeight - frameY - MARGIN - FOOTER

  const sourceRatio = source.width / source.height
  let drawWidth = frameWidth
  let drawHeight = frameWidth / sourceRatio
  if (drawHeight > frameHeight) {
    drawHeight = frameHeight
    drawWidth = frameHeight * sourceRatio
  }
  const drawX = frameX + (frameWidth - drawWidth) / 2
  const drawY = frameY

  doc.addImage(source.toDataURL('image/jpeg', 0.92), 'JPEG', drawX, drawY, drawWidth, drawHeight)
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.2)
  doc.rect(drawX, drawY, drawWidth, drawHeight)

  const center = map.getCenter()
  const metersPerMm = (metersPerPixel(center.lat, map.getZoom()) * source.clientWidth) / drawWidth
  const barY = drawY + drawHeight + 6
  drawScaleBar(doc, drawX, barY, niceScaleBar(metersPerMm, TARGET_BAR_MM))
  drawNorthArrow(doc, drawX + drawWidth - 6, barY - 1, 3.4, map.getBearing())

  doc.setFontSize(7.5)
  doc.setTextColor(71, 85, 105)
  const lines = [
    `Merkez: ${formatDecimal(center.lng, center.lat)} · Yakınlaştırma: ${map.getZoom().toFixed(2)} · Dönüş: ${map.getBearing().toFixed(0)}°`,
    `Veri sürümü: ${options.dataVersion} · Çıktı: ${new Date().toLocaleString('tr-TR')}`,
    'Arnavutköy Belediyesi CBS · © OpenStreetMap katkıcıları, İBB Açık Veri, Esri',
  ]
  lines.forEach((line, index) => {
    doc.text(line, MARGIN, pageHeight - MARGIN - 8 + index * 3.6)
  })

  const fileName = `arnavutkoy-cbs-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(fileName)
  return fileName
}
