// Vergi/beyan dışı alan tespiti: haritadaki bina alanı ile beyan edilen alanı karşılaştırır.

export interface DeclarationInput {
  binaId: string | number
  haritaAlanM2: number
  beyanAlanM2: number | null
}

export interface DeclarationResult {
  binaId: string | number
  haritaAlanM2: number
  beyanAlanM2: number
  farkM2: number
  farkYuzde: number
  durum: 'beyansiz' | 'eksik-beyan' | 'uyumlu'
}

export function declarationGap(input: DeclarationInput, tolerancePercent: number): DeclarationResult {
  const harita = Math.max(0, input.haritaAlanM2)
  const beyan = input.beyanAlanM2 === null ? 0 : Math.max(0, input.beyanAlanM2)
  const farkM2 = harita - beyan
  const farkYuzde = harita === 0 ? 0 : (farkM2 / harita) * 100

  let durum: DeclarationResult['durum'] = 'uyumlu'
  if (input.beyanAlanM2 === null || beyan === 0) durum = 'beyansiz'
  else if (farkYuzde > tolerancePercent) durum = 'eksik-beyan'

  return {
    binaId: input.binaId,
    haritaAlanM2: harita,
    beyanAlanM2: beyan,
    farkM2,
    farkYuzde,
    durum,
  }
}
