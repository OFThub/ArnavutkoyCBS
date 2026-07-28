// Başarım istatistikleri ve sensör füzyonu matematiğinin testleri; gerçek donanım gerektirmez.

import { describe, expect, it } from 'vitest'
import {
  amdahlSerialFraction,
  median,
  percentile,
  scalingCurve,
  stdDev,
  summarize,
  throughput,
} from './stats'
import {
  acceptFix,
  angleDifference,
  applyHardIron,
  complementaryHeading,
  hardIronOffset,
  headingFromMagnetometer,
  normalizeAngle,
  smoothTrack,
  trackLengthM,
} from '../sensors/fusion'

describe('ölçüm istatistikleri', () => {
  it('tek ve çift uzunlukta medyan verir', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(Number.isNaN(median([]))).toBe(true)
  })

  it('yüzdelik sıralamayı doğru seçer', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(percentile(values, 0.95)).toBe(10)
    expect(percentile(values, 0.5)).toBe(5)
    expect(percentile(values, 0)).toBe(1)
  })

  it('standart sapmayı bilinen diziyle doğrular', () => {
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 6)
  })

  it('özet en iyi, medyan ve tekrar sayısını taşır', () => {
    const summary = summarize([10, 12, 11, 30])
    expect(summary.enIyiMs).toBe(10)
    expect(summary.medyanMs).toBe(11.5)
    expect(summary.tekrar).toBe(4)
    expect(summary.p95Ms).toBe(30)
  })

  it('verimi öğe/saniye olarak hesaplar', () => {
    expect(throughput(1_572_864, 175)).toBeCloseTo(8987794.3, 0)
    expect(Number.isNaN(throughput(100, 0))).toBe(true)
  })
})

describe('paralel ölçekleme', () => {
  it('hızlanmayı tek işçiye göre ölçer', () => {
    const curve = scalingCurve([
      { isciSayisi: 1, sureMs: 400 },
      { isciSayisi: 2, sureMs: 220 },
      { isciSayisi: 4, sureMs: 130 },
    ])
    expect(curve[0]?.hizlanma).toBe(1)
    expect(curve[1]?.hizlanma).toBeCloseTo(1.818, 3)
    expect(curve[2]?.hizlanma).toBeCloseTo(3.077, 3)
    expect(curve[2]?.verimlilik).toBeCloseTo(0.769, 3)
  })

  it('mükemmel ölçeklemede verimlilik 1 olur', () => {
    const curve = scalingCurve([
      { isciSayisi: 1, sureMs: 400 },
      { isciSayisi: 4, sureMs: 100 },
    ])
    expect(curve[1]?.verimlilik).toBeCloseTo(1, 6)
  })

  it('Amdahl seri oranını çıkarır', () => {
    expect(amdahlSerialFraction(4, 4)).toBeCloseTo(0, 6)
    expect(amdahlSerialFraction(4, 1)).toBeCloseTo(1, 6)
    expect(amdahlSerialFraction(2, 1.6)).toBeCloseTo(0.25, 6)
    expect(Number.isNaN(amdahlSerialFraction(1, 1))).toBe(true)
  })
})

describe('açı matematiği', () => {
  it('açıyı 0-360 aralığına indirger', () => {
    expect(normalizeAngle(370)).toBe(10)
    expect(normalizeAngle(-10)).toBe(350)
  })

  it('en kısa açı farkını verir, 0/360 sınırını doğru geçer', () => {
    expect(angleDifference(10, 350)).toBe(20)
    expect(angleDifference(350, 10)).toBe(-20)
    expect(angleDifference(180, 0)).toBe(180)
  })
})

describe('manyetometre kalibrasyonu', () => {
  it('sert-demir sapmasını min-max ortasından bulur', () => {
    const samples = [
      { x: 12, y: -3, z: 0 },
      { x: 2, y: 7, z: 4 },
      { x: 7, y: 2, z: 2 },
    ]
    expect(hardIronOffset(samples)).toEqual({ x: 7, y: 2, z: 2 })
  })

  it('sapma çıkarılınca merkezlenmiş değer kalır', () => {
    const offset = { x: 7, y: 2, z: 2 }
    expect(applyHardIron({ x: 12, y: -3, z: 0 }, offset)).toEqual({ x: 5, y: -5, z: -2 })
  })

  it('kalibre edilmiş eksenden yön açısı üretir', () => {
    expect(headingFromMagnetometer(1, 0)).toBeCloseTo(0, 6)
    expect(headingFromMagnetometer(0, 1)).toBeCloseTo(90, 6)
    expect(headingFromMagnetometer(-1, 0)).toBeCloseTo(180, 6)
  })

  it('boş örnekte sıfır sapma döner', () => {
    expect(hardIronOffset([])).toEqual({ x: 0, y: 0, z: 0 })
  })
})

describe('tamamlayıcı yön filtresi', () => {
  it('jiroskop tahminini pusulaya doğru çeker', () => {
    const next = complementaryHeading(
      90,
      { pusulaDerece: 100, jiroskopDereceSaniye: 0, dtSaniye: 1 },
      0.9,
    )
    expect(next).toBeCloseTo(91, 6)
  })

  it('alpha=1 iken yalnızca jiroskopu izler', () => {
    const next = complementaryHeading(
      0,
      { pusulaDerece: 180, jiroskopDereceSaniye: 10, dtSaniye: 1 },
      1,
    )
    expect(next).toBeCloseTo(10, 6)
  })

  it('gürültülü pusulayı yumuşatır, kararlı değere yakınsar', () => {
    let heading = 0
    const noisy = [92, 88, 91, 89, 90, 90, 91, 89, 90, 90]
    for (const pusula of noisy) {
      heading = complementaryHeading(
        heading,
        { pusulaDerece: pusula, jiroskopDereceSaniye: 0, dtSaniye: 0.1 },
        0.8,
      )
    }
    expect(heading).toBeGreaterThan(80)
    expect(heading).toBeLessThan(95)
  })

  it('360 sınırını sarmadan geçer', () => {
    const next = complementaryHeading(
      355,
      { pusulaDerece: 5, jiroskopDereceSaniye: 0, dtSaniye: 1 },
      0.5,
    )
    expect(next).toBeCloseTo(0, 6)
  })
})

describe('GNSS doğruluk kapısı ve iz', () => {
  const fix = (lng: number, lat: number, dogrulukM: number) => ({
    lng,
    lat,
    dogrulukM,
    zaman: 0,
  })

  it('doğruluğu eşiği aşan sabiti eler', () => {
    expect(acceptFix(fix(28.7, 41.2, 12), 30)).toBe(true)
    expect(acceptFix(fix(28.7, 41.2, 900), 30)).toBe(false)
    expect(acceptFix(fix(28.7, 41.2, 0), 30)).toBe(false)
  })

  it('geçersiz koordinatı reddeder', () => {
    expect(acceptFix(fix(28.7, 95, 5), 30)).toBe(false)
    expect(acceptFix(fix(Number.NaN, 41, 5), 30)).toBe(false)
  })

  it('yumuşatma doğruluğu iyi olan sabite daha çok ağırlık verir', () => {
    const smoothed = smoothTrack([fix(28.0, 41.0, 1), fix(29.0, 41.0, 100)], 2)
    expect(smoothed[1]?.lng).toBeLessThan(28.2)
  })

  it('iz uzunluğunu metre olarak hesaplar', () => {
    const length = trackLengthM([fix(28.7, 41.2, 5), fix(28.7, 41.201, 5)])
    expect(length).toBeCloseTo(110.5, 0)
  })
})
