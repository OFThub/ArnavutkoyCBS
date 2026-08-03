// İmar elle giriş alanının testleri: koordinat ayrıştırma, geometri dönüşümü, EWKT ve satır hazırlama.

import { describe, expect, it } from 'vitest'
import type { MultiPolygon, Polygon } from 'geojson'
import {
  kapsamaDurumu,
  lekeRow,
  parseVertex,
  parseVertexList,
  planRow,
  polygonToVertices,
  sayi,
  tesisRow,
  toEwkt,
  toMultiPolygon,
  verticesToPolygon,
  yilEtiketi,
  type LekeGirdi,
  type LngLatPair,
  type PlanGirdi,
  type TesisGirdi,
} from './imar'

// Arnavutköy merkezinde ~1 km'lik bir kare; içine küçük bir tesis sığar.
const KARE: LngLatPair[] = [
  [28.74, 41.18],
  [28.75, 41.18],
  [28.75, 41.19],
  [28.74, 41.19],
]

function kare(vertices: LngLatPair[]): Polygon {
  const polygon = verticesToPolygon(vertices)
  if (!polygon) throw new Error('test geometrisi kurulamadı')
  return polygon
}

const LEKE_GEOM = kare(KARE)

const ICERIDE = kare([
  [28.743, 41.183],
  [28.746, 41.183],
  [28.746, 41.186],
  [28.743, 41.186],
])

const TASAN = kare([
  [28.748, 41.183],
  [28.756, 41.183],
  [28.756, 41.186],
  [28.748, 41.186],
])

const UZAKTA = kare([
  [28.9, 41.3],
  [28.91, 41.3],
  [28.91, 41.31],
  [28.9, 41.31],
])

const PLAN: PlanGirdi = {
  ad: 'Merkez Revizyon İmar Planı',
  olcek: '1/1000',
  onay_tarihi: '2026-03-14',
  aski_baslangic: '',
  aski_bitis: '',
  durum: 'yururlukte',
}

const LEKE: LekeGirdi = {
  fonksiyon: 'dini-tesis',
  taks: '0,30',
  kaks: '0.90',
  hmax: '12.5',
  kat_adedi: '3',
  yapi_nizami: 'ayrik',
  ada: '1520',
  parsel: '7',
  plan_notu: '  ',
}

const TESIS: TesisGirdi = {
  tur: 'cami',
  ad: 'Merkez Camii',
  alan_m2: '',
  kapasite: '750',
  durum: 'planlanan',
  yil: '2027',
  aciklama: '',
}

describe('sayı ve koordinat ayrıştırma', () => {
  it('Türkçe ondalık virgülü kabul eder, boşu null yapar', () => {
    expect(sayi('0,30')).toBe(0.3)
    expect(sayi('0.30')).toBe(0.3)
    expect(sayi('   ')).toBeNull()
    expect(sayi('abc')).toBeNull()
  })

  it('köşe satırını boylam-enlem sırasına çevirir', () => {
    expect(parseVertex('41.1840', '28.7400')).toEqual([28.74, 41.184])
  })

  it('aralık dışı koordinatı reddeder', () => {
    expect(parseVertex('91', '28.74')).toBeNull()
    expect(parseVertex('41.18', '181')).toBeNull()
    expect(parseVertex('', '28.74')).toBeNull()
  })

  it('toplu yapıştırmada ondalık ve DMS satırlarını okur, hatalı satırı bildirir', () => {
    const sonuc = parseVertexList('41.1840, 28.7400\nbozuk satır\n41°11\'02.4"K 28°44\'24.0"D\n')
    expect(sonuc.vertices).toHaveLength(2)
    expect(sonuc.vertices[0]).toEqual([28.74, 41.184])
    expect(sonuc.vertices[1]?.[0]).toBeCloseTo(28.74, 3)
    expect(sonuc.vertices[1]?.[1]).toBeCloseTo(41.184, 3)
    expect(sonuc.hataliSatirlar).toEqual([2])
  })
})

describe('geometri dönüşümü', () => {
  it('köşe listesini kapalı halkaya çevirir ve geri okur', () => {
    const polygon = kare(KARE)
    expect(polygon.coordinates[0]).toHaveLength(KARE.length + 1)
    expect(polygonToVertices(polygon)).toEqual(KARE)
  })

  it('üç köşeden azını poligon saymaz', () => {
    expect(verticesToPolygon([])).toBeNull()
    expect(verticesToPolygon(KARE.slice(0, 2))).toBeNull()
  })

  it('MultiPolygon dış halkasından köşeleri okur', () => {
    const multi = toMultiPolygon(LEKE_GEOM)
    expect(multi.type).toBe('MultiPolygon')
    expect(polygonToVertices(multi)).toEqual(KARE)
  })
})

describe('EWKT', () => {
  it('poligonu SRID ön ekiyle yazar', () => {
    expect(toEwkt({ type: 'Point', coordinates: [28.74, 41.18] })).toBe(
      'SRID=4326;POINT(28.74 41.18)',
    )
    expect(toEwkt(toMultiPolygon(LEKE_GEOM))).toBe(
      'SRID=4326;MULTIPOLYGON(((28.74 41.18,28.75 41.18,28.75 41.19,28.74 41.19,28.74 41.18)))',
    )
  })

  it('bozuk koordinatta sessizce yarım geometri üretmez', () => {
    const bozuk = {
      type: 'Polygon',
      coordinates: [[[28.74, 41.18], [Number.NaN, 41.18], [28.75, 41.19], [28.74, 41.18]]],
    } as Polygon
    expect(toEwkt(bozuk)).toBeNull()
    expect(toEwkt(null)).toBeNull()
    expect(toEwkt({ type: 'GeometryCollection', geometries: [] })).toBeNull()
  })
})

describe('kapsama doğrulaması', () => {
  it('içerideki, taşan ve tamamen dışarıdaki tesisi ayırır', () => {
    expect(kapsamaDurumu(ICERIDE, LEKE_GEOM)).toBe('icinde')
    expect(kapsamaDurumu(TASAN, LEKE_GEOM)).toBe('kismen')
    expect(kapsamaDurumu(UZAKTA, LEKE_GEOM)).toBe('disarida')
    expect(kapsamaDurumu(ICERIDE, null)).toBe('disarida')
  })

  it('MultiPolygon lekeyi parçalarına ayırarak değerlendirir', () => {
    const multi: MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [UZAKTA.coordinates, LEKE_GEOM.coordinates],
    }
    expect(kapsamaDurumu(ICERIDE, multi)).toBe('icinde')
  })
})

describe('satır hazırlama', () => {
  it('plan satırında boş tarihleri düşürür', () => {
    const { row, hata } = planRow(PLAN)
    expect(hata).toBeNull()
    expect(row).toEqual({
      ad: 'Merkez Revizyon İmar Planı',
      olcek: '1/1000',
      durum: 'yururlukte',
      onay_tarihi: '2026-03-14',
    })
  })

  it('plan adı ve ölçeği zorunlu', () => {
    expect(planRow({ ...PLAN, ad: '  ' }).hata).toBe('Plan adı zorunlu.')
    expect(planRow({ ...PLAN, olcek: '' }).hata).toBe('Plan ölçeği zorunlu.')
    expect(planRow({ ...PLAN, durum: 'uydurma' }).hata).toBe('Plan durumu geçersiz.')
  })

  it('leke satırını MultiPolygon EWKT ile kurar ve boş plan notunu düşürür', () => {
    const { row, hata } = lekeRow(LEKE, 7, LEKE_GEOM)
    expect(hata).toBeNull()
    expect(row?.['plan_id']).toBe(7)
    expect(row?.['taks']).toBe(0.3)
    expect(row?.['kat_adedi']).toBe(3)
    expect(row?.['plan_notu']).toBeUndefined()
    expect(String(row?.['geom'])).toMatch(/^SRID=4326;MULTIPOLYGON/)
  })

  it('plan, fonksiyon ve geometri eksikse yazmaz', () => {
    expect(lekeRow(LEKE, null, LEKE_GEOM).hata).toBe('Önce bir imar planı seçin.')
    expect(lekeRow({ ...LEKE, fonksiyon: '' }, 7, LEKE_GEOM).hata).toBe('Fonksiyon zorunlu.')
    expect(lekeRow(LEKE, 7, null).hata).toBe('En az üç köşeli bir alan çizin.')
  })

  it('tesis alanını geometriden hesaplar ve leke içindeyse uyarmaz', () => {
    const { row, hata, uyari } = tesisRow(TESIS, 12, ICERIDE, LEKE_GEOM)
    expect(hata).toBeNull()
    expect(uyari).toBeNull()
    expect(row?.['leke_id']).toBe(12)
    expect(row?.['tur']).toBe('cami')
    expect(row?.['yil']).toBe(2027)
    expect(Number(row?.['alan_m2'])).toBeGreaterThan(0)
    expect(String(row?.['geom'])).toMatch(/^SRID=4326;POLYGON/)
  })

  it('elle girilen alan geometriden hesaplanana üstün gelir', () => {
    const { row } = tesisRow({ ...TESIS, alan_m2: '1200' }, 12, ICERIDE, LEKE_GEOM)
    expect(row?.['alan_m2']).toBe(1200)
  })

  it('lekeden taşan tesisi uyararak kaydeder, tamamen dışarıdakini reddeder', () => {
    const tasan = tesisRow(TESIS, 12, TASAN, LEKE_GEOM)
    expect(tasan.hata).toBeNull()
    expect(tasan.uyari).toContain('dışına taşıyor')

    const disarida = tesisRow(TESIS, 12, UZAKTA, LEKE_GEOM)
    expect(disarida.row).toBeNull()
    expect(disarida.hata).toContain('tamamen üst imar lekesinin dışında')
  })

  it('üst leke, tür ve durum doğrulamaları', () => {
    expect(tesisRow(TESIS, null, ICERIDE, LEKE_GEOM).hata).toBe('Önce üst imar lekesini seçin.')
    expect(tesisRow({ ...TESIS, tur: '' }, 12, ICERIDE, LEKE_GEOM).hata).toBe('Tesis türü zorunlu.')
    expect(tesisRow({ ...TESIS, durum: 'uydurma' }, 12, ICERIDE, LEKE_GEOM).hata).toBe(
      'Tesis durumu geçersiz.',
    )
  })
})

describe('etiketler', () => {
  it('yıl etiketi duruma göre değişir', () => {
    expect(yilEtiketi('planlanan')).toBe('Hedef yıl')
    expect(yilEtiketi('mevcut')).toBe('Yapım yılı')
  })
})
