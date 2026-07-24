// İBB deprem senaryosu CSV'sini (Windows-1254, ';') indirip Arnavutköy'ün 39 mahallesini UAVT koduyla yazar.

import { fetchBuffer } from './lib/http'
import { pickResource, resolvePackage } from './lib/ckan'
import { cacheRaw, runAsScript, writeOutput } from './lib/paths'
import { recordDataset } from './lib/manifest'
import {
  decodeWindows1254,
  depremSenaryoRowSchema,
  mahalleKey,
  parseCsv,
  type DepremSenaryoRow,
} from './lib/normalize'
import { fail, info, ok, step, warn } from './lib/log'

const SLUGS = [
  'deprem-senaryosu-analizi-sonuclari',
  'deprem-senaryosu-analiz-sonuclari',
  'istanbul-deprem-senaryosu',
]
const QUERY = 'deprem senaryosu mahalle hasar'
const ILCE = 'arnavutkoy'
const EXPECTED_MAHALLE = 38

export interface DepremSenaryoKaydi extends Omit<DepremSenaryoRow, 'ilce_adi' | 'mahalle_adi'> {
  ilce_adi: string
  mahalle_adi: string
  mahalle_anahtar: string
}

export interface DepremSenaryoDosyasi {
  ilce: string
  kaynak: string
  mahalle_sayisi: number
  kayitlar: DepremSenaryoKaydi[]
  toplam: Record<string, number>
}

const SUM_FIELDS = [
  'cok_agir_hasarli_bina_sayisi',
  'agir_hasarli_bina_sayisi',
  'orta_hasarli_bina_sayisi',
  'hafif_hasarli_bina_sayisi',
  'can_kaybi_sayisi',
  'agir_yarali_sayisi',
  'hastanede_tedavi_sayisi',
  'hafif_yarali_sayisi',
  'dogalgaz_boru_hasari',
  'icme_suyu_boru_hasari',
  'atik_su_boru_hasari',
  'gecici_barinma',
] as const

export async function run(): Promise<void> {
  step('02 · İBB deprem senaryosu (mahalle bazlı)')

  const pkg = await resolvePackage(SLUGS, QUERY)
  const resource = pickResource(pkg, ['CSV'], 'deprem')
  info(`kaynak: ${resource.name} → ${resource.url}`)

  const buffer = await cacheRaw('ibb-deprem-senaryo.csv', () => fetchBuffer(resource.url))
  const rows = parseCsv(decodeWindows1254(buffer), ';')
  info(`CSV satır sayısı: ${rows.length}`)

  const district = rows.filter((row) => mahalleKey(row['ilce_adi'] ?? '') === ILCE)
  if (district.length === 0) {
    const seen = [...new Set(rows.map((row) => row['ilce_adi'] ?? ''))].slice(0, 8)
    throw new Error(`Arnavutköy satırı bulunamadı. Görülen ilçeler: ${seen.join(', ')}`)
  }

  const kayitlar: DepremSenaryoKaydi[] = []
  const uavtSeen = new Set<string>()
  let invalid = 0

  for (const row of district) {
    const parsed = depremSenaryoRowSchema.safeParse(row)
    if (!parsed.success) {
      invalid += 1
      warn(`Doğrulanamayan satır: ${row['mahalle_adi'] ?? '?'} — ${parsed.error.issues[0]?.message}`)
      continue
    }
    const value = parsed.data
    if (uavtSeen.has(value.mahalle_koy_uavt)) {
      warn(`Yinelenen UAVT kodu atlandı: ${value.mahalle_koy_uavt} (${value.mahalle_adi})`)
      continue
    }
    uavtSeen.add(value.mahalle_koy_uavt)
    kayitlar.push({ ...value, mahalle_anahtar: mahalleKey(value.mahalle_adi) })
  }

  if (invalid > 0) fail(`${invalid} satır şema doğrulamasından geçemedi`)
  if (kayitlar.length !== EXPECTED_MAHALLE) {
    warn(`Mahalle sayısı ${kayitlar.length}, beklenen ${EXPECTED_MAHALLE} — kaynak güncellenmiş olabilir`)
  }

  const toplam: Record<string, number> = {}
  for (const field of SUM_FIELDS) {
    toplam[field] = kayitlar.reduce((sum, kayit) => sum + kayit[field], 0)
  }

  const dosya: DepremSenaryoDosyasi = {
    ilce: 'Arnavutköy',
    kaynak: `İBB Açık Veri / ${pkg.title}`,
    mahalle_sayisi: kayitlar.length,
    kayitlar,
    toplam,
  }

  const bytes = await writeOutput('deprem-senaryo.json', dosya)
  await recordDataset('depremSenaryo', {
    file: 'deprem-senaryo.json',
    count: kayitlar.length,
    source: `İBB CKAN / ${pkg.name}`,
    bytes,
  })

  ok(`${kayitlar.length} mahalle yazıldı · geçici barınma toplamı: ${toplam['gecici_barinma']} kişi`)
}

await runAsScript(import.meta.url, run)
