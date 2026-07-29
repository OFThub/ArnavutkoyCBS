// Başarım testi çıktısının Excel ve JSON olarak dışa aktarılması; cihaz künyesi ve ölçümler tek dosyada toplanır.

import type { DeviceProfile } from './device'
import type { GpuResult } from './gpu'
import type { ScalingSet } from './parallel'
import type { WorkloadResult } from './workloads'

export interface BenchReport {
  cihaz: DeviceProfile
  isYukleri: WorkloadResult[]
  olcekleme: ScalingSet[]
  gpu: GpuResult | null
}

const UNIT_LABEL: Record<string, string> = {
  hucre: 'hücre/s',
  piksel: 'piksel/s',
  bayt: 'MB/s',
}

export function throughputLabel(result: WorkloadResult): string {
  if (!Number.isFinite(result.verim)) return '—'
  if (result.birim === 'bayt') return `${(result.verim / (1024 * 1024)).toFixed(1)} MB/s`
  const millions = result.verim / 1_000_000
  return `${millions.toFixed(2)} M${UNIT_LABEL[result.birim] ?? result.birim}`
}

function deviceRows(cihaz: DeviceProfile): (string | number)[][] {
  return [
    ['CPU çekirdeği', cihaz.cekirdek ?? 'bilinmiyor'],
    ['Bellek (GB)', cihaz.bellekGb ?? 'bilinmiyor'],
    ['GPU üretici', cihaz.gpuUretici ?? 'bilinmiyor'],
    ['GPU model', cihaz.gpuModel ?? 'bilinmiyor'],
    ['WebGL sürümü', cihaz.webglSurum ?? 'bilinmiyor'],
    ['Ekran', cihaz.ekran],
    ['Piksel oranı', cihaz.pikselOrani],
    ['Platform', cihaz.platform],
    ['JS yığını sınırı (MB)', cihaz.jsYiginiSinirMb ?? 'bilinmiyor'],
    ['Tarayıcı', cihaz.tarayici],
    ['Ölçüm zamanı', cihaz.zaman],
  ]
}

export async function exportBenchExcel(report: BenchReport): Promise<string> {
  const XLSX = await import('xlsx')
  const book = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([['Cihaz künyesi', ''], ...deviceRows(report.cihaz)]),
    'Cihaz',
  )

  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([
      ['İş yükü', 'Alt sistem', 'Medyan ms', 'En iyi ms', 'p95 ms', 'Std sapma', 'Tekrar', 'Verim'],
      ...report.isYukleri.map((row) => [
        row.baslik,
        row.altSistem,
        Number(row.zaman.medyanMs.toFixed(2)),
        Number(row.zaman.enIyiMs.toFixed(2)),
        Number(row.zaman.p95Ms.toFixed(2)),
        Number(row.zaman.stdSapmaMs.toFixed(2)),
        row.zaman.tekrar,
        throughputLabel(row),
      ]),
    ]),
    'İş yükleri',
  )

  if (report.olcekleme.length > 0) {
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([
        ['Çekirdek', 'İşçi sayısı', 'Süre ms', 'Hızlanma', 'Verimlilik'],
        ...report.olcekleme.flatMap((set) =>
          set.noktalar.map((point) => [
            set.baslik,
            point.isciSayisi,
            Number(point.sureMs.toFixed(2)),
            Number(point.hizlanma.toFixed(3)),
            Number(point.verimlilik.toFixed(3)),
          ]),
        ),
      ]),
      'Çekirdek ölçekleme',
    )
  }

  if (report.gpu) {
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([
        ['Ölçüt', 'Değer'],
        ['Ortalama FPS', Number(report.gpu.ortalamaFps.toFixed(1))],
        ['Medyan kare (ms)', Number(report.gpu.medyanKareMs.toFixed(2))],
        ['p95 kare (ms)', Number(report.gpu.p95KareMs.toFixed(2))],
        ['Kare sayısı', report.gpu.kareSayisi],
        ['Güvenilir', report.gpu.guvenilir ? 'evet' : 'hayır'],
        ['Not', report.gpu.not ?? ''],
      ]),
      'GPU',
    )
  }

  const fileName = `arnavutkoy-donanim-testi-${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(book, fileName)
  return fileName
}

export function exportBenchJson(report: BenchReport): string {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const fileName = `arnavutkoy-donanim-testi-${new Date().toISOString().slice(0, 10)}.json`
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
  return fileName
}
