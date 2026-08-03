// Nüfus / yüzölçümü göstergeleri: yoğunluk hesabı ve "yoğun mu seyrek mi" sınıflandırması.
// Bilerek puanlanmaz — yüksek yoğunluk objektif olarak iyi ya da kötü değildir
// (hizmete erişimi artırır, kişi başına yeşil alanı azaltır). Karnede ham gösterge kalır.

export interface YogunlukSinifi {
  key: 'kirsal' | 'seyrek' | 'orta' | 'yogun' | 'cok-yogun'
  label: string
  aciklama: string
  color: string
}

/** Eşikler kişi/km²; kentsel planlama kademelerine göre mutlak, bu ilçeye göre göreli değil. */
const SINIFLAR: { esik: number; sinif: YogunlukSinifi }[] = [
  {
    esik: 12_000,
    sinif: {
      key: 'cok-yogun',
      label: 'Çok yoğun',
      aciklama: 'Yüksek katlı kentsel doku; kişi başına açık alan baskı altında',
      color: '#C8402F',
    },
  },
  {
    esik: 5_000,
    sinif: {
      key: 'yogun',
      label: 'Yoğun',
      aciklama: 'Sıkışık kentsel doku; hizmete erişim kolay, açık alan sınırlı',
      color: '#D9A02B',
    },
  },
  {
    esik: 1_500,
    sinif: {
      key: 'orta',
      label: 'Orta',
      aciklama: 'Dengeli kentsel doku',
      color: '#8aa2c0',
    },
  },
  {
    esik: 250,
    sinif: {
      key: 'seyrek',
      label: 'Seyrek',
      aciklama: 'Düşük yoğunluklu yerleşim; hizmet noktaları uzak olabilir',
      color: '#6E8B3D',
    },
  },
  {
    esik: 0,
    sinif: {
      key: 'kirsal',
      label: 'Kırsal',
      aciklama: 'Köy dokusu; nüfus geniş alana yayılmış',
      color: '#3f7a3f',
    },
  },
]

export const YOGUNLUK_SINIFLARI: YogunlukSinifi[] = SINIFLAR.map((item) => item.sinif)

export function yogunlukSinifi(kisiKm2: number | null): YogunlukSinifi | null {
  if (kisiKm2 === null || !Number.isFinite(kisiKm2) || kisiKm2 < 0) return null
  return SINIFLAR.find((item) => kisiKm2 >= item.esik)?.sinif ?? null
}

/** kişi/km². Alan yoksa ya da sıfırsa hesaplanamaz. */
export function yogunluk(nufus: number | null, alanKm2: number | null): number | null {
  if (nufus === null || alanKm2 === null) return null
  if (!Number.isFinite(nufus) || !Number.isFinite(alanKm2)) return null
  if (nufus < 0 || alanKm2 <= 0) return null
  return Math.round(nufus / alanKm2)
}

export function haneBasinaKisi(nufus: number | null, hane: number | null): number | null {
  if (nufus === null || hane === null) return null
  if (!Number.isFinite(nufus) || !Number.isFinite(hane) || hane <= 0 || nufus < 0) return null
  return Number((nufus / hane).toFixed(1))
}

/**
 * İlçe ortalamasına göre konum: "ilçe ortalamasının 2,4 katı".
 * Sınıf etiketi mutlak, bu oran görelidir; ikisi birlikte anlamlı.
 */
export function ortalamayaOran(kisiKm2: number | null, ilceOrtalamasi: number | null): number | null {
  if (kisiKm2 === null || ilceOrtalamasi === null) return null
  if (!Number.isFinite(kisiKm2) || !Number.isFinite(ilceOrtalamasi) || ilceOrtalamasi <= 0) {
    return null
  }
  return Number((kisiKm2 / ilceOrtalamasi).toFixed(2))
}

export function oranEtiketi(oran: number | null): string {
  if (oran === null) return '—'
  if (oran >= 1.15) return `İlçe ortalamasının ${oran.toFixed(1)} katı`
  if (oran <= 0.85) return `İlçe ortalamasının ${Math.round(oran * 100)}%'i`
  return 'İlçe ortalaması düzeyinde'
}

export function formatKisi(value: number | null): string {
  return value === null ? '—' : value.toLocaleString('tr-TR')
}

export function formatYogunluk(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString('tr-TR')} kişi/km²`
}

export function formatAlan(km2: number | null): string {
  if (km2 === null) return '—'
  return `${km2.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km²`
}
