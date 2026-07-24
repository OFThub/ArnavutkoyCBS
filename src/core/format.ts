// Uzunluk, alan ve sayı değerlerinin Türkçe yerel biçimde metne dönüştürülmesi.

const LOCALE = 'tr-TR'

function fixed(value: number, digits: number): string {
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '—'
  const abs = Math.abs(meters)
  if (abs < 1000) return `${fixed(meters, abs < 10 ? 2 : 1)} m`
  return `${fixed(meters / 1000, 2)} km`
}

export function formatArea(squareMeters: number): string {
  if (!Number.isFinite(squareMeters)) return '—'
  const abs = Math.abs(squareMeters)
  if (abs < 10000) return `${fixed(squareMeters, 0)} m²`
  if (abs < 1_000_000) return `${fixed(squareMeters / 10000, 2)} ha`
  return `${fixed(squareMeters / 1_000_000, 2)} km²`
}

export function formatCount(value: number): string {
  return value.toLocaleString(LOCALE)
}

export function formatScaleLabel(metersPerPixel: number, pixels: number): string {
  return formatDistance(metersPerPixel * pixels)
}

export function metersPerPixel(latitude: number, zoom: number): number {
  return (40075016.686 * Math.cos((latitude * Math.PI) / 180)) / (512 * 2 ** zoom)
}
