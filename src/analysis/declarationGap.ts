// Vergi ve beyan dışı alan: harita bina alanı ile beyan edilen alanı karşılaştırıp beyansız ve eksik beyanlı binaları listeler.

import { area as turfArea } from '@turf/turf'
import type { Feature, MultiPolygon, Polygon } from 'geojson'
import { declarationGap, type DeclarationInput } from './core/declaration'
import { formatArea } from '../core/format'
import { supabase } from '../lib/supabase'
import type { AnalysisModule } from '../core/types'

interface DeclarationParams {
  esikYuzde: number
}

export const declarationGapAnalysis: AnalysisModule<DeclarationParams> = {
  id: 'beyan-disi',
  title: 'Vergi ve beyan dışı alan',
  category: 'idari',
  access: 'personel',
  params: [
    { kind: 'number', name: 'esikYuzde', label: 'Fark eşiği', default: 15, min: 0, max: 100, step: 5, unit: '%' },
  ],

  async run(_ctx, params) {
    if (!supabase) {
      return {
        summary:
          'Beyan dışı alan analizi bina ve beyan tablolarını gerektirir; sunucu bağlantısı yapılandırılmadığı için çalıştırılamıyor.',
        metrics: [],
      }
    }

    const { data: binalar, error: binaError } = await supabase
      .from('bina')
      .select('id, alan_m2, geom')
      .limit(20000)
    if (binaError) throw new Error(`Binalar okunamadı: ${binaError.message}`)

    const { data: beyanlar, error: beyanError } = await supabase
      .from('beyan')
      .select('bina_id, beyan_alan_m2')
    if (beyanError) throw new Error(`Beyanlar okunamadı: ${beyanError.message}`)

    if (!binalar || binalar.length === 0) {
      return {
        summary:
          'Bina verisi bulunamadı. Bu analiz, TAKBİS bina katmanı ve beyan kayıtları içe aktarıldığında haritada var olup beyanda olmayan alanları işaretler.',
        metrics: [{ label: 'Bina', value: 0 }, { label: 'Beyan', value: beyanlar?.length ?? 0 }],
      }
    }

    const beyanByBina = new Map<string, number>()
    for (const beyan of beyanlar ?? []) {
      beyanByBina.set(String(beyan.bina_id), Number(beyan.beyan_alan_m2) || 0)
    }

    const results = binalar.map((bina) => {
      const geom = bina.geom as unknown as Polygon | MultiPolygon | null
      const haritaAlan =
        bina.alan_m2 !== null
          ? Number(bina.alan_m2)
          : geom
            ? turfArea({ type: 'Feature', properties: {}, geometry: geom } as Feature)
            : 0
      const beyan = beyanByBina.get(String(bina.id))
      const input: DeclarationInput = {
        binaId: bina.id as string | number,
        haritaAlanM2: haritaAlan,
        beyanAlanM2: beyan ?? null,
      }
      return declarationGap(input, params.esikYuzde)
    })

    const beyansiz = results.filter((r) => r.durum === 'beyansiz')
    const eksik = results.filter((r) => r.durum === 'eksik-beyan')
    const toplamFark = [...beyansiz, ...eksik].reduce((sum, r) => sum + Math.max(0, r.farkM2), 0)

    return {
      summary: `${results.length} bina incelendi. ${beyansiz.length} beyansız, ${eksik.length} eksik beyanlı; toplam ${formatArea(toplamFark)} beyan dışı alan.`,
      metrics: [
        { label: 'İncelenen bina', value: results.length },
        { label: 'Beyansız', value: beyansiz.length },
        { label: 'Eksik beyan', value: eksik.length },
        { label: 'Beyan dışı alan', value: formatArea(toplamFark) },
      ],
      table: {
        columns: ['Bina', 'Harita m²', 'Beyan m²', 'Fark %', 'Durum'],
        rows: [...beyansiz, ...eksik]
          .slice(0, 40)
          .map((r) => [
            String(r.binaId),
            Math.round(r.haritaAlanM2),
            Math.round(r.beyanAlanM2),
            Math.round(r.farkYuzde),
            r.durum,
          ]),
      },
    }
  },
}
