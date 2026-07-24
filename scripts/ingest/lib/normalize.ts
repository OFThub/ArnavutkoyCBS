// Türkçe metin/sayı normalizasyonu, Windows-1254 CSV çözümlemesi, UAVT eşleştirmesi ve zod şema doğrulaması.

import iconv from 'iconv-lite'
import { z } from 'zod'

const DIACRITICS: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
  ê: 'e',
}

const MAHALLE_SUFFIX = /\s+(mahallesi|mahalle|mah|mh)\.?$/

export function trLower(value: string): string {
  return value.toLocaleLowerCase('tr')
}

export function trUpper(value: string): string {
  return value.toLocaleUpperCase('tr')
}

export function deaccent(value: string): string {
  let out = ''
  for (const char of value) out += DIACRITICS[char] ?? char
  return out
}

export function collapseSpace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function normalizeName(value: string): string {
  return deaccent(trLower(collapseSpace(value)))
}

export function mahalleKey(value: string): string {
  return normalizeName(value).replace(MAHALLE_SUFFIX, '').trim()
}

export function normalizeUavt(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const digits = String(value).replace(/\D/g, '')
  return digits.length > 0 ? digits : null
}

export function isValidUavt(value: string | number | null | undefined): boolean {
  const code = normalizeUavt(value)
  return code !== null && code.length >= 5 && code.length <= 10
}

export function parseTrNumber(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (value === null || value === undefined) return null

  const raw = value.trim()
  if (raw === '' || raw === '-') return null

  const hasDot = raw.includes('.')
  const hasComma = raw.includes(',')

  let candidate: string
  if (hasDot && hasComma) {
    candidate = raw.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    candidate = raw.replace(',', '.')
  } else if (hasDot) {
    const tail = raw.slice(raw.lastIndexOf('.') + 1)
    candidate = tail.length === 3 ? raw.replace(/\./g, '') : raw
  } else {
    candidate = raw
  }

  const parsed = Number(candidate.replace(/\s/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

export function toInt(value: string | number | null | undefined): number {
  const parsed = parseTrNumber(value)
  return parsed === null ? 0 : Math.round(parsed)
}

export function decodeWindows1254(buffer: Buffer): string {
  return iconv.decode(buffer, 'win1254')
}

export function splitDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  for (let i = 0; i < body.length; i += 1) {
    const char = body[i] as string

    if (quoted) {
      if (char === '"') {
        if (body[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''))
}

export function parseCsv(text: string, delimiter = ';'): Record<string, string>[] {
  const rows = splitDelimited(text, delimiter)
  const header = rows.shift()
  if (!header) return []

  const columns = header.map((name) => normalizeName(name).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''))

  return rows.map((cells) => {
    const record: Record<string, string> = {}
    columns.forEach((column, index) => {
      record[column] = (cells[index] ?? '').trim()
    })
    return record
  })
}

export interface JoinReport<L, R> {
  matched: { left: L; right: R }[]
  unmatchedLeft: L[]
  unmatchedRight: R[]
}

export function joinByUavt<L, R>(
  left: L[],
  right: R[],
  leftKey: (item: L) => string | null,
  rightKey: (item: R) => string | null,
): JoinReport<L, R> {
  const rightIndex = new Map<string, R>()
  for (const item of right) {
    const key = rightKey(item)
    if (key) rightIndex.set(key, item)
  }

  const matched: { left: L; right: R }[] = []
  const unmatchedLeft: L[] = []
  const used = new Set<string>()

  for (const item of left) {
    const key = leftKey(item)
    const hit = key ? rightIndex.get(key) : undefined
    if (key && hit) {
      matched.push({ left: item, right: hit })
      used.add(key)
    } else {
      unmatchedLeft.push(item)
    }
  }

  const unmatchedRight = right.filter((item) => {
    const key = rightKey(item)
    return key === null || !used.has(key)
  })

  return { matched, unmatchedLeft, unmatchedRight }
}

const intFromText = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => toInt(value))

export const depremSenaryoRowSchema = z.object({
  ilce_adi: z.string().min(1),
  mahalle_adi: z.string().min(1),
  mahalle_koy_uavt: z
    .union([z.string(), z.number()])
    .transform((value) => normalizeUavt(value))
    .refine((value): value is string => value !== null, { message: 'UAVT kodu okunamadı' }),
  cok_agir_hasarli_bina_sayisi: intFromText,
  agir_hasarli_bina_sayisi: intFromText,
  orta_hasarli_bina_sayisi: intFromText,
  hafif_hasarli_bina_sayisi: intFromText,
  can_kaybi_sayisi: intFromText,
  agir_yarali_sayisi: intFromText,
  hastanede_tedavi_sayisi: intFromText,
  hafif_yarali_sayisi: intFromText,
  dogalgaz_boru_hasari: intFromText,
  icme_suyu_boru_hasari: intFromText,
  atik_su_boru_hasari: intFromText,
  gecici_barinma: intFromText,
})

export type DepremSenaryoRow = z.infer<typeof depremSenaryoRowSchema>

export const saglikKurumuRowSchema = z.object({
  ad: z.string().min(1),
  tur: z.string().default(''),
  ilce: z.string().default(''),
  mahalle: z.string().default(''),
  lon: z.number(),
  lat: z.number(),
})

export type SaglikKurumuRow = z.infer<typeof saglikKurumuRowSchema>
