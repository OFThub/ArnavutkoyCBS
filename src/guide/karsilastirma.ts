// Mahalle karşılaştırmasının saf alanı: hangi göstergeler karşılaştırılır, nasıl sıralanır,
// hangi değer "en iyi" sayılır. Nüfus göstergeleri bilerek yönsüzdür (`notr`) — kazanan seçilmez.

import { formatDistance } from '../core/format'
import { formatAlan, formatKisi, formatYogunluk } from '../core/nufus'
import type { MahalleKarne } from './guideScore'

/** `notr`: büyük/küçük olması iyi ya da kötü demek değil, sadece gösterilir. */
export type Yon = 'yuksek-iyi' | 'dusuk-iyi' | 'notr'

export type MetrikGrubu = 'puan' | 'nufus' | 'deprem' | 'erisim' | 'hizmet' | 'altyapi'

export interface Metrik {
  key: string
  label: string
  grup: MetrikGrubu
  yon: Yon
  deger: (karne: MahalleKarne) => number | null
  bicim: (karne: MahalleKarne) => string
}

export const GRUP_ADI: Record<MetrikGrubu, string> = {
  puan: 'Genel',
  nufus: 'Nüfus ve alan',
  deprem: 'Deprem',
  erisim: 'Erişim',
  hizmet: 'Hizmetler',
  altyapi: 'Altyapı',
}

function mesafe(value: number | null): string {
  return value === null ? 'Veri yok' : formatDistance(value)
}

function adet(value: number | null): string {
  return value === null ? '—' : String(value)
}

export const METRIKLER: Metrik[] = [
  {
    key: 'genelPuan',
    label: 'Genel puan',
    grup: 'puan',
    yon: 'yuksek-iyi',
    deger: (k) => k.genelPuan,
    bicim: (k) => `${k.genelPuan} / 100`,
  },

  // ── Nüfus ve alan: yönsüz, genel puana girmez ──
  {
    key: 'nufus',
    label: 'Nüfus',
    grup: 'nufus',
    yon: 'notr',
    deger: (k) => k.nufus.nufus,
    bicim: (k) => formatKisi(k.nufus.nufus),
  },
  {
    key: 'alanKm2',
    label: 'Yüzölçümü',
    grup: 'nufus',
    yon: 'notr',
    deger: (k) => k.nufus.alanKm2,
    bicim: (k) => formatAlan(k.nufus.alanKm2),
  },
  {
    key: 'yogunluk',
    label: 'Nüfus yoğunluğu',
    grup: 'nufus',
    yon: 'notr',
    deger: (k) => k.nufus.yogunlukKisiKm2,
    bicim: (k) => formatYogunluk(k.nufus.yogunlukKisiKm2),
  },
  {
    key: 'yogunlukSinifi',
    label: 'Yoğunluk sınıfı',
    grup: 'nufus',
    yon: 'notr',
    deger: (k) => k.nufus.yogunlukKisiKm2,
    bicim: (k) => k.nufus.sinif?.label ?? '—',
  },
  {
    key: 'hane',
    label: 'Hane sayısı',
    grup: 'nufus',
    yon: 'notr',
    deger: (k) => k.nufus.hane,
    bicim: (k) => formatKisi(k.nufus.hane),
  },
  {
    key: 'haneBasinaKisi',
    label: 'Hane başına kişi',
    grup: 'nufus',
    yon: 'notr',
    deger: (k) => k.nufus.haneBasinaKisi,
    bicim: (k) => (k.nufus.haneBasinaKisi === null ? '—' : k.nufus.haneBasinaKisi.toFixed(1)),
  },

  // ── Deprem ──
  {
    key: 'depremPuan',
    label: 'Deprem puanı',
    grup: 'deprem',
    yon: 'yuksek-iyi',
    deger: (k) => k.deprem.puan,
    bicim: (k) => String(k.deprem.puan),
  },
  {
    key: 'agirHasarliBina',
    label: 'Ağır hasarlı bina',
    grup: 'deprem',
    yon: 'dusuk-iyi',
    deger: (k) => k.deprem.agirHasarliBina,
    bicim: (k) => adet(k.deprem.agirHasarliBina),
  },
  {
    key: 'canKaybi',
    label: 'Can kaybı beklentisi',
    grup: 'deprem',
    yon: 'dusuk-iyi',
    deger: (k) => k.deprem.canKaybi,
    bicim: (k) => adet(k.deprem.canKaybi),
  },
  {
    key: 'geciciBarinma',
    label: 'Geçici barınma',
    grup: 'deprem',
    yon: 'dusuk-iyi',
    deger: (k) => k.deprem.geciciBarinma,
    bicim: (k) => `${k.deprem.geciciBarinma} kişi`,
  },

  // ── Erişim ──
  {
    key: 'erisimPuan',
    label: 'Erişim puanı',
    grup: 'erisim',
    yon: 'yuksek-iyi',
    deger: (k) => k.erisim.puan,
    bicim: (k) => String(k.erisim.puan),
  },
  {
    key: 'hastaneM',
    label: 'Hastane mesafesi',
    grup: 'erisim',
    yon: 'dusuk-iyi',
    deger: (k) => k.erisim.hastaneM,
    bicim: (k) => mesafe(k.erisim.hastaneM),
  },
  {
    key: 'eczaneM',
    label: 'Eczane mesafesi',
    grup: 'erisim',
    yon: 'dusuk-iyi',
    deger: (k) => k.erisim.eczaneM,
    bicim: (k) => mesafe(k.erisim.eczaneM),
  },
  {
    key: 'okulM',
    label: 'Okul mesafesi',
    grup: 'erisim',
    yon: 'dusuk-iyi',
    deger: (k) => k.erisim.okulM,
    bicim: (k) => mesafe(k.erisim.okulM),
  },
  {
    key: 'durakM',
    label: 'Durak mesafesi',
    grup: 'erisim',
    yon: 'dusuk-iyi',
    deger: (k) => k.erisim.durakM,
    bicim: (k) => mesafe(k.erisim.durakM),
  },

  // ── Hizmetler ──
  {
    key: 'hizmetPuan',
    label: 'Hizmet puanı',
    grup: 'hizmet',
    yon: 'yuksek-iyi',
    deger: (k) => k.hizmet.puan,
    bicim: (k) => String(k.hizmet.puan),
  },
  {
    key: 'park',
    label: 'Park ve bahçe',
    grup: 'hizmet',
    yon: 'yuksek-iyi',
    deger: (k) => k.hizmet.park,
    bicim: (k) => adet(k.hizmet.park),
  },
  {
    key: 'pazar',
    label: 'Semt pazarı',
    grup: 'hizmet',
    yon: 'yuksek-iyi',
    deger: (k) => k.hizmet.pazar,
    bicim: (k) => adet(k.hizmet.pazar),
  },
  {
    key: 'durak',
    label: 'Otobüs durağı',
    grup: 'hizmet',
    yon: 'yuksek-iyi',
    deger: (k) => k.hizmet.durak,
    bicim: (k) => adet(k.hizmet.durak),
  },

  // ── Altyapı ──
  {
    key: 'altyapiPuan',
    label: 'Altyapı puanı',
    grup: 'altyapi',
    yon: 'yuksek-iyi',
    deger: (k) => k.altyapi.puan,
    bicim: (k) => String(k.altyapi.puan),
  },
  {
    key: 'icmeSuyuHasari',
    label: 'İçme suyu boru hasarı',
    grup: 'altyapi',
    yon: 'dusuk-iyi',
    deger: (k) => k.altyapi.icmeSuyuHasari,
    bicim: (k) => adet(k.altyapi.icmeSuyuHasari),
  },
]

export function metrikBul(key: string): Metrik | undefined {
  return METRIKLER.find((metrik) => metrik.key === key)
}

/**
 * Metriğe göre sıralar. Değeri olmayan mahalle daima sona düşer —
 * "veri yok" en iyi ya da en kötü sayılmamalı.
 */
export function sirala(
  karneler: MahalleKarne[],
  metrik: Metrik,
  artan = metrik.yon === 'dusuk-iyi',
): MahalleKarne[] {
  return [...karneler].sort((a, b) => {
    const x = metrik.deger(a)
    const y = metrik.deger(b)
    if (x === null && y === null) return a.ad.localeCompare(b.ad, 'tr')
    if (x === null) return 1
    if (y === null) return -1
    if (x === y) return a.ad.localeCompare(b.ad, 'tr')
    return artan ? x - y : y - x
  })
}

/**
 * Karşılaştırmada vurgulanacak mahallelerin UAVT kodları.
 * Yönsüz metrikte kazanan yoktur; berabere kalanların hepsi işaretlenir.
 */
export function enIyiler(karneler: MahalleKarne[], metrik: Metrik): string[] {
  if (metrik.yon === 'notr' || karneler.length < 2) return []

  const degerler = karneler
    .map((karne) => ({ uavt: karne.uavt, deger: metrik.deger(karne) }))
    .filter((item): item is { uavt: string; deger: number } => item.deger !== null)
  if (degerler.length === 0) return []

  const enIyi =
    metrik.yon === 'dusuk-iyi'
      ? Math.min(...degerler.map((item) => item.deger))
      : Math.max(...degerler.map((item) => item.deger))

  // Hepsi aynıysa vurgulamak bilgi taşımaz.
  if (degerler.every((item) => item.deger === enIyi) && degerler.length === karneler.length) {
    return []
  }
  return degerler.filter((item) => item.deger === enIyi).map((item) => item.uavt)
}

/** Mini çubuk için 0-1 aralığında oran; dizideki en büyük mutlak değere göre. */
export function cubukOrani(karneler: MahalleKarne[], metrik: Metrik, karne: MahalleKarne): number {
  const deger = metrik.deger(karne)
  if (deger === null) return 0
  const enBuyuk = Math.max(
    ...karneler.map((item) => Math.abs(metrik.deger(item) ?? 0)),
    0,
  )
  return enBuyuk > 0 ? Math.min(1, Math.abs(deger) / enBuyuk) : 0
}

export function siraNo(karneler: MahalleKarne[], metrik: Metrik, uavt: string): number | null {
  if (metrik.yon === 'notr') return null
  const sirali = sirala(karneler, metrik)
  const index = sirali.findIndex((karne) => karne.uavt === uavt)
  return index === -1 ? null : index + 1
}
