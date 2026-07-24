// Harita kanvasını başlık, ölçek ve künye ile A4 sayfaya yerleştirip PDF üreten yazdırma hattı.

import { jsPDF } from 'jspdf'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { formatDistance, metersPerPixel } from '../core/format'
import { formatDecimal } from '../core/coords'

export type PrintOrientation = 'portrait' | 'landscape'

export interface PrintOptions {
  title: string
  orientation: PrintOrientation
  dataVersion: string
}

const DPI = 150
const A4_MM = { width: 210, height: 297 }
const MARGIN_MM = 12

function mmToPx(mm: number): number {
  return Math.round((mm / 25.4) * DPI)
}

async function waitForRender(map: MapLibreMap): Promise<void> {
  await new Promise<void>((resolve) => {
    map.once('idle', () => resolve())
    map.triggerRepaint()
  })
}

function drawScaleBar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  width: number,
  scale: number,
): void {
  context.strokeStyle = '#0f172a'
  context.lineWidth = 2 * scale
  context.beginPath()
  context.moveTo(x, y)
  context.lineTo(x, y - 6 * scale)
  context.moveTo(x, y)
  context.lineTo(x + width, y)
  context.moveTo(x + width, y)
  context.lineTo(x + width, y - 6 * scale)
  context.stroke()
  context.fillStyle = '#0f172a'
  context.fillText(label, x + width + 8 * scale, y)
}

export async function buildPrintCanvas(
  map: MapLibreMap,
  options: PrintOptions,
): Promise<HTMLCanvasElement> {
  await waitForRender(map)

  const landscape = options.orientation === 'landscape'
  const pageWidthMm = landscape ? A4_MM.height : A4_MM.width
  const pageHeightMm = landscape ? A4_MM.width : A4_MM.height

  const canvas = document.createElement('canvas')
  canvas.width = mmToPx(pageWidthMm)
  canvas.height = mmToPx(pageHeightMm)

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Yazdırma tuvali oluşturulamadı')

  const scale = canvas.width / 1240
  const margin = mmToPx(MARGIN_MM)

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.fillStyle = '#0f172a'
  context.font = `700 ${Math.round(30 * scale)}px "Segoe UI", system-ui, sans-serif`
  context.textBaseline = 'top'
  context.fillText(options.title, margin, margin)

  const headerHeight = Math.round(58 * scale)
  const footerHeight = Math.round(96 * scale)
  const frameX = margin
  const frameY = margin + headerHeight
  const frameWidth = canvas.width - margin * 2
  const frameHeight = canvas.height - frameY - margin - footerHeight

  const source = map.getCanvas()
  const sourceRatio = source.width / source.height
  const frameRatio = frameWidth / frameHeight

  let drawWidth = frameWidth
  let drawHeight = frameHeight
  if (sourceRatio > frameRatio) drawHeight = frameWidth / sourceRatio
  else drawWidth = frameHeight * sourceRatio

  const drawX = frameX + (frameWidth - drawWidth) / 2
  const drawY = frameY + (frameHeight - drawHeight) / 2

  context.drawImage(source, drawX, drawY, drawWidth, drawHeight)
  context.strokeStyle = '#cbd5f5'
  context.lineWidth = Math.max(1, scale)
  context.strokeRect(drawX, drawY, drawWidth, drawHeight)

  const center = map.getCenter()
  const perPixel = metersPerPixel(center.lat, map.getZoom())
  const barPixels = Math.round(180 * scale)
  const barMeters = perPixel * (barPixels / (drawWidth / source.width))

  context.font = `${Math.round(16 * scale)}px "Segoe UI", system-ui, sans-serif`
  context.textBaseline = 'middle'
  drawScaleBar(
    context,
    frameX,
    drawY + drawHeight + Math.round(26 * scale),
    formatDistance(barMeters),
    barPixels,
    scale,
  )

  context.textBaseline = 'top'
  context.fillStyle = '#475569'
  const footerTop = canvas.height - margin - footerHeight + Math.round(40 * scale)
  const lines = [
    `Merkez: ${formatDecimal(center.lng, center.lat)} · Yakınlaştırma: ${map.getZoom().toFixed(2)}`,
    `Veri sürümü: ${options.dataVersion} · Çıktı: ${new Date().toLocaleString('tr-TR')}`,
    'Arnavutköy Belediyesi CBS · © OpenStreetMap katkıcıları, İBB Açık Veri, Esri',
  ]
  lines.forEach((line, index) => {
    context.fillText(line, margin, footerTop + index * Math.round(22 * scale))
  })

  return canvas
}

export async function exportMapPdf(map: MapLibreMap, options: PrintOptions): Promise<string> {
  const canvas = await buildPrintCanvas(map, options)
  const document_ = new jsPDF({ orientation: options.orientation, unit: 'mm', format: 'a4' })
  const pageWidth = document_.internal.pageSize.getWidth()
  const pageHeight = document_.internal.pageSize.getHeight()

  document_.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageWidth, pageHeight)

  const stamp = new Date().toISOString().slice(0, 10)
  const fileName = `arnavutkoy-cbs-${stamp}.pdf`
  document_.save(fileName)
  return fileName
}
