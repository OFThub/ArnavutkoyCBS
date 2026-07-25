// Afet tahliye planı: İBB resmî geçici barınma ihtiyacını mahalle bazında toplanma alanı kapasitesiyle karşılaştırıp açık veren mahalleleri listeler.

import type { FeatureCollection } from 'geojson'
import { evacuationReport, type EvacuationInput } from './core/evacuation'
import { loadDataset } from '../core/dataset'
import { formatCount } from '../core/format'
import type { AnalysisModule } from '../core/types'

interface DepremRow {
  mahalle_koy_uavt: string
  mahalle_adi?: string
  gecici_barinma?: number
}

interface DepremFile {
  kayitlar?: DepremRow[]
}

interface EvacuationParams {
  yalnizAcik: boolean
}

export const evacuationAnalysis: AnalysisModule<EvacuationParams> = {
  id: 'tahliye-plani',
  title: 'Afet tahliye planı',
  category: 'afet',
  access: 'public',
  params: [{ kind: 'boolean', name: 'yalnizAcik', label: 'Yalnız açık veren mahalleler', default: true }],

  async run(_ctx, params) {
    const [depremRaw, mahalleData] = await Promise.all([
      loadDataset<DepremFile>('depremSenaryo'),
      loadDataset<FeatureCollection>('mahalle'),
    ])

    const depremRows: DepremRow[] = depremRaw.kayitlar ?? []

    const nameByUavt = new Map<string, string>()
    for (const feature of mahalleData.features) {
      const props = feature.properties ?? {}
      nameByUavt.set(String(props['uavt_kod']), String(props['ad'] ?? ''))
    }

    let toplanma: FeatureCollection = { type: 'FeatureCollection', features: [] }
    try {
      toplanma = await loadDataset<FeatureCollection>('toplanmaAlani')
    } catch {
      toplanma = { type: 'FeatureCollection', features: [] }
    }

    const kapasiteByUavt = new Map<string, number>()
    for (const feature of toplanma.features) {
      const props = feature.properties ?? {}
      const uavt = String(props['mahalle_uavt'] ?? '')
      const kapasite = Number(props['kapasite_kisi']) || 0
      kapasiteByUavt.set(uavt, (kapasiteByUavt.get(uavt) ?? 0) + kapasite)
    }

    const inputs: EvacuationInput[] = depremRows.map((row) => {
      const uavt = String(row.mahalle_koy_uavt)
      return {
        mahalleUavt: uavt,
        mahalleAd: row.mahalle_adi ?? nameByUavt.get(uavt) ?? uavt,
        geciciBarinma: Number(row.gecici_barinma ?? 0),
        kapasiteKisi: kapasiteByUavt.get(uavt) ?? 0,
      }
    })

    const report = evacuationReport(inputs)
    const rows = params.yalnizAcik ? report.rows.filter((row) => row.acik > 0) : report.rows

    const toplanmaNote =
      toplanma.features.length === 0
        ? ' Toplanma alanı verisi henüz yüklenmediği için kapasite sıfır kabul edildi; tüm ihtiyaç açık görünüyor.'
        : ''

    return {
      summary: `${inputs.length} mahallenin resmî geçici barınma ihtiyacı ${formatCount(report.toplamIhtiyac)} kişi; toplanma kapasitesi ${formatCount(report.toplamKapasite)} kişi. ${report.acikVerenMahalle} mahalle açık veriyor.${toplanmaNote}`,
      metrics: [
        { label: 'Toplam ihtiyaç', value: formatCount(report.toplamIhtiyac), unit: 'kişi' },
        { label: 'Toplam kapasite', value: formatCount(report.toplamKapasite), unit: 'kişi' },
        { label: 'Toplam açık', value: formatCount(report.toplamAcik), unit: 'kişi' },
        { label: 'Açık veren mahalle', value: report.acikVerenMahalle },
      ],
      table: {
        columns: ['Mahalle', 'İhtiyaç', 'Kapasite', 'Açık', 'Karşılanma %'],
        rows: rows
          .slice(0, 40)
          .map((row) => [
            row.mahalleAd,
            formatCount(row.ihtiyac),
            formatCount(row.kapasite),
            formatCount(row.acik),
            Math.round(row.karsilanmaOrani * 100),
          ]),
      },
      chart: {
        type: 'bar',
        xKey: 'mahalle',
        series: [
          { key: 'ihtiyac', label: 'İhtiyaç' },
          { key: 'kapasite', label: 'Kapasite' },
        ],
        data: report.rows
          .slice(0, 10)
          .map((row) => ({ mahalle: row.mahalleAd, ihtiyac: row.ihtiyac, kapasite: row.kapasite })),
      },
    }
  },
}
