// Karşılaştırma mantığı: yön (yüksek/düşük iyi), veri yokun sona düşmesi ve
// nüfus göstergelerinde kazanan seçilmemesi.

import { describe, expect, it } from 'vitest'
import { yogunlukSinifi } from '../core/nufus'
import type { MahalleKarne } from './guideScore'
import { METRIKLER, cubukOrani, enIyiler, metrikBul, sirala, siraNo } from './karsilastirma'

function karne(
  ad: string,
  ayar: {
    genelPuan?: number
    nufus?: number | null
    alanKm2?: number | null
    yogunluk?: number | null
    hastaneM?: number | null
    agir?: number
  } = {},
): MahalleKarne {
  const yog = ayar.yogunluk ?? null
  return {
    uavt: ad,
    ad,
    merkez: [28.7, 41.2],
    nufus: {
      nufus: ayar.nufus ?? null,
      hane: null,
      alanKm2: ayar.alanKm2 ?? null,
      yogunlukKisiKm2: yog,
      haneBasinaKisi: null,
      ilceOrani: null,
      sinif: yogunlukSinifi(yog),
      tahmini: true,
      veriYili: 2023,
      kaynak: 'test',
    },
    deprem: {
      puan: 50,
      etiket: 'Orta',
      agirHasarliBina: ayar.agir ?? 0,
      toplamHasarliBina: 0,
      canKaybi: 0,
      geciciBarinma: 0,
    },
    erisim: {
      puan: 50,
      etiket: 'Orta',
      hastaneM: ayar.hastaneM ?? null,
      eczaneM: null,
      okulM: null,
      parkM: null,
      durakM: null,
    },
    hizmet: { puan: 50, etiket: 'Orta', park: 0, kablosuzAg: 0, geriDonusum: 0, pazar: 0, durak: 0 },
    altyapi: {
      puan: 50,
      etiket: 'Orta',
      dogalgazHasari: 0,
      icmeSuyuHasari: 0,
      atikSuHasari: 0,
    },
    genelPuan: ayar.genelPuan ?? 50,
  }
}

const KARNELER = [
  karne('HİCRET', { genelPuan: 64, nufus: 8_000, alanKm2: 1.81, yogunluk: 4_419, hastaneM: 1_200, agir: 312 }),
  karne('BALABAN', { genelPuan: 71, nufus: 300, alanKm2: 27.3, yogunluk: 11, hastaneM: 3_400, agir: 88 }),
  karne('BOLLUCA', { genelPuan: 58, nufus: 18_000, alanKm2: 6.2, yogunluk: 2_903, hastaneM: null, agir: 201 }),
]

describe('sirala', () => {
  it('yüksek-iyi metrikte büyükten küçüğe sıralar', () => {
    const sonuc = sirala(KARNELER, metrikBul('genelPuan')!)
    expect(sonuc.map((k) => k.ad)).toEqual(['BALABAN', 'HİCRET', 'BOLLUCA'])
  })

  it('düşük-iyi metrikte küçükten büyüğe sıralar', () => {
    const sonuc = sirala(KARNELER, metrikBul('agirHasarliBina')!)
    expect(sonuc.map((k) => k.ad)).toEqual(['BALABAN', 'BOLLUCA', 'HİCRET'])
  })

  it('veri yok olan mahalle en iyi sayılmaz, sona düşer', () => {
    const sonuc = sirala(KARNELER, metrikBul('hastaneM')!)
    expect(sonuc.map((k) => k.ad)).toEqual(['HİCRET', 'BALABAN', 'BOLLUCA'])
  })

  it('yön açıkça verilirse ters sıralanabilir', () => {
    const sonuc = sirala(KARNELER, metrikBul('yogunluk')!, true)
    expect(sonuc.map((k) => k.ad)).toEqual(['BALABAN', 'BOLLUCA', 'HİCRET'])
  })
})

describe('enIyiler', () => {
  it('yüksek-iyi metrikte en yüksek değeri işaretler', () => {
    expect(enIyiler(KARNELER, metrikBul('genelPuan')!)).toEqual(['BALABAN'])
  })

  it('düşük-iyi metrikte en düşük değeri işaretler', () => {
    expect(enIyiler(KARNELER, metrikBul('hastaneM')!)).toEqual(['HİCRET'])
  })

  it('nüfus göstergelerinde kazanan seçilmez', () => {
    expect(enIyiler(KARNELER, metrikBul('nufus')!)).toEqual([])
    expect(enIyiler(KARNELER, metrikBul('yogunluk')!)).toEqual([])
    expect(enIyiler(KARNELER, metrikBul('alanKm2')!)).toEqual([])
  })

  it('hepsi aynıysa vurgulama yapılmaz', () => {
    const esit = [karne('A', { genelPuan: 50 }), karne('B', { genelPuan: 50 })]
    expect(enIyiler(esit, metrikBul('genelPuan')!)).toEqual([])
  })

  it('berabere kalanların hepsi işaretlenir', () => {
    const liste = [
      karne('A', { genelPuan: 80 }),
      karne('B', { genelPuan: 80 }),
      karne('C', { genelPuan: 40 }),
    ]
    expect(enIyiler(liste, metrikBul('genelPuan')!)).toEqual(['A', 'B'])
  })

  it('tek mahalle karşılaştırma değildir', () => {
    expect(enIyiler([KARNELER[0]!], metrikBul('genelPuan')!)).toEqual([])
  })
})

describe('cubukOrani', () => {
  it('dizideki en büyük değere göre 0-1 arası oran verir', () => {
    const metrik = metrikBul('yogunluk')!
    expect(cubukOrani(KARNELER, metrik, KARNELER[0]!)).toBe(1)
    expect(cubukOrani(KARNELER, metrik, KARNELER[1]!)).toBeCloseTo(11 / 4419, 4)
  })

  it('veri yoksa çubuk boş kalır', () => {
    expect(cubukOrani(KARNELER, metrikBul('hastaneM')!, KARNELER[2]!)).toBe(0)
  })
})

describe('siraNo', () => {
  it('yönlü metrikte sıra verir', () => {
    expect(siraNo(KARNELER, metrikBul('genelPuan')!, 'HİCRET')).toBe(2)
  })

  it('yönsüz metrikte sıra anlamlı değil', () => {
    expect(siraNo(KARNELER, metrikBul('yogunluk')!, 'HİCRET')).toBeNull()
  })
})

describe('METRIKLER', () => {
  it('anahtarlar benzersiz', () => {
    const anahtarlar = METRIKLER.map((m) => m.key)
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length)
  })

  it('nüfus grubunun tamamı yönsüz — genel puana karışmaz', () => {
    const nufusMetrikleri = METRIKLER.filter((m) => m.grup === 'nufus')
    expect(nufusMetrikleri.length).toBeGreaterThan(0)
    expect(nufusMetrikleri.every((m) => m.yon === 'notr')).toBe(true)
  })

  it('her metrik veri yok durumunda da biçimlenebilir', () => {
    const bos = karne('BOŞ')
    for (const metrik of METRIKLER) {
      expect(typeof metrik.bicim(bos)).toBe('string')
    }
  })
})
