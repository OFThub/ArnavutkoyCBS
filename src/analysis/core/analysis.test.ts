// Faz 4 analiz çekirdeğinin testleri: MCDA, UAVT kod, kazı çakışma, taşkın indeksi, tahliye açığı, beyan farkı.

import { describe, expect, it } from 'vitest'
import { computeRanges, normalizeValue, normalizeWeights, scoreCells } from './mcda'
import { buildUavtCode, isUniqueCode, isValidMahalleUavt, parseUavtCode } from './uavt'
import { daysOverlap, findExcavationConflicts } from './excavation'
import { classifyFlood, floodIndex } from './flood'
import { evacuationGap, evacuationReport } from './evacuation'
import { declarationGap } from './declaration'

describe('MCDA', () => {
  it('fayda ve maliyet ölçütünü ters normalleştirir', () => {
    expect(normalizeValue(5, 0, 10, 'benefit')).toBe(0.5)
    expect(normalizeValue(5, 0, 10, 'cost')).toBe(0.5)
    expect(normalizeValue(0, 0, 10, 'cost')).toBe(1)
    expect(normalizeValue(10, 0, 10, 'benefit')).toBe(1)
  })

  it('aralık dışını kırpar, sabit alanda 0,5 verir', () => {
    expect(normalizeValue(-5, 0, 10, 'benefit')).toBe(0)
    expect(normalizeValue(15, 0, 10, 'benefit')).toBe(1)
    expect(normalizeValue(7, 5, 5, 'benefit')).toBe(0.5)
  })

  it('ağırlıkları toplamı 1 olacak şekilde ölçekler', () => {
    const criteria = [
      { key: 'a', label: 'A', weight: 3, direction: 'benefit' as const },
      { key: 'b', label: 'B', weight: 1, direction: 'cost' as const },
    ]
    const normalized = normalizeWeights(criteria)
    expect(normalized[0]?.weight).toBeCloseTo(0.75, 6)
    expect(normalized[1]?.weight).toBeCloseTo(0.25, 6)
    expect(normalized.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1, 6)
  })

  it('sıfır ağırlıkta eşit dağıtır', () => {
    const normalized = normalizeWeights([
      { key: 'a', label: 'A', weight: 0, direction: 'benefit' },
      { key: 'b', label: 'B', weight: 0, direction: 'benefit' },
    ])
    expect(normalized[0]?.weight).toBe(0.5)
  })

  it('hücreleri skora göre sıralar, en iyi ölçütleri birleştirir', () => {
    const cells = [
      { egim: 1, yolMesafe: 100 },
      { egim: 20, yolMesafe: 1000 },
      { egim: 5, yolMesafe: 400 },
    ]
    const ranked = scoreCells(cells, [
      { key: 'egim', label: 'Eğim', weight: 1, direction: 'cost' },
      { key: 'yolMesafe', label: 'Yola mesafe', weight: 1, direction: 'cost' },
    ])
    expect(ranked[0]?.cell.egim).toBe(1)
    expect(ranked[ranked.length - 1]?.cell.egim).toBe(20)
  })

  it('aralık hesabı eksik değeri yok sayar', () => {
    const ranges = computeRanges([{ a: 10 }, { a: 30 }], ['a'])
    expect(ranges.get('a')).toEqual({ key: 'a', min: 10, max: 30 })
  })
})

describe('UAVT kod', () => {
  it('bileşenlerden 20 haneli kod üretir', () => {
    const code = buildUavtCode({
      mahalleUavt: '40490',
      csbmKod: '123',
      binaNo: '7',
      bagimsizBolumNo: '12',
    })
    expect(code).toHaveLength(20)
    expect(code).toBe('00404900012300070012')
  })

  it('üretilen kod tekrar ayrıştırılabilir', () => {
    const components = { mahalleUavt: '40490', csbmKod: '00123', binaNo: '0007', bagimsizBolumNo: '0012' }
    const parsed = parseUavtCode(buildUavtCode(components))
    expect(parsed?.mahalleUavt).toBe('0040490')
    expect(parsed?.binaNo).toBe('0007')
  })

  it('geçersiz mahalle kodunu ve rakam dışı girdiyi reddeder', () => {
    expect(isValidMahalleUavt('40490')).toBe(true)
    expect(isValidMahalleUavt('40')).toBe(false)
    expect(isValidMahalleUavt('abc')).toBe(false)
    expect(() => buildUavtCode({ mahalleUavt: '40490', csbmKod: 'X', binaNo: '1', bagimsizBolumNo: '1' })).toThrow()
  })

  it('yanlış uzunlukta kodu ayrıştırmaz', () => {
    expect(parseUavtCode('123')).toBeNull()
    expect(parseUavtCode('0040490001230007001X')).toBeNull()
  })

  it('benzersizlik kontrolü çalışır', () => {
    const existing = ['00404900012300070012']
    expect(isUniqueCode('00404900012300070013', existing)).toBe(true)
    expect(isUniqueCode('00404900012300070012', existing)).toBe(false)
  })
})

describe('Kazı çakışma', () => {
  it('tarih aralığı örtüşmesini gün olarak hesaplar', () => {
    expect(daysOverlap('2026-01-01', '2026-01-10', '2026-01-05', '2026-01-20')).toBe(6)
    expect(daysOverlap('2026-01-01', '2026-01-10', '2026-02-01', '2026-02-10')).toBe(0)
    expect(daysOverlap('2026-01-01', '2026-01-01', '2026-01-01', '2026-01-01')).toBe(1)
  })

  it('kasten örtüştürülmüş iki yakın kaydı yakalar, uzak olanı elemez', () => {
    const line = (x: number): GeoJSON.LineString => ({
      type: 'LineString',
      coordinates: [
        [x, 41],
        [x + 0.001, 41],
      ],
    })
    const permits = [
      { id: 'A', kurum: 'İSKİ', baslangic: '2026-03-01', bitis: '2026-03-20', geometry: line(28.7) },
      { id: 'B', kurum: 'İGDAŞ', baslangic: '2026-03-10', bitis: '2026-03-30', geometry: line(28.7) },
      { id: 'C', kurum: 'BEDAŞ', baslangic: '2026-03-10', bitis: '2026-03-30', geometry: line(29.5) },
    ]
    const conflicts = findExcavationConflicts(permits, {
      proximityM: 30,
      segmentDistance: (a, b) => {
        const ax = a.coordinates[0]?.[0] ?? 0
        const bx = b.coordinates[0]?.[0] ?? 0
        return Math.abs(ax - bx) * 85000
      },
    })
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.a).toBe('A')
    expect(conflicts[0]?.b).toBe('B')
    expect(conflicts[0]?.gunlukCakisma).toBe(11)
  })
})

describe('Taşkın indeksi', () => {
  it('alçak-düz-suya yakın en yüksek riski verir', () => {
    const high = floodIndex({ elevation: 10, slopePercent: 1, distanceToWaterM: 20 })
    const low = floodIndex({ elevation: 200, slopePercent: 30, distanceToWaterM: 2000 })
    expect(high).toBeGreaterThan(0.9)
    expect(low).toBeLessThan(0.1)
    expect(classifyFlood(high)).toBe('cok-yuksek')
    expect(classifyFlood(low)).toBe('dusuk')
  })

  it('sınıf eşiklerini uygular', () => {
    expect(classifyFlood(0.8)).toBe('cok-yuksek')
    expect(classifyFlood(0.6)).toBe('yuksek')
    expect(classifyFlood(0.3)).toBe('orta')
    expect(classifyFlood(0.1)).toBe('dusuk')
  })
})

describe('Tahliye açığı', () => {
  it('kapasite ihtiyacın altındaysa açık verir', () => {
    const result = evacuationGap({
      mahalleUavt: '40490',
      mahalleAd: 'ADNAN MENDERES',
      geciciBarinma: 5000,
      kapasiteKisi: 3000,
    })
    expect(result.acik).toBe(2000)
    expect(result.karsilanmaOrani).toBeCloseTo(0.6, 6)
  })

  it('kapasite yeterliyse açık sıfırdır', () => {
    const result = evacuationGap({
      mahalleUavt: '1',
      mahalleAd: 'X',
      geciciBarinma: 1000,
      kapasiteKisi: 4000,
    })
    expect(result.acik).toBe(0)
    expect(result.karsilanmaOrani).toBe(1)
  })

  it('rapor açık veren mahalleleri öne alır ve toplar', () => {
    const report = evacuationReport([
      { mahalleUavt: '1', mahalleAd: 'A', geciciBarinma: 100, kapasiteKisi: 500 },
      { mahalleUavt: '2', mahalleAd: 'B', geciciBarinma: 900, kapasiteKisi: 100 },
    ])
    expect(report.acikVerenMahalle).toBe(1)
    expect(report.rows[0]?.mahalleAd).toBe('B')
    expect(report.toplamAcik).toBe(800)
  })
})

describe('Beyan farkı', () => {
  it('beyansız binayı işaretler', () => {
    const result = declarationGap({ binaId: 1, haritaAlanM2: 200, beyanAlanM2: null }, 10)
    expect(result.durum).toBe('beyansiz')
    expect(result.farkM2).toBe(200)
  })

  it('eşik aşan eksik beyanı yakalar, uyumluyu geçer', () => {
    expect(declarationGap({ binaId: 2, haritaAlanM2: 200, beyanAlanM2: 150 }, 10).durum).toBe('eksik-beyan')
    expect(declarationGap({ binaId: 3, haritaAlanM2: 200, beyanAlanM2: 195 }, 10).durum).toBe('uyumlu')
  })
})
