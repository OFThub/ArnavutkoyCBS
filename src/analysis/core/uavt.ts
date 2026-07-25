// Numarataj/MAKS için bağımsız bölüm UAVT kodu üretimi, doğrulaması ve bileşen ayrıştırması.

export interface UavtComponents {
  mahalleUavt: string
  csbmKod: string
  binaNo: string
  bagimsizBolumNo: string
}

const DIGIT = /^\d+$/

export function isValidMahalleUavt(value: string): boolean {
  return DIGIT.test(value) && value.length >= 4 && value.length <= 7
}

function pad(value: string, length: number): string {
  return value.padStart(length, '0').slice(-length)
}

export function buildUavtCode(components: UavtComponents): string {
  if (!isValidMahalleUavt(components.mahalleUavt)) {
    throw new Error('Geçersiz mahalle UAVT kodu')
  }
  for (const [label, value] of [
    ['CSBM kodu', components.csbmKod],
    ['Bina no', components.binaNo],
    ['Bağımsız bölüm no', components.bagimsizBolumNo],
  ] as const) {
    if (!DIGIT.test(value)) throw new Error(`${label} yalnızca rakam içermeli`)
  }

  return [
    pad(components.mahalleUavt, 7),
    pad(components.csbmKod, 5),
    pad(components.binaNo, 4),
    pad(components.bagimsizBolumNo, 4),
  ].join('')
}

export function parseUavtCode(code: string): UavtComponents | null {
  if (!DIGIT.test(code) || code.length !== 20) return null
  return {
    mahalleUavt: code.slice(0, 7),
    csbmKod: code.slice(7, 12),
    binaNo: code.slice(12, 16),
    bagimsizBolumNo: code.slice(16, 20),
  }
}

export function isUniqueCode(code: string, existing: Iterable<string>): boolean {
  for (const item of existing) {
    if (item === code) return false
  }
  return true
}
