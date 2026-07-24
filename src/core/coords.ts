// Ondalık derece ve derece-dakika-saniye koordinat metinlerinin çift yönlü ayrıştırılması ve biçimlenmesi.

export interface LngLatTuple {
  lng: number
  lat: number
}

type Axis = 'lat' | 'lng'

const HEMISPHERE: Record<string, { axis: Axis; sign: 1 | -1 }> = {
  N: { axis: 'lat', sign: 1 },
  K: { axis: 'lat', sign: 1 },
  S: { axis: 'lat', sign: -1 },
  G: { axis: 'lat', sign: -1 },
  E: { axis: 'lng', sign: 1 },
  D: { axis: 'lng', sign: 1 },
  W: { axis: 'lng', sign: -1 },
  B: { axis: 'lng', sign: -1 },
}

function sexagesimal(parts: number[]): number {
  return parts.reduce((total, part, index) => total + part / 60 ** index, 0)
}

export function parseCoordinate(input: string): LngLatTuple | null {
  const upper = input.trim().toUpperCase()
  if (upper.length === 0) return null

  const marks: { axis: Axis; sign: 1 | -1; at: number }[] = []
  for (let index = 0; index < upper.length; index += 1) {
    const letter = upper[index]
    const found = letter ? HEMISPHERE[letter] : undefined
    if (found) marks.push({ ...found, at: index })
  }
  if (marks.length > 2) return null
  if (marks.length === 2 && marks[0]?.axis === marks[1]?.axis) return null

  const cleaned = upper.replace(/[NSEWKGDB]/g, ' ').replace(/[°'"′″]/g, ' ')
  const numbers = cleaned.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
  if (numbers.length !== 2 && numbers.length !== 4 && numbers.length !== 6) return null

  const perValue = numbers.length / 2
  const first = sexagesimal(numbers.slice(0, perValue).map(Math.abs))
  const second = sexagesimal(numbers.slice(perValue).map(Math.abs))
  const firstNegative = (numbers[0] ?? 0) < 0
  const secondNegative = (numbers[perValue] ?? 0) < 0

  const leading = marks.reduce<{ axis: Axis; at: number } | null>(
    (best, mark) => (best === null || mark.at < best.at ? mark : best),
    null,
  )
  const firstAxis: Axis = leading?.axis ?? 'lat'

  const signFor = (axis: Axis, negative: boolean): 1 | -1 => {
    const mark = marks.find((candidate) => candidate.axis === axis)
    if (mark) return mark.sign
    return negative ? -1 : 1
  }

  const lat = firstAxis === 'lat' ? first : second
  const lng = firstAxis === 'lat' ? second : first
  const latNegative = firstAxis === 'lat' ? firstNegative : secondNegative
  const lngNegative = firstAxis === 'lat' ? secondNegative : firstNegative

  const result: LngLatTuple = {
    lat: lat * signFor('lat', latNegative),
    lng: lng * signFor('lng', lngNegative),
  }

  if (!Number.isFinite(result.lat) || !Number.isFinite(result.lng)) return null
  if (Math.abs(result.lat) > 90 || Math.abs(result.lng) > 180) return null
  return result
}

export function formatDecimal(lng: number, lat: number, digits = 5): string {
  return `${lat.toFixed(digits)}, ${lng.toFixed(digits)}`
}

export function toDms(value: number, axis: Axis): string {
  const positive = axis === 'lat' ? 'K' : 'D'
  const negative = axis === 'lat' ? 'G' : 'B'
  const letter = value < 0 ? negative : positive
  const absolute = Math.abs(value)
  const degrees = Math.floor(absolute)
  const minutesTotal = (absolute - degrees) * 60
  const minutes = Math.floor(minutesTotal)
  const seconds = (minutesTotal - minutes) * 60
  return `${degrees}°${String(minutes).padStart(2, '0')}'${seconds.toFixed(1).padStart(4, '0')}"${letter}`
}

export function formatDms(lng: number, lat: number): string {
  return `${toDms(lat, 'lat')} ${toDms(lng, 'lng')}`
}
