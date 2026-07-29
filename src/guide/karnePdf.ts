// Mahalle karnesini antet düzeniyle PDF'e basar; yazı tipi altyapısı PrintTool ile ortak.

import { DISTRICT } from '../config/district'
import { formatDistance } from '../core/format'
import type { MahalleKarne } from './guideScore'

function mesafe(value: number | null): string {
  return value === null ? 'Veri yok' : formatDistance(value)
}

export async function exportKarnePdf(karne: MahalleKarne): Promise<string> {
  const { jsPDF } = await import('jspdf')
  const { PDF_FONT_BASE64, PDF_FONT_FILE, PDF_FONT_NAME } = await import('../tools/printFont')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.addFileToVFS(PDF_FONT_FILE, PDF_FONT_BASE64)
  doc.addFont(PDF_FONT_FILE, PDF_FONT_NAME, 'normal')
  doc.setFont(PDF_FONT_NAME, 'normal')

  doc.setFontSize(18)
  doc.text(`${karne.ad} — Mahalle Karnesi`, 16, 20)
  doc.setFontSize(9)
  doc.text(`${DISTRICT.province} · ${DISTRICT.name} · ${new Date().toLocaleDateString('tr-TR')}`, 16, 26)

  // Antet: karnenin kimlik bloğu.
  let y = 36
  doc.setDrawColor(120)
  doc.rect(16, y, 82, 30)
  const antet: [string, string][] = [
    ['UAVT', karne.uavt],
    ['Konum', `${karne.merkez[1].toFixed(4)} / ${karne.merkez[0].toFixed(4)}`],
    ['Genel puan', `${karne.genelPuan} / 100`],
  ]
  doc.setFontSize(8)
  antet.forEach(([etiket, deger], index) => {
    const satirY = y + 8 + index * 7
    doc.text(etiket, 20, satirY)
    doc.text(deger, 94, satirY, { align: 'right' })
    if (index < antet.length - 1) doc.line(16, satirY + 2.5, 98, satirY + 2.5)
  })

  y += 40
  const bolumler: [string, number, [string, string][]][] = [
    [
      'Deprem (İBB senaryosu)',
      karne.deprem.puan,
      [
        ['Ağır hasarlı bina', String(karne.deprem.agirHasarliBina)],
        ['Hasarlı bina (toplam)', String(karne.deprem.toplamHasarliBina)],
        ['Can kaybı beklentisi', String(karne.deprem.canKaybi)],
        ['Geçici barınma', `${karne.deprem.geciciBarinma} kişi`],
      ],
    ],
    [
      'Erişim (mahalle merkezinden)',
      karne.erisim.puan,
      [
        ['Hastane', mesafe(karne.erisim.hastaneM)],
        ['Eczane', mesafe(karne.erisim.eczaneM)],
        ['Okul', mesafe(karne.erisim.okulM)],
        ['Park', mesafe(karne.erisim.parkM)],
        ['Otobüs durağı', mesafe(karne.erisim.durakM)],
      ],
    ],
    [
      'Hizmetler (mahalle sınırı içinde)',
      karne.hizmet.puan,
      [
        ['Park ve bahçe', String(karne.hizmet.park)],
        ['Kablosuz ağ noktası', String(karne.hizmet.kablosuzAg)],
        ['Geri dönüşüm', String(karne.hizmet.geriDonusum)],
        ['Semt pazarı', String(karne.hizmet.pazar)],
        ['Otobüs durağı', String(karne.hizmet.durak)],
      ],
    ],
    [
      'Altyapı (beklenen boru hasarı)',
      karne.altyapi.puan,
      [
        ['Doğalgaz', String(karne.altyapi.dogalgazHasari)],
        ['İçme suyu', String(karne.altyapi.icmeSuyuHasari)],
        ['Atık su', String(karne.altyapi.atikSuHasari)],
      ],
    ],
  ]

  for (const [baslik, puan, satirlar] of bolumler) {
    if (y > 250) {
      doc.addPage()
      y = 20
    }
    doc.setFontSize(11)
    doc.text(baslik, 16, y)
    doc.text(`${puan} / 100`, 194, y, { align: 'right' })
    y += 3
    doc.line(16, y, 194, y)
    y += 5

    doc.setFontSize(9)
    for (const [etiket, deger] of satirlar) {
      doc.text(etiket, 20, y)
      doc.text(deger, 194, y, { align: 'right' })
      y += 5
    }
    y += 6
  }

  if (y > 250) {
    doc.addPage()
    y = 20
  }
  doc.setFontSize(7)
  doc.text(
    'Kaynaklar: İBB Açık Veri (deprem senaryosu, sağlık kurumları), OpenStreetMap (hizmet noktaları).',
    16,
    y,
  )
  doc.text(
    'Mahalle sınırları yaklaşıktır. Bu belge bilgilendirme amaçlıdır, resmî imar veya tapu belgesi yerine geçmez.',
    16,
    y + 4,
  )

  const fileName = `${karne.ad.toLocaleLowerCase('tr').replace(/[^a-z0-9]+/g, '-')}-karne.pdf`
  doc.save(fileName)
  return fileName
}
