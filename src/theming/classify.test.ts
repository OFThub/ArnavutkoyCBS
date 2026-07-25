// Tematik sınıflandırma testleri: eşit aralık, kantil, Jenks doğal kırılım ve sınıf ataması.

import { describe, expect, it } from 'vitest'
import { classOf, classify, equalInterval, jenks, quantile, rampColors } from './classify'

describe('eşit aralık', () => {
  it('aralığı eşit böler', () => {
    expect(equalInterval([0, 100], 4)).toEqual([25, 50, 75])
    expect(equalInterval([10, 20, 30, 40, 50], 5)).toEqual([18, 26, 34, 42])
  })
})

describe('kantil', () => {
  it('her sınıfa yaklaşık eşit sayıda öğe koyar', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8]
    const breaks = quantile(values, 4)
    expect(breaks).toHaveLength(3)
    expect(breaks[0]).toBeLessThan(breaks[1]!)
    expect(breaks[1]).toBeLessThan(breaks[2]!)
  })
})

describe('Jenks doğal kırılım', () => {
  it('belirgin kümeleri ayıran sınırlar bulur', () => {
    const values = [1, 2, 3, 100, 101, 102, 500, 501, 502]
    const breaks = jenks(values, 3)
    expect(breaks).toHaveLength(2)
    expect(breaks[0]).toBeGreaterThan(3)
    expect(breaks[0]).toBeLessThanOrEqual(100)
    expect(breaks[1]).toBeGreaterThan(102)
    expect(breaks[1]).toBeLessThanOrEqual(500)
  })

  it('kümeleri doğru gruplar', () => {
    const values = [1, 2, 3, 100, 101, 102, 500, 501, 502]
    const breaks = jenks(values, 3)
    expect(classOf(2, breaks)).toBe(0)
    expect(classOf(101, breaks)).toBe(1)
    expect(classOf(501, breaks)).toBe(2)
  })

  it('öğe sayısı sınıftan azsa çöküp hata vermez', () => {
    expect(jenks([5], 3)).toEqual([])
    expect(jenks([], 4)).toEqual([])
  })
})

describe('sınıf ataması ve renk', () => {
  it('değeri doğru sınıfa yerleştirir', () => {
    const breaks = [10, 20, 30]
    expect(classOf(5, breaks)).toBe(0)
    expect(classOf(10, breaks)).toBe(1)
    expect(classOf(25, breaks)).toBe(2)
    expect(classOf(100, breaks)).toBe(3)
  })

  it('sınıf sayısı kadar renk üretir', () => {
    expect(rampColors(5)).toHaveLength(5)
    expect(rampColors(3)).toHaveLength(3)
    expect(rampColors(3).every((c) => c.startsWith('#'))).toBe(true)
  })

  it('classify seçilen yöntemi uygular ve min/max taşır', () => {
    const result = classify([1, 2, 3, 4, 5], 'esit-aralik', 4)
    expect(result.method).toBe('esit-aralik')
    expect(result.min).toBe(1)
    expect(result.max).toBe(5)
    expect(result.breaks).toHaveLength(3)
  })
})
