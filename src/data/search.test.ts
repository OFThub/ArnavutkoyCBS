// Arama Türkçe'ye duyarlı olmalı: "ısıklar" ile "Işıklar" aynı yeri bulmalı, sıralama isabetliyi öne almalı.

import { describe, expect, it } from 'vitest'
import { normalize, rank, score, type SearchHit } from './search'

function hit(ad: string): SearchHit {
  return { id: ad, ad, tur: 'Mahalle', merkez: [28.7, 41.2] }
}

describe('normalize', () => {
  it('büyük I ve İ harflerini doğru küçültür', () => {
    expect(normalize('IŞIKLAR')).toBe('ısıklar')
    expect(normalize('İSTASYON')).toBe('istasyon')
  })

  it('aksanları düşürür', () => {
    expect(normalize('Boğazköy')).toBe('bogazkoy')
    expect(normalize('ÇİFTLİK')).toBe('ciftlik')
  })

  it('baş ve son boşluğu atar', () => {
    expect(normalize('  Hadımköy  ')).toBe('hadımkoy')
  })
})

describe('score', () => {
  it('tam eşleşme en yüksek puanı alır', () => {
    expect(score('Boğazköy', 'boğazköy')).toBe(3)
  })

  it('başlangıç eşleşmesi içerme eşleşmesinden yüksektir', () => {
    expect(score('Hadımköy', 'hadım')).toBe(2)
    expect(score('Yeni Hadımköy', 'hadım')).toBe(1)
  })

  it('eşleşmeyen 0 alır', () => {
    expect(score('Boğazköy', 'ankara')).toBe(0)
  })

  it('boş sorgu 0 alır', () => {
    expect(score('Boğazköy', '')).toBe(0)
  })
})

describe('rank', () => {
  it('isabetliyi öne alır ve eşleşmeyeni atar', () => {
    const sonuc = rank([hit('Yeni Hadımköy'), hit('Hadımköy'), hit('Boğazköy')], 'hadım')
    expect(sonuc.map((item) => item.ad)).toEqual(['Hadımköy', 'Yeni Hadımköy'])
  })

  it('eşit puanda Türkçe alfabetik sıralar', () => {
    const sonuc = rank([hit('Şahintepe'), hit('Sazlıbosna')], 's')
    expect(sonuc[0]?.ad).toBe('Sazlıbosna')
  })

  it('limit uygular', () => {
    const cok = Array.from({ length: 30 }, (_, index) => hit(`Mahalle ${index}`))
    expect(rank(cok, 'mahalle', 5)).toHaveLength(5)
  })

  it('boş sorguda hiçbir şey döndürmez', () => {
    expect(rank([hit('Boğazköy')], '')).toEqual([])
  })
})
