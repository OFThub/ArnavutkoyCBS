// Türkçe normalizasyon, sayı/CSV çözümlemesi ve UAVT eşleştirmesinin birim testleri.

import { describe, expect, it } from 'vitest'
import {
  depremSenaryoRowSchema,
  isValidUavt,
  joinByUavt,
  mahalleKey,
  normalizeName,
  normalizeUavt,
  parseCsv,
  parseTrNumber,
  splitDelimited,
  toInt,
  trLower,
  trUpper,
} from './normalize'

describe('Türkçe harf dönüşümü', () => {
  it('I harfini noktasız ı yapar', () => {
    expect(trLower('I')).toBe('ı')
    expect(trLower('ISIKLI')).toBe('ısıklı')
  })

  it('İ harfini noktasız i yapar', () => {
    expect(trLower('İMRAHOR')).toBe('imrahor')
  })

  it('i harfini büyütürken noktayı korur', () => {
    expect(trUpper('istanbul')).toBe('İSTANBUL')
  })

  it('varsayılan locale ile aynı sonucu vermez', () => {
    expect(trLower('I')).not.toBe('I'.toLowerCase())
  })
})

describe('normalizeName', () => {
  it('aksanları sadeleştirip eşleştirme anahtarı üretir', () => {
    expect(normalizeName('HADIMKÖY')).toBe('hadimkoy')
    expect(normalizeName('Boğazköy İstiklal')).toBe('bogazkoy istiklal')
    expect(normalizeName('  Taşoluk   ')).toBe('tasoluk')
  })

  it('farklı yazımları aynı anahtara indirger', () => {
    expect(normalizeName('ARNAVUTKÖY')).toBe(normalizeName('Arnavutköy'))
  })
})

describe('mahalleKey', () => {
  it('mahalle son eklerini atar', () => {
    expect(mahalleKey('Hadımköy Mah.')).toBe('hadimkoy')
    expect(mahalleKey('TAŞOLUK MAHALLESİ')).toBe('tasoluk')
    expect(mahalleKey('Deliklikaya Mh')).toBe('deliklikaya')
  })

  it('mahalle geçen adları bozmaz', () => {
    expect(mahalleKey('Yeni Mahalle Sokak')).toBe('yeni mahalle sokak')
  })

  it('Beşiktaş ilçesindeki Arnavutköy mahallesini ilçeyle karıştırmaz', () => {
    const satirlar = [
      { ilce_adi: 'ARNAVUTKÖY', mahalle_adi: 'HADIMKÖY' },
      { ilce_adi: 'BEŞİKTAŞ', mahalle_adi: 'ARNAVUTKÖY' },
    ]
    const ilceninMahalleleri = satirlar.filter((satir) => mahalleKey(satir.ilce_adi) === 'arnavutkoy')

    expect(ilceninMahalleleri).toHaveLength(1)
    expect(ilceninMahalleleri[0]?.mahalle_adi).toBe('HADIMKÖY')
  })
})

describe('UAVT kodu', () => {
  it('rakam dışı karakterleri temizler', () => {
    expect(normalizeUavt(' 12345 ')).toBe('12345')
    expect(normalizeUavt('MK-987654')).toBe('987654')
    expect(normalizeUavt(123456)).toBe('123456')
  })

  it('boş değerleri null döndürür', () => {
    expect(normalizeUavt('')).toBeNull()
    expect(normalizeUavt(null)).toBeNull()
    expect(normalizeUavt('abc')).toBeNull()
  })

  it('geçerlilik uzunluğunu kontrol eder', () => {
    expect(isValidUavt('123456')).toBe(true)
    expect(isValidUavt('12')).toBe(false)
    expect(isValidUavt(null)).toBe(false)
  })
})

describe('parseTrNumber', () => {
  it('binlik ve ondalık ayracını Türkçe biçimde çözer', () => {
    expect(parseTrNumber('1.234,56')).toBe(1234.56)
    expect(parseTrNumber('12,5')).toBe(12.5)
    expect(parseTrNumber('1.234')).toBe(1234)
    expect(parseTrNumber('160')).toBe(160)
  })

  it('ondalık noktalı koordinatları bozmaz', () => {
    expect(parseTrNumber('28.6554')).toBeCloseTo(28.6554, 4)
    expect(parseTrNumber('41.24835')).toBeCloseTo(41.24835, 5)
  })

  it('boş ve geçersiz değerleri null yapar', () => {
    expect(parseTrNumber('')).toBeNull()
    expect(parseTrNumber('-')).toBeNull()
    expect(parseTrNumber('abc')).toBeNull()
    expect(parseTrNumber(null)).toBeNull()
  })

  it('toInt boş değeri sıfıra çeker', () => {
    expect(toInt('')).toBe(0)
    expect(toInt('1.234')).toBe(1234)
    expect(toInt('12,6')).toBe(13)
  })
})

describe('splitDelimited', () => {
  it('tırnak içindeki ayracı alan sonu saymaz', () => {
    const rows = splitDelimited('a;b\n"x;y";z\n', ';')
    expect(rows).toEqual([
      ['a', 'b'],
      ['x;y', 'z'],
    ])
  })

  it('CRLF ve BOM ile başa çıkar', () => {
    const rows = splitDelimited('﻿a;b\r\n1;2\r\n', ';')
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})

describe('parseCsv', () => {
  it('başlıkları normalize edilmiş sütun adlarına çevirir', () => {
    const rows = parseCsv('İlçe Adı;Mahalle Adı;Mahalle Köy UAVT\nArnavutköy;Hadımköy;12345\n', ';')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      ilce_adi: 'Arnavutköy',
      mahalle_adi: 'Hadımköy',
      mahalle_koy_uavt: '12345',
    })
  })

  it('boş satırları atar', () => {
    const rows = parseCsv('a;b\n1;2\n;\n', ';')
    expect(rows).toHaveLength(1)
  })
})

describe('joinByUavt', () => {
  it('kod üzerinden eşleştirir ve artıkları raporlar', () => {
    const sol = [{ uavt: '111' }, { uavt: '222' }, { uavt: null }]
    const sag = [{ kod: '111', ad: 'A' }, { kod: '333', ad: 'C' }]

    const report = joinByUavt(
      sol,
      sag,
      (item) => item.uavt,
      (item) => item.kod,
    )

    expect(report.matched).toHaveLength(1)
    expect(report.matched[0]?.right.ad).toBe('A')
    expect(report.unmatchedLeft).toHaveLength(2)
    expect(report.unmatchedRight.map((item) => item.kod)).toEqual(['333'])
  })
})

describe('depremSenaryoRowSchema', () => {
  const gecerli = {
    ilce_adi: 'Arnavutköy',
    mahalle_adi: 'Hadımköy',
    mahalle_koy_uavt: '12345',
    cok_agir_hasarli_bina_sayisi: '12',
    agir_hasarli_bina_sayisi: '34',
    orta_hasarli_bina_sayisi: '',
    hafif_hasarli_bina_sayisi: '1.234',
    can_kaybi_sayisi: '5',
    agir_yarali_sayisi: '6',
    hastanede_tedavi_sayisi: '7',
    hafif_yarali_sayisi: '8',
    dogalgaz_boru_hasari: '9',
    icme_suyu_boru_hasari: '10',
    atik_su_boru_hasari: '11',
    gecici_barinma: '2.500',
  }

  it('metin sayıları tam sayıya çevirir', () => {
    const parsed = depremSenaryoRowSchema.parse(gecerli)
    expect(parsed.cok_agir_hasarli_bina_sayisi).toBe(12)
    expect(parsed.orta_hasarli_bina_sayisi).toBe(0)
    expect(parsed.hafif_hasarli_bina_sayisi).toBe(1234)
    expect(parsed.gecici_barinma).toBe(2500)
  })

  it('UAVT kodunu normalize eder', () => {
    const parsed = depremSenaryoRowSchema.parse({ ...gecerli, mahalle_koy_uavt: ' 12-345 ' })
    expect(parsed.mahalle_koy_uavt).toBe('12345')
  })

  it('UAVT kodu okunamayan satırı reddeder', () => {
    const result = depremSenaryoRowSchema.safeParse({ ...gecerli, mahalle_koy_uavt: 'yok' })
    expect(result.success).toBe(false)
  })
})
