// Taşkın riski: hex ızgarada düşük yükselti, düşük eğim ve akarsuya yakınlığı birleştirip riskli hücrelerdeki binaları listeler.

import { booleanPointInPolygon } from '@turf/turf'
import type { Feature, FeatureCollection, Polygon } from 'geojson'
import { classifyFlood, floodIndex, FLOOD_CLASS_STYLE } from './core/flood'
import { buildHexGrid, cellCenter, districtArea, nearestDistanceM, pointsFrom } from './support'
import { loadDataset } from '../core/dataset'
import { snapshotTheme } from '../data/osmSnapshot'
import { loadTerrainDerived, terrainSampleAt } from '../data/terrainDerived'
import type { AnalysisModule } from '../core/types'

interface FloodParams {
  hucreBoyutM: number
  esik: number
}

export const floodRiskAnalysis: AnalysisModule<FloodParams> = {
  id: 'taskin-riski',
  title: 'Taşkın riski',
  category: 'risk',
  access: 'public',
  params: [
    { kind: 'number', name: 'hucreBoyutM', label: 'Hücre kenarı', default: 400, min: 200, max: 1000, step: 50, unit: 'm' },
    { kind: 'number', name: 'esik', label: 'Riskli sayma eşiği', default: 50, min: 0, max: 100, step: 5, unit: '%' },
  ],

  async run(_ctx, params) {
    const [derived, area] = await Promise.all([loadTerrainDerived(), districtArea()])

    const [waters, buildings] = await Promise.all([
      loadDataset<FeatureCollection>('osmSnapshot'),
      snapshotTheme('bina'),
    ])
    const waterPoints = pointsFrom(waters, (f) => f.properties?.['waterway'] !== undefined)
    const buildingPoints = pointsFrom(buildings)

    const cells = buildHexGrid(area, params.hucreBoyutM / 1000)
    const features: Feature<Polygon>[] = []
    const riskyCells: Feature<Polygon>[] = []

    for (const cell of cells) {
      const center = cellCenter(cell)
      const sample = terrainSampleAt(derived, center[0], center[1])
      const index = floodIndex({
        elevation: sample?.elevation ?? 200,
        slopePercent: sample?.slopePercent ?? 30,
        distanceToWaterM: waterPoints.features.length > 0 ? nearestDistanceM(center, waterPoints) : 1000,
      })
      const yuzde = Math.round(index * 100)
      const feature: Feature<Polygon> = {
        ...cell,
        properties: { risk: yuzde, sinif: classifyFlood(index) },
      }
      features.push(feature)
      if (yuzde >= params.esik) riskyCells.push(feature)
    }

    let riskliBina = 0
    for (const point of buildingPoints.features) {
      if (riskyCells.some((cell) => booleanPointInPolygon(point, cell))) riskliBina += 1
    }

    const legend = Object.entries(FLOOD_CLASS_STYLE)

    return {
      summary: `${cells.length} hücrenin ${riskyCells.length}'i %${params.esik} eşiğini aşan taşkın riski taşıyor; bu hücrelerde ${riskliBina} bina bulunuyor.`,
      metrics: [
        { label: 'Riskli hücre', value: riskyCells.length },
        { label: 'Riskli bina', value: riskliBina },
        { label: 'Akarsu noktası', value: waterPoints.features.length },
      ],
      geojson: { type: 'FeatureCollection', features },
      style: {
        type: 'fill',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'risk'],
            0,
            '#2c7bb6',
            50,
            '#fdae61',
            100,
            '#d7191c',
          ],
          'fill-opacity': ['case', ['>=', ['get', 'risk'], params.esik], 0.7, 0.25],
        },
      },
      chart: {
        type: 'bar',
        xKey: 'sinif',
        series: [{ key: 'adet', label: 'Hücre' }],
        data: legend.map(([id, info]) => ({
          sinif: info.label,
          adet: features.filter((f) => f.properties?.['sinif'] === id).length,
        })),
      },
    }
  },
}
