// Ulaşım ve erişilebilirlik: hex ızgarada en yakın sağlık, eğitim ve güvenlik tesisine mesafeyi ölçüp erişim açığı bölgeleri çıkarır.

import type { Feature, Polygon } from 'geojson'
import { buildHexGrid, cellCenter, districtArea, nearestDistanceM, pointsFrom } from './support'
import { snapshotTheme } from '../data/osmSnapshot'
import type { AnalysisModule } from '../core/types'

interface AccessParams {
  hucreBoyutM: number
  tesisTuru: string
  esikM: number
}

const HEALTH = new Set(['hospital', 'clinic', 'doctors', 'pharmacy'])
const EDUCATION = new Set(['school', 'college', 'kindergarten'])
const SAFETY = new Set(['fire_station', 'police'])

function facilityFilter(type: string): (feature: Feature) => boolean {
  const set = type === 'egitim' ? EDUCATION : type === 'guvenlik' ? SAFETY : HEALTH
  return (feature) => {
    const amenity = feature.properties?.['amenity']
    return typeof amenity === 'string' && set.has(amenity)
  }
}

export const accessibilityAnalysis: AnalysisModule<AccessParams> = {
  id: 'erisilebilirlik',
  title: 'Ulaşım ve erişilebilirlik',
  category: 'ulasim',
  access: 'public',
  params: [
    { kind: 'number', name: 'hucreBoyutM', label: 'Hücre kenarı', default: 400, min: 200, max: 1000, step: 50, unit: 'm' },
    {
      kind: 'select',
      name: 'tesisTuru',
      label: 'Tesis türü',
      default: 'saglik',
      options: [
        { value: 'saglik', label: 'Sağlık' },
        { value: 'egitim', label: 'Eğitim' },
        { value: 'guvenlik', label: 'Güvenlik (itfaiye/emniyet)' },
      ],
    },
    { kind: 'number', name: 'esikM', label: 'Erişim açığı eşiği', default: 1000, min: 250, max: 5000, step: 250, unit: 'm' },
  ],

  async run(_ctx, params) {
    const area = await districtArea()
    const pois = await snapshotTheme('poi')
    const facilities = pointsFrom(pois, facilityFilter(params.tesisTuru))

    if (facilities.features.length === 0) {
      return {
        summary: 'Seçilen türde tesis bulunamadı.',
        metrics: [{ label: 'Tesis', value: 0 }],
      }
    }

    const cells = buildHexGrid(area, params.hucreBoyutM / 1000)
    const features: Feature<Polygon>[] = []
    let acikHucre = 0
    let toplamMesafe = 0
    let enUzak = 0

    for (const cell of cells) {
      const center = cellCenter(cell)
      const mesafe = nearestDistanceM(center, facilities)
      toplamMesafe += mesafe
      if (mesafe > enUzak) enUzak = mesafe
      if (mesafe > params.esikM) acikHucre += 1
      features.push({ ...cell, properties: { mesafe: Math.round(mesafe) } })
    }

    return {
      summary: `${facilities.features.length} tesise göre ${cells.length} hücre değerlendirildi; ${acikHucre} hücre ${params.esikM} m erişim eşiğinin dışında (erişim açığı).`,
      metrics: [
        { label: 'Tesis', value: facilities.features.length },
        { label: 'Erişim açığı hücresi', value: acikHucre },
        { label: 'Ortalama mesafe', value: Math.round(toplamMesafe / Math.max(1, cells.length)), unit: 'm' },
        { label: 'En uzak', value: Math.round(enUzak), unit: 'm' },
      ],
      geojson: {
        type: 'FeatureCollection',
        features: [...features, ...facilities.features],
      },
      style: {
        type: 'fill',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'mesafe'],
            0,
            '#1a9850',
            params.esikM,
            '#fee08b',
            params.esikM * 2,
            '#d73027',
          ],
          'fill-opacity': 0.55,
        },
      },
    }
  },
}
