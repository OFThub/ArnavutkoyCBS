// Afet tahliye açığı: İBB resmî geçici barınma ihtiyacı ile toplanma alanı kapasitesini mahalle bazında karşılaştırır.

export interface EvacuationInput {
  mahalleUavt: string
  mahalleAd: string
  geciciBarinma: number
  kapasiteKisi: number
}

export interface EvacuationResult {
  mahalleUavt: string
  mahalleAd: string
  ihtiyac: number
  kapasite: number
  acik: number
  karsilanmaOrani: number
}

export function evacuationGap(input: EvacuationInput): EvacuationResult {
  const ihtiyac = Math.max(0, input.geciciBarinma)
  const kapasite = Math.max(0, input.kapasiteKisi)
  const acik = Math.max(0, ihtiyac - kapasite)
  const karsilanmaOrani = ihtiyac === 0 ? 1 : Math.min(1, kapasite / ihtiyac)
  return {
    mahalleUavt: input.mahalleUavt,
    mahalleAd: input.mahalleAd,
    ihtiyac,
    kapasite,
    acik,
    karsilanmaOrani,
  }
}

export function evacuationReport(inputs: EvacuationInput[]): {
  rows: EvacuationResult[]
  toplamIhtiyac: number
  toplamKapasite: number
  toplamAcik: number
  acikVerenMahalle: number
} {
  const rows = inputs.map(evacuationGap).sort((a, b) => b.acik - a.acik)
  const toplamIhtiyac = rows.reduce((sum, row) => sum + row.ihtiyac, 0)
  const toplamKapasite = rows.reduce((sum, row) => sum + row.kapasite, 0)
  const toplamAcik = rows.reduce((sum, row) => sum + row.acik, 0)
  const acikVerenMahalle = rows.filter((row) => row.acik > 0).length
  return { rows, toplamIhtiyac, toplamKapasite, toplamAcik, acikVerenMahalle }
}
