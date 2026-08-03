// Harita etiketleri MapLibre ifadesi olduğu için hatalar ancak katman kurulurken patlar ve
// kullanıcı boş etiket görür. Burada ifadeler gerçek stil şemasıyla derlenip değerlendirilir:
// haritada görünecek metnin birebir aynısı doğrulanır.

import { describe, expect, it } from 'vitest'
import { createExpression } from '@maplibre/maplibre-gl-style-spec'
import { LEKE_ETIKETI, TESIS_ETIKETI } from './kurumsal'

const METIN_SPEC = {
  type: 'string',
  'property-type': 'data-driven',
  expression: { interpolated: false, parameters: ['zoom', 'feature'] },
}

function yaz(ifade: unknown, properties: Record<string, unknown>): string {
  const derlenmis = createExpression(ifade, METIN_SPEC as never)
  if (derlenmis.result === 'error') {
    throw new Error(derlenmis.value.map((item) => item.message).join(' | '))
  }
  return String(
    derlenmis.value.evaluate({ zoom: 14 } as never, { properties, type: 3 } as never),
  )
}

describe('imar lekesi etiketi', () => {
  it('fonksiyon, ada/parsel ve yapılaşma koşullarını satır satır yazar', () => {
    expect(
      yaz(LEKE_ETIKETI, {
        fonksiyon: 'dini-tesis',
        ada: '1520',
        parsel: '7',
        kaks: 0.5,
        taks: 0.25,
        hmax: 24.5,
        kat_adedi: 2,
      }),
    ).toBe('Dini tesis\nAda/Parsel 1520/7\nE:0.5 · T:0.25 · Hmax:24.5 · 2 kat')
  })

  it('boş alanlar satırdan tamamen düşer, yarım ek bırakmaz', () => {
    expect(
      yaz(LEKE_ETIKETI, {
        fonksiyon: 'konut',
        ada: null,
        parsel: null,
        kaks: 1.8,
        taks: null,
        hmax: null,
        kat_adedi: null,
      }),
    ).toBe('Konut\nE:1.8')
  })

  it('tanınmayan fonksiyonu ham değeriyle gösterir', () => {
    expect(yaz(LEKE_ETIKETI, { fonksiyon: 'akaryakit-istasyonu' })).toBe('akaryakit-istasyonu\n')
  })
})

describe('imar tesisi etiketi', () => {
  it('ad, tür, alan, kapasite, durum ve yılı yazar', () => {
    expect(
      yaz(TESIS_ETIKETI, {
        ad: 'Merkez Camii',
        tur: 'cami',
        alan_m2: 1200,
        kapasite: 750,
        durum: 'planlanan',
        yil: 2027,
      }),
    ).toBe('Merkez Camii\nCami · 1200 m² · 750 kişi\nPlanlanan · 2027')
  })

  it('ad yoksa tür adını başlığa çıkarır', () => {
    expect(
      yaz(TESIS_ETIKETI, {
        ad: null,
        tur: 'cocuk-bahcesi',
        alan_m2: 260,
        kapasite: null,
        durum: 'yapim_asamasinda',
        yil: 2026,
      }),
    ).toBe('Çocuk bahçesi\nÇocuk bahçesi · 260 m²\nYapım aşamasında · 2026')
  })

  it('PostgREST numeric alanı metin olarak dönerse de sayıyı okur', () => {
    expect(
      yaz(TESIS_ETIKETI, {
        ad: 'Semt Kütüphanesi',
        tur: 'kutuphane',
        alan_m2: '380.00',
        kapasite: null,
        durum: 'mevcut',
        yil: 2019,
      }),
    ).toBe('Semt Kütüphanesi\nKütüphane · 380 m²\nMevcut · 2019')
  })
})
