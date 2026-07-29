// Karne puanlaması vatandaşa "buraya taşınayım mı" cevabı veriyor; sınır davranışı yanlışsa tavsiye yanlış olur.

import { describe, expect, it } from 'vitest'
import type { Feature } from 'geojson'
import { duzPuan, enYakinMesafe, puanEtiketi, tersPuan } from './guideScore'

function nokta(lng: number, lat: number): Feature {
  return { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {} }
}

describe('tersPuan', () => {
  it('iyi eşiğinde ve altında 100 verir', () => {
    expect(tersPuan(0, 0, 200)).toBe(100)
    expect(tersPuan(-5, 0, 200)).toBe(100)
  })

  it('kötü eşiğinde ve üstünde 0 verir', () => {
    expect(tersPuan(200, 0, 200)).toBe(0)
    expect(tersPuan(5000, 0, 200)).toBe(0)
  })

  it('orta noktada 50 civarı verir', () => {
    expect(tersPuan(100, 0, 200)).toBe(50)
  })

  it('sonlu olmayan değerde 0 verir', () => {
    expect(tersPuan(Number.NaN, 0, 200)).toBe(0)
    expect(tersPuan(Number.POSITIVE_INFINITY, 0, 200)).toBe(0)
  })
})

describe('duzPuan', () => {
  it('hedefe ulaşınca 100 verir ve üstünde artmaz', () => {
    expect(duzPuan(5, 5)).toBe(100)
    expect(duzPuan(50, 5)).toBe(100)
  })

  it('sıfır ve negatif sayımda 0 verir', () => {
    expect(duzPuan(0, 5)).toBe(0)
    expect(duzPuan(-2, 5)).toBe(0)
  })

  it('yarı yolda 50 verir', () => {
    expect(duzPuan(5, 10)).toBe(50)
  })
})

describe('puanEtiketi', () => {
  it('eşik sınırlarını doğru adlandırır', () => {
    expect(puanEtiketi(80)).toBe('Çok iyi')
    expect(puanEtiketi(79)).toBe('İyi')
    expect(puanEtiketi(60)).toBe('İyi')
    expect(puanEtiketi(59)).toBe('Orta')
    expect(puanEtiketi(40)).toBe('Orta')
    expect(puanEtiketi(39)).toBe('Zayıf')
    expect(puanEtiketi(20)).toBe('Zayıf')
    expect(puanEtiketi(0)).toBe('Çok zayıf')
  })
})

describe('enYakinMesafe', () => {
  it('hiç nokta yoksa null döner', () => {
    expect(enYakinMesafe([28.7, 41.2], [])).toBeNull()
  })

  it('en yakın noktayı seçer', () => {
    const mesafe = enYakinMesafe([28.7, 41.2], [nokta(28.9, 41.2), nokta(28.71, 41.2)])
    expect(mesafe).not.toBeNull()
    // 0.01° boylam ≈ 840 m (41. enlemde); uzaktaki 0.2°'lik nokta seçilmemeli.
    expect(mesafe!).toBeLessThan(1000)
  })

  it('nokta olmayan geometrileri atlar', () => {
    const cizgi: Feature = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [28.7, 41.2],
          [28.71, 41.21],
        ],
      },
      properties: {},
    }
    expect(enYakinMesafe([28.7, 41.2], [cizgi])).toBeNull()
  })
})
