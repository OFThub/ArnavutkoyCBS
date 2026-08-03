// Yoğunluk hesabı ve sınıflandırması: eşikler kaymışsa mahalle yanlış etiketlenir.

import { describe, expect, it } from 'vitest'
import {
  formatAlan,
  formatYogunluk,
  haneBasinaKisi,
  oranEtiketi,
  ortalamayaOran,
  yogunluk,
  yogunlukSinifi,
} from './nufus'

describe('yogunluk', () => {
  it('kişi/km² hesaplar ve yuvarlar', () => {
    expect(yogunluk(24_180, 3.961)).toBe(6105)
    expect(yogunluk(0, 10)).toBe(0)
  })

  it('alan sıfır, negatif ya da eksikse hesaplamaz', () => {
    expect(yogunluk(1000, 0)).toBeNull()
    expect(yogunluk(1000, -5)).toBeNull()
    expect(yogunluk(1000, null)).toBeNull()
    expect(yogunluk(null, 10)).toBeNull()
    expect(yogunluk(Number.NaN, 10)).toBeNull()
  })
})

describe('yogunlukSinifi', () => {
  it('eşikleri doğru kademeye oturtur', () => {
    expect(yogunlukSinifi(11)?.key).toBe('kirsal')
    expect(yogunlukSinifi(249)?.key).toBe('kirsal')
    expect(yogunlukSinifi(250)?.key).toBe('seyrek')
    expect(yogunlukSinifi(1_499)?.key).toBe('seyrek')
    expect(yogunlukSinifi(1_500)?.key).toBe('orta')
    expect(yogunlukSinifi(4_419)?.key).toBe('orta')
    expect(yogunlukSinifi(5_000)?.key).toBe('yogun')
    expect(yogunlukSinifi(12_000)?.key).toBe('cok-yogun')
    expect(yogunlukSinifi(40_000)?.key).toBe('cok-yogun')
  })

  it('veri yoksa sınıf da yok', () => {
    expect(yogunlukSinifi(null)).toBeNull()
    expect(yogunlukSinifi(-1)).toBeNull()
    expect(yogunlukSinifi(Number.NaN)).toBeNull()
  })
})

describe('haneBasinaKisi', () => {
  it('bir ondalık basamakla döner', () => {
    expect(haneBasinaKisi(24_180, 7_112)).toBe(3.4)
  })

  it('hane sıfır ya da eksikse hesaplamaz', () => {
    expect(haneBasinaKisi(1000, 0)).toBeNull()
    expect(haneBasinaKisi(1000, null)).toBeNull()
  })
})

describe('ortalamayaOran', () => {
  it('ilçe ortalamasına oranı verir', () => {
    expect(ortalamayaOran(1_488, 744)).toBe(2)
    expect(ortalamayaOran(372, 744)).toBe(0.5)
  })

  it('ortalama yoksa oran da yok', () => {
    expect(ortalamayaOran(1000, null)).toBeNull()
    expect(ortalamayaOran(1000, 0)).toBeNull()
  })

  it('etiket yönü doğru okunur', () => {
    expect(oranEtiketi(2)).toBe('İlçe ortalamasının 2.0 katı')
    expect(oranEtiketi(0.5)).toBe("İlçe ortalamasının 50%'i")
    expect(oranEtiketi(1)).toBe('İlçe ortalaması düzeyinde')
    expect(oranEtiketi(null)).toBe('—')
  })
})

describe('biçimlendirme', () => {
  it('Türkçe binlik ayracı kullanır', () => {
    expect(formatYogunluk(6105)).toBe('6.105 kişi/km²')
    expect(formatAlan(3.961)).toBe('3,96 km²')
    expect(formatYogunluk(null)).toBe('—')
    expect(formatAlan(null)).toBe('—')
  })
})
