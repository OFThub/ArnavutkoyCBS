// Arayüz yazı tiplerini public/fonts altına indirir. PWA çevrimdışı çalışmalı; çalışma anında
// Google Fonts'a istek gitmez. Yeniden üretmek için: npm run fonts

import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const OUT = resolve(ROOT, 'public/fonts')

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Türkçe için latin + latin-ext yeterli; diğer alt kümeler indirilmez.
const SUBSETS = ['latin', 'latin-ext']

const FAMILIES = [
  { name: 'Archivo', query: 'Archivo:wdth,wght@62..125,400..700' },
  { name: 'JetBrains Mono', query: 'JetBrains+Mono:wght@400..700' },
]

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

interface Block {
  subset: string
  css: string
}

/** Google Fonts CSS'i `/* subset *\/` yorumlarına göre bloklara ayırır. */
function splitBlocks(css: string): Block[] {
  const blocks: Block[] = []
  const parts = css.split(/\/\*\s*([a-z-]+)\s*\*\//i)
  for (let index = 1; index < parts.length; index += 2) {
    const subset = parts[index]
    const body = parts[index + 1]
    if (subset && body) blocks.push({ subset, css: body })
  }
  return blocks
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { 'user-agent': UA } })
  if (!response.ok) throw new Error(`HTTP ${response.status} — ${url}`)
  return response.text()
}

async function run(): Promise<void> {
  await mkdir(OUT, { recursive: true })

  const query = FAMILIES.map((family) => `family=${family.query}`).join('&')
  const css = await fetchText(`https://fonts.googleapis.com/css2?${query}&display=swap`)

  const kept: string[] = []
  let indirilen = 0

  for (const block of splitBlocks(css)) {
    if (!SUBSETS.includes(block.subset)) continue

    const urlMatch = /url\((https:\/\/[^)]+\.woff2)\)/.exec(block.css)
    const familyMatch = /font-family:\s*'([^']+)'/.exec(block.css)
    if (!urlMatch?.[1] || !familyMatch?.[1]) continue

    const fileName = `${slug(familyMatch[1])}-${block.subset}.woff2`
    const response = await fetch(urlMatch[1], { headers: { 'user-agent': UA } })
    if (!response.ok) throw new Error(`HTTP ${response.status} — ${urlMatch[1]}`)
    await writeFile(resolve(OUT, fileName), Buffer.from(await response.arrayBuffer()))
    indirilen += 1

    kept.push(block.css.replace(urlMatch[1], `/fonts/${fileName}`).trim())
    console.log(`  ${familyMatch[1]} · ${block.subset} → ${fileName}`)
  }

  if (indirilen === 0) throw new Error('Hiç yazı tipi indirilemedi — CSS biçimi değişmiş olabilir')

  const header =
    '/* scripts/fetch-fonts.ts tarafından üretildi — elle düzenlemeyin. npm run fonts */\n\n'
  await writeFile(resolve(OUT, 'fonts.css'), header + kept.join('\n\n') + '\n', 'utf8')

  console.log(`${indirilen} yazı tipi dosyası ve fonts.css yazıldı`)
}

await run()
