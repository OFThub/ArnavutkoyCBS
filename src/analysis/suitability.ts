// Uygun yer seçimi (MCDA): hex ızgarada eğim, yükselti, yola/tesise mesafe ve yapılaşma yoğunluğunu ağırlıklı çakıştırır.

import type { Feature, FeatureCollection, Point, Polygon } from 'geojson'
import { scoreCells, type Criterion } from './core/mcda'
import { buildHexGrid, cellCenter, districtArea, nearestDistanceM, pointsFrom } from './support'
import { snapshotTheme } from '../data/osmSnapshot'
import { loadTerrainDerived, terrainSampleAt } from '../data/terrainDerived'
import type { AnalysisModule } from '../core/types'

interface SuitabilityParams {
  hucreBoyutM: number
  agirlikEgim: number
  agirlikYol: number
  agirlikTesis: number
  agirlikYogunluk: number
  adaySayisi: number
}

interface Cell extends Record<string, number> {
  egim: number
  yolMesafe: number
  tesisMesafe: number
  binaMesafe: number
}

export const suitabilityAnalysis: AnalysisModule<SuitabilityParams> = {
  id: 'uygun-yer',
  title: 'Uygun yer seçimi (MCDA)',
  category: 'mekansal',
  access: 'public',
  params: [
    { kind: 'number', name: 'hucreBoyutM', label: 'Hücre kenarı', default: 400, min: 200, max: 1000, step: 50, unit: 'm' },
    { kind: 'number', name: 'agirlikEgim', label: 'Ağırlık: düşük eğim', default: 3, min: 0, max: 5, step: 1 },
    { kind: 'number', name: 'agirlikYol', label: 'Ağırlık: yola yakınlık', default: 2, min: 0, max: 5, step: 1 },
    { kind: 'number', name: 'agirlikTesis', label: 'Ağırlık: tesise yakınlık', default: 2, min: 0, max: 5, step: 1 },
    { kind: 'number', name: 'agirlikYogunluk', label: 'Ağırlık: düşük yapılaşma', default: 1, min: 0, max: 5, step: 1 },
    { kind: 'number', name: 'adaySayisi', label: 'Aday sayısı', default: 10, min: 3, max: 30, step: 1 },
  ],

  async run(_ctx, params) {
    const [derived, area] = await Promise.all([loadTerrainDerived(), districtArea()])

    const cells = buildHexGrid(area, params.hucreBoyutM / 1000)
    if (cells.length === 0) return { summary: 'Izgara üretilemedi.', metrics: [] }

    const [roads, pois, buildings] = await Promise.all([
      snapshotTheme('yol'),
      snapshotTheme('poi'),
      snapshotTheme('bina'),
    ])
    const roadPoints = decimate(pointsFrom(roads), 3)
    const poiPoints = pointsFrom(pois)
    const buildingPoints = decimate(pointsFrom(buildings), 3)

    const measured: { cell: Feature<Polygon>; data: Cell }[] = cells.map((cell) => {
      const center = cellCenter(cell)
      const sample = terrainSampleAt(derived, center[0], center[1])
      return {
        cell,
        data: {
          egim: sample?.slopePercent ?? 50,
          yolMesafe: nearestDistanceM(center, roadPoints),
          tesisMesafe: nearestDistanceM(center, poiPoints),
          binaMesafe: nearestDistanceM(center, buildingPoints),
        },
      }
    })

    const criteria: Criterion[] = [
      { key: 'egim', label: 'Eğim', weight: params.agirlikEgim, direction: 'cost' },
      { key: 'yolMesafe', label: 'Yola mesafe', weight: params.agirlikYol, direction: 'cost' },
      { key: 'tesisMesafe', label: 'Tesise mesafe', weight: params.agirlikTesis, direction: 'cost' },
      { key: 'binaMesafe', label: 'Yapılaşmadan uzaklık', weight: params.agirlikYogunluk, direction: 'benefit' },
    ]

    const scored = scoreCells(
      measured.map((item) => item.data),
      criteria,
    )
    const scoreById = new Map(scored.map((item, index) => [item.cell, { score: item.score, rank: index }]))

    const features: Feature<Polygon>[] = measured.map((item) => {
      const scoreInfo = scoreById.get(item.data)
      return {
        ...item.cell,
        properties: { skor: Math.round((scoreInfo?.score ?? 0) * 100) },
      }
    })

    const best = scored.slice(0, params.adaySayisi)
    const bestIndices = new Set(best.map((item) => measured.findIndex((m) => m.data === item.cell)))
    const candidates: Feature<Point>[] = [...bestIndices]
      .filter((index) => index >= 0)
      .map((index, order) => {
        const center = cellCenter(measured[index]!.cell)
        return {
          type: 'Feature',
          properties: { aday: order + 1, skor: Math.round(best[order]!.score * 100) },
          geometry: { type: 'Point', coordinates: center },
        }
      })

    const collection: FeatureCollection = { type: 'FeatureCollection', features: [...features, ...candidates] }

    return {
      summary: `${cells.length} hücre skorlandı; en uygun ${candidates.length} aday işaretlendi. Koyu hücreler yüksek uygunluk gösterir.`,
      metrics: [
        { label: 'Hücre', value: cells.length },
        { label: 'En yüksek skor', value: Math.round((scored[0]?.score ?? 0) * 100) },
        { label: 'Aday', value: candidates.length },
      ],
      geojson: collection,
      style: {
        type: 'fill',
        paint: {
          'fill-color': ['interpolate', ['linear'], ['get', 'skor'], 0, '#f7fbff', 50, '#6baed6', 100, '#08306b'],
          'fill-opacity': 0.6,
        },
      },
      table: {
        columns: ['Aday', 'Skor'],
        rows: candidates.map((feature) => [
          Number(feature.properties?.['aday']),
          Number(feature.properties?.['skor']),
        ]),
      },
    }
  },
}

function decimate(collection: FeatureCollection<Point>, step: number): FeatureCollection<Point> {
  if (step <= 1) return collection
  return {
    type: 'FeatureCollection',
    features: collection.features.filter((_, index) => index % step === 0),
  }
}
