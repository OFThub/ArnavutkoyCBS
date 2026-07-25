// İmar uyumsuzluğu / kaçak yapılaşma: bina geometrisini imar lekesiyle çakıştırıp yapılaşmaya kapalı lekedeki ve parselsiz binaları bulur.

import { booleanIntersects } from '@turf/turf'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { supabase } from '../lib/supabase'
import type { AnalysisModule } from '../core/types'

interface ZoningParams {
  yapilasmayaKapali: boolean
}

const KAPALI_FONKSIYON = new Set(['yesil-alan', 'park', 'agac', 'rekreasyon', 'tarim', 'orman', 'su'])

export const zoningComplianceAnalysis: AnalysisModule<ZoningParams> = {
  id: 'imar-uyumsuzluk',
  title: 'İmar uyumsuzluğu ve kaçak yapılaşma',
  category: 'imar',
  access: 'personel',
  params: [
    {
      kind: 'boolean',
      name: 'yapilasmayaKapali',
      label: 'Yapılaşmaya kapalı lekedeki binalar',
      default: true,
    },
  ],

  async run(_ctx, params) {
    if (!supabase) {
      return {
        summary:
          'İmar uyumsuzluğu analizi imar lekesi ve bina katmanlarını gerektirir; sunucu bağlantısı yapılandırılmadığı için çalıştırılamıyor. Belediye imar planı ve TAKBİS bina verisi yüklendiğinde çalışır.',
        metrics: [],
      }
    }

    const { data: lekeler, error: lekeError } = await supabase
      .from('imar_lekesi')
      .select('id, fonksiyon, geom')
      .limit(5000)
    if (lekeError) throw new Error(`İmar lekeleri okunamadı: ${lekeError.message}`)

    const { data: binalar, error: binaError } = await supabase
      .from('bina')
      .select('id, parsel_id, geom')
      .limit(20000)
    if (binaError) throw new Error(`Binalar okunamadı: ${binaError.message}`)

    if (!lekeler || lekeler.length === 0 || !binalar || binalar.length === 0) {
      return {
        summary:
          'İmar lekesi veya bina verisi bulunamadı. Bu analiz, imar planı ve bina katmanı içe aktarıldığında yapılaşmaya kapalı lekelerdeki binaları işaretler.',
        metrics: [
          { label: 'İmar lekesi', value: lekeler?.length ?? 0 },
          { label: 'Bina', value: binalar?.length ?? 0 },
        ],
      }
    }

    const violations: Feature[] = []
    let parselsiz = 0

    for (const bina of binalar) {
      const binaGeom = bina.geom as unknown as Polygon | MultiPolygon | null
      if (!binaGeom) continue
      const binaFeature: Feature<Polygon | MultiPolygon> = {
        type: 'Feature',
        properties: { id: bina.id },
        geometry: binaGeom,
      }
      if (bina.parsel_id === null) parselsiz += 1

      for (const leke of lekeler) {
        const fonksiyon = String(leke.fonksiyon ?? '')
        if (params.yapilasmayaKapali && !KAPALI_FONKSIYON.has(fonksiyon)) continue
        const lekeGeom = leke.geom as unknown as Polygon | MultiPolygon | null
        if (!lekeGeom) continue
        const lekeFeature: Feature<Polygon | MultiPolygon> = {
          type: 'Feature',
          properties: {},
          geometry: lekeGeom,
        }
        if (booleanIntersects(binaFeature, lekeFeature)) {
          violations.push({
            ...binaFeature,
            properties: { id: bina.id, fonksiyon, ihlal: 'yapilasmaya-kapali' },
          })
          break
        }
      }
    }

    const collection: FeatureCollection = { type: 'FeatureCollection', features: violations }

    return {
      summary: `${binalar.length} bina, ${lekeler.length} imar lekesiyle çakıştırıldı. ${violations.length} bina yapılaşmaya kapalı lekede; ${parselsiz} bina parselsiz.`,
      metrics: [
        { label: 'İncelenen bina', value: binalar.length },
        { label: 'Kaçak (kapalı leke)', value: violations.length },
        { label: 'Parselsiz bina', value: parselsiz },
      ],
      geojson: collection,
      style: { type: 'fill', paint: { 'fill-color': '#d7191c', 'fill-opacity': 0.6 } },
    }
  },
}
