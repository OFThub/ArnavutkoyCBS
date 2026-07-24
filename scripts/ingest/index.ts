// Tüm ingest adımlarını bağımlılık sırasına göre çalıştırır; idempotenttir, --fresh ile ham önbelleği atlar.

import { FRESH, runAsScript } from './lib/paths'
import { readManifest } from './lib/manifest'
import { fail, info, ok, step } from './lib/log'
import { run as district } from './01-district'
import { run as deprem } from './02-ibb-deprem'
import { run as mahalle } from './03-mahalle-geom'
import { run as acilYol } from './04-ibb-acil-yol'
import { run as saglik } from './05-ibb-saglik'
import { run as osm } from './06-osm-snapshot'

interface Adim {
  id: string
  zorunlu: boolean
  run: () => Promise<void>
}

const ADIMLAR: Adim[] = [
  { id: '01-district', zorunlu: true, run: district },
  { id: '02-ibb-deprem', zorunlu: true, run: deprem },
  { id: '03-mahalle-geom', zorunlu: true, run: mahalle },
  { id: '04-ibb-acil-yol', zorunlu: false, run: acilYol },
  { id: '05-ibb-saglik', zorunlu: false, run: saglik },
  { id: '06-osm-snapshot', zorunlu: false, run: osm },
]

export async function run(): Promise<void> {
  step(`Veri hattı başlıyor${FRESH ? ' (--fresh: ham önbellek atlanacak)' : ''}`)

  const basarisiz: string[] = []

  for (const adim of ADIMLAR) {
    try {
      await adim.run()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      fail(`${adim.id}: ${message}`)
      basarisiz.push(adim.id)
      if (adim.zorunlu) {
        throw new Error(`Zorunlu adım başarısız: ${adim.id}`)
      }
    }
  }

  step('Özet')
  const manifest = await readManifest()
  if (manifest) {
    info(`sürüm: ${manifest.version}`)
    for (const [key, entry] of Object.entries(manifest.datasets)) {
      info(`${key.padEnd(16)} ${String(entry.count).padStart(6)} kayıt · ${(entry.bytes / 1024).toFixed(0)} KB`)
    }
  }

  if (basarisiz.length > 0) {
    fail(`Tamamlanamayan isteğe bağlı adımlar: ${basarisiz.join(', ')}`)
    process.exitCode = 1
    return
  }

  ok('Veri hattı tamamlandı')
}

await runAsScript(import.meta.url, run)
