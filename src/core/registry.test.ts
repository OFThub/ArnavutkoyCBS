// Rol tabanlı erişim ile katman/analiz kayıt defterlerinin genişletme sözleşmesine uyumunun testleri.

import { beforeEach, describe, expect, it } from 'vitest'
import { canAccess, canWrite, isAdmin, parseRole } from './access'
import {
  clearLayerRegistry,
  listLayers,
  listLayersByGroup,
  registerLayer,
} from './layerRegistry'
import {
  clearAnalysisRegistry,
  defaultParams,
  getAnalysis,
  listAnalyses,
  registerAnalysis,
} from './analysisRegistry'
import type { AnalysisModule, LayerModule } from './types'

function layer(id: string, access: 'public' | 'personel'): LayerModule {
  return {
    id,
    title: id,
    group: 'kent',
    access,
    register: () => {},
    setVisible: () => {},
  }
}

function analysis(id: string, access: 'public' | 'personel'): AnalysisModule<never> {
  return {
    id,
    title: id,
    category: 'mekansal',
    access,
    params: [
      { kind: 'number', name: 'mesafe', label: 'Mesafe', default: 500, unit: 'm' },
      { kind: 'boolean', name: 'kirp', label: 'Kırp', default: true },
      { kind: 'geometry', name: 'alan', label: 'Alan', geometry: 'Polygon' },
    ],
    run: async () => ({ summary: '', metrics: [] }),
  }
}

describe('erişim kuralları', () => {
  it('kamu katmanını herkes görür', () => {
    expect(canAccess('public', 'public')).toBe(true)
    expect(canAccess('personel', 'public')).toBe(true)
  })

  it('personel katmanını anonim kullanıcı göremez', () => {
    expect(canAccess('public', 'personel')).toBe(false)
    expect(canAccess('personel', 'personel')).toBe(true)
    expect(canAccess('yonetici', 'personel')).toBe(true)
  })

  it('yazma yetkisi ve yöneticilik ayrışır', () => {
    expect(canWrite('public')).toBe(false)
    expect(canWrite('personel')).toBe(true)
    expect(isAdmin('personel')).toBe(false)
    expect(isAdmin('yonetici')).toBe(true)
  })

  it('bilinmeyen rol public sayılır', () => {
    expect(parseRole('admin')).toBe('public')
    expect(parseRole(undefined)).toBe('public')
    expect(parseRole('yonetici')).toBe('yonetici')
  })
})

describe('katman kayıt defteri', () => {
  beforeEach(() => clearLayerRegistry())

  it('role göre filtreler', () => {
    registerLayer(layer('bina', 'public'))
    registerLayer(layer('parsel', 'personel'))

    expect(listLayers('public').map((item) => item.id)).toEqual(['bina'])
    expect(listLayers('personel')).toHaveLength(2)
  })

  it('aynı kimlikle ikinci kaydı reddeder', () => {
    registerLayer(layer('bina', 'public'))
    expect(() => registerLayer(layer('bina', 'public'))).toThrow(/zaten kayıtlı/)
  })

  it('aynı modülün yeniden kaydı sorun değildir', () => {
    const modul = layer('bina', 'public')
    registerLayer(modul)
    expect(() => registerLayer(modul)).not.toThrow()
  })

  it('gruplara ayırır', () => {
    registerLayer(layer('bina', 'public'))
    const grouped = listLayersByGroup('public')
    expect(grouped.get('kent')).toHaveLength(1)
    expect(grouped.get('risk')).toBeUndefined()
  })
})

describe('analiz kayıt defteri', () => {
  beforeEach(() => clearAnalysisRegistry())

  it('kimlikle geri getirir ve role göre filtreler', () => {
    registerAnalysis(analysis('tampon', 'public'))
    registerAnalysis(analysis('imar-uyumsuzluk', 'personel'))

    expect(getAnalysis('tampon')?.title).toBe('tampon')
    expect(listAnalyses('public')).toHaveLength(1)
    expect(listAnalyses('yonetici')).toHaveLength(2)
  })

  it('varsayılan parametreleri üretir, geometri parametresini dışarıda bırakır', () => {
    const modul = analysis('tampon', 'public')
    registerAnalysis(modul)
    expect(defaultParams(modul)).toEqual({ mesafe: 500, kirp: true })
  })
})
