// docs/STAJ_RAPORU.md dosyasını teslim edilebilir bir A4 PDF'e basar.
//
// Kaynak daima markdown'dır: raporu düzenlemek isteyen STAJ_RAPORU.md'yi değiştirip
// `npm run docs:pdf` çalıştırır. PDF elle düzenlenmez, her üretimde sıfırdan yazılır.
//
// Türkçe karakterler için uygulamanın Yazdır aracıyla ortak gömülü Noto Sans fontu kullanılır;
// jsPDF'in yerleşik fontları İ/ı/ş/ğ/ç/ö/ü karakterlerini doğru basmaz.

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { jsPDF } from 'jspdf'
import { PDF_FONT_BASE64, PDF_FONT_FILE, PDF_FONT_NAME } from '../src/tools/printFont'

const GIRDI = 'docs/STAJ_RAPORU.md'
const CIKTI = 'docs/STAJ_RAPORU.pdf'

// A4, milimetre. Kenar boşlukları ciltleme payı bırakacak kadar geniş.
const SAYFA_GENISLIK = 210
const SAYFA_YUKSEKLIK = 297
const SOL = 20
const SAG = 20
const UST = 20
const ALT = 18
const YAZI_GENISLIK = SAYFA_GENISLIK - SOL - SAG

const RENK = {
  metin: [30, 35, 42] as const,
  soluk: [110, 118, 128] as const,
  baslik: [17, 24, 39] as const,
  cizgi: [200, 205, 212] as const,
  vurgu: [180, 120, 30] as const,
  kod: [245, 245, 242] as const,
}

interface Blok {
  tur: 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'ol' | 'kod' | 'alinti' | 'tablo' | 'ayrac'
  metin?: string
  seviye?: number
  satirlar?: string[]
  hucreler?: string[][]
}

// Gömülü Noto Sans'ta bulunmayan semboller sessizce boşluk olarak basılıyordu
// ("tip kontrolü → test" ifadesi "tip kontrolü  test" görünüyordu). Okunur karşılıklarıyla değiştirilir.
const GLIF_KARSILIKLARI: [RegExp, string][] = [
  [/[→⇒]/g, '->'],
  [/[←⇐]/g, '<-'],
  [/↔/g, '<->'],
  [/⋈/g, ' x '],
  [/[▲▴]/g, '^'],
  [/[▼▾]/g, 'v'],
  [/⌖/g, '+'],
  [/[≥]/g, '>='],
  [/[≤]/g, '<='],
  [/≈/g, '~'],
  [/[·•]/g, '·'],
  [/[✅✓]/g, 'Evet'],
  [/[❌✗]/g, 'Hayır'],
  [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ''],
]

function glifDuzelt(metin: string): string {
  let sonuc = metin
  for (const [desen, karsilik] of GLIF_KARSILIKLARI) sonuc = sonuc.replace(desen, karsilik)
  return sonuc
}

/** Markdown'ın vurgu işaretlerini temizler; PDF'te kalın/italik ayrımı yapılmıyor. */
function sadeMetin(satir: string): string {
  return glifDuzelt(satir)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .trim()
}

function tabloSatiri(satir: string): string[] {
  return satir
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((hucre) => sadeMetin(hucre))
}

function ayracSatiriMi(satir: string): boolean {
  return /^\|?[\s:|-]+\|[\s:|-]*$/.test(satir) && satir.includes('-')
}

function ayristir(markdown: string): Blok[] {
  const satirlar = markdown.split(/\r?\n/)
  const bloklar: Blok[] = []
  let paragraf: string[] = []

  const paragrafiKapat = (): void => {
    if (paragraf.length === 0) return
    bloklar.push({ tur: 'p', metin: sadeMetin(paragraf.join(' ')) })
    paragraf = []
  }

  for (let i = 0; i < satirlar.length; i += 1) {
    const ham = satirlar[i] ?? ''
    const satir = ham.trimEnd()

    if (satir.trim() === '') {
      paragrafiKapat()
      continue
    }

    // Kod bloğu: kapanış işareti gelene kadar ham olarak toplanır.
    if (satir.trimStart().startsWith('```')) {
      paragrafiKapat()
      const govde: string[] = []
      i += 1
      while (i < satirlar.length && !(satirlar[i] ?? '').trimStart().startsWith('```')) {
        govde.push(satirlar[i] ?? '')
        i += 1
      }
      bloklar.push({ tur: 'kod', satirlar: govde })
      continue
    }

    // Tablo: başlık satırı + ayraç + gövde.
    if (satir.trimStart().startsWith('|') && ayracSatiriMi(satirlar[i + 1] ?? '')) {
      paragrafiKapat()
      const hucreler: string[][] = [tabloSatiri(satir)]
      i += 2
      while (i < satirlar.length && (satirlar[i] ?? '').trimStart().startsWith('|')) {
        hucreler.push(tabloSatiri(satirlar[i] ?? ''))
        i += 1
      }
      i -= 1
      bloklar.push({ tur: 'tablo', hucreler })
      continue
    }

    if (/^---+$/.test(satir.trim())) {
      paragrafiKapat()
      bloklar.push({ tur: 'ayrac' })
      continue
    }

    const baslik = /^(#{1,3})\s+(.*)$/.exec(satir)
    if (baslik) {
      paragrafiKapat()
      const seviye = baslik[1]!.length
      bloklar.push({ tur: seviye === 1 ? 'h1' : seviye === 2 ? 'h2' : 'h3', metin: sadeMetin(baslik[2]!) })
      continue
    }

    if (satir.trimStart().startsWith('>')) {
      paragrafiKapat()
      bloklar.push({ tur: 'alinti', metin: sadeMetin(satir.replace(/^\s*>\s?/, '')) })
      continue
    }

    const madde = /^(\s*)[-*+]\s+(.*)$/.exec(satir)
    if (madde) {
      paragrafiKapat()
      bloklar.push({
        tur: 'li',
        metin: sadeMetin(madde[2]!),
        seviye: Math.floor(madde[1]!.length / 2),
      })
      continue
    }

    const numarali = /^(\s*)(\d+)[.)]\s+(.*)$/.exec(satir)
    if (numarali) {
      paragrafiKapat()
      bloklar.push({
        tur: 'ol',
        metin: `${numarali[2]}. ${sadeMetin(numarali[3]!)}`,
        seviye: Math.floor(numarali[1]!.length / 2),
      })
      continue
    }

    paragraf.push(satir.trim())
  }

  paragrafiKapat()
  return bloklar
}

function uret(): void {
  const markdown = readFileSync(resolve(process.cwd(), GIRDI), 'utf8')
  const bloklar = ayristir(markdown)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.addFileToVFS(PDF_FONT_FILE, PDF_FONT_BASE64)
  doc.addFont(PDF_FONT_FILE, PDF_FONT_NAME, 'normal')
  doc.setFont(PDF_FONT_NAME, 'normal')

  let y = UST
  let sayfa = 1

  const altbilgi = (): void => {
    doc.setFontSize(7.5)
    doc.setTextColor(...RENK.soluk)
    doc.text('Arnavutköy CBS — Staj Raporu', SOL, SAYFA_YUKSEKLIK - 10)
    doc.text(String(sayfa), SAYFA_GENISLIK - SAG, SAYFA_YUKSEKLIK - 10, { align: 'right' })
  }

  /** İstenen yükseklik sayfaya sığmıyorsa yeni sayfa açar. */
  const yerAc = (gerekli: number): void => {
    if (y + gerekli <= SAYFA_YUKSEKLIK - ALT) return
    altbilgi()
    doc.addPage()
    sayfa += 1
    y = UST
  }

  const yaz = (
    metin: string,
    ayar: { boyut: number; renk: readonly number[]; girinti?: number; aralik?: number },
  ): void => {
    const girinti = ayar.girinti ?? 0
    const aralik = ayar.aralik ?? ayar.boyut * 0.52
    doc.setFontSize(ayar.boyut)
    doc.setTextColor(ayar.renk[0]!, ayar.renk[1]!, ayar.renk[2]!)
    const satirlar = doc.splitTextToSize(metin, YAZI_GENISLIK - girinti) as string[]
    for (const satir of satirlar) {
      yerAc(aralik)
      doc.text(satir, SOL + girinti, y)
      y += aralik
    }
  }

  for (const blok of bloklar) {
    switch (blok.tur) {
      case 'h1': {
        yerAc(20)
        y += 2
        yaz(blok.metin ?? '', { boyut: 20, renk: RENK.baslik, aralik: 9 })
        doc.setDrawColor(...RENK.vurgu)
        doc.setLineWidth(0.6)
        yerAc(4)
        doc.line(SOL, y - 3, SOL + 40, y - 3)
        y += 4
        break
      }
      case 'h2': {
        yerAc(16)
        y += 4
        yaz(blok.metin ?? '', { boyut: 13.5, renk: RENK.baslik, aralik: 6.5 })
        doc.setDrawColor(...RENK.cizgi)
        doc.setLineWidth(0.2)
        doc.line(SOL, y - 2.5, SAYFA_GENISLIK - SAG, y - 2.5)
        y += 3
        break
      }
      case 'h3': {
        yerAc(12)
        y += 3
        yaz(blok.metin ?? '', { boyut: 11, renk: RENK.baslik, aralik: 5.5 })
        y += 1
        break
      }
      case 'p': {
        yaz(blok.metin ?? '', { boyut: 9.5, renk: RENK.metin, aralik: 4.8 })
        y += 2
        break
      }
      case 'li':
      case 'ol': {
        const girinti = 4 + (blok.seviye ?? 0) * 5
        const isaret = blok.tur === 'li' ? '•' : ''
        if (isaret) {
          yerAc(4.8)
          doc.setFontSize(9.5)
          doc.setTextColor(...RENK.vurgu)
          doc.text(isaret, SOL + girinti - 3.5, y)
        }
        yaz(blok.metin ?? '', { boyut: 9.5, renk: RENK.metin, girinti, aralik: 4.8 })
        y += 0.8
        break
      }
      case 'alinti': {
        const metin = blok.metin ?? ''
        doc.setFontSize(9)
        const satirlar = doc.splitTextToSize(metin, YAZI_GENISLIK - 8) as string[]
        const yukseklik = satirlar.length * 4.6 + 3
        yerAc(yukseklik)
        doc.setDrawColor(...RENK.vurgu)
        doc.setLineWidth(1.2)
        doc.line(SOL + 1, y - 3, SOL + 1, y + yukseklik - 6)
        yaz(metin, { boyut: 9, renk: RENK.soluk, girinti: 6, aralik: 4.6 })
        y += 2.5
        break
      }
      case 'kod': {
        const satirlar = blok.satirlar ?? []
        const yukseklik = satirlar.length * 4.2 + 5
        yerAc(yukseklik)
        doc.setFillColor(...RENK.kod)
        doc.rect(SOL, y - 4, YAZI_GENISLIK, yukseklik, 'F')
        doc.setFontSize(8)
        doc.setTextColor(...RENK.metin)
        for (const satir of satirlar) {
          // Kod satırı taşarsa kırpılır; sarmalamak hizalamayı bozardı.
          doc.text(satir.slice(0, 92), SOL + 3, y)
          y += 4.2
        }
        y += 4
        break
      }
      case 'tablo': {
        const hucreler = blok.hucreler ?? []
        const basliklar = hucreler[0] ?? []
        const sutunSayisi = Math.max(...hucreler.map((satir) => satir.length), 1)
        doc.setFontSize(8)

        // Sütun genişliği içeriğe göre orantılanır: eşit bölmek, uzun açıklama sütununu
        // sıkıştırıp kısa etiket sütunlarında boşluk bırakıyordu. Kök alma, çok uzun
        // metnin tabloyu tek sütuna kaptırmasını engeller.
        const agirliklar = Array.from({ length: sutunSayisi }, (_, index) => {
          const enUzun = Math.max(...hucreler.map((satir) => (satir[index] ?? '').length), 1)
          return Math.sqrt(enUzun)
        })
        const agirlikToplami = agirliklar.reduce((sum, value) => sum + value, 0)
        const ENAZ = 18
        const genislikler = agirliklar.map((agirlik) =>
          Math.max(ENAZ, (agirlik / agirlikToplami) * YAZI_GENISLIK),
        )
        // Alt sınır uygulandıktan sonra toplam sayfayı aşabilir; oranı koruyarak ölçeklenir.
        const toplam = genislikler.reduce((sum, value) => sum + value, 0)
        const olcek = toplam > YAZI_GENISLIK ? YAZI_GENISLIK / toplam : 1
        const sutunGenislikleri = genislikler.map((value) => value * olcek)
        const sutunX = sutunGenislikleri.map((_, index) =>
          sutunGenislikleri.slice(0, index).reduce((sum, value) => sum + value, 0),
        )

        const satirYaz = (veri: string[], basliksa: boolean): void => {
          const parcalar = Array.from({ length: sutunSayisi }, (_, index) =>
            doc.splitTextToSize(veri[index] ?? '', (sutunGenislikleri[index] ?? 20) - 3) as string[],
          )
          const satirYuksekligi = Math.max(...parcalar.map((p) => p.length)) * 3.9 + 2.4
          yerAc(satirYuksekligi + 2)

          if (basliksa) {
            doc.setFillColor(238, 240, 243)
            doc.rect(SOL, y - 3.4, YAZI_GENISLIK, satirYuksekligi, 'F')
          }

          const yaziRengi = basliksa ? RENK.baslik : RENK.metin
          doc.setTextColor(yaziRengi[0], yaziRengi[1], yaziRengi[2])
          parcalar.forEach((parca, index) => {
            let ySatir = y
            for (const metin of parca) {
              doc.text(metin, SOL + (sutunX[index] ?? 0) + 1.5, ySatir)
              ySatir += 3.9
            }
          })

          y += satirYuksekligi
          doc.setDrawColor(...RENK.cizgi)
          doc.setLineWidth(0.1)
          doc.line(SOL, y - 2.6, SAYFA_GENISLIK - SAG, y - 2.6)
        }

        yerAc(12)
        satirYaz(basliklar, true)
        for (const satir of hucreler.slice(1)) satirYaz(satir, false)
        y += 3.5
        break
      }
      case 'ayrac': {
        yerAc(6)
        doc.setDrawColor(...RENK.cizgi)
        doc.setLineWidth(0.2)
        doc.line(SOL, y, SAYFA_GENISLIK - SAG, y)
        y += 5
        break
      }
    }
  }

  altbilgi()

  const hedef = resolve(process.cwd(), CIKTI)
  writeFileSync(hedef, Buffer.from(doc.output('arraybuffer')))
  console.log(`  ${CIKTI} · ${sayfa} sayfa · ${bloklar.length} blok`)
}

uret()
