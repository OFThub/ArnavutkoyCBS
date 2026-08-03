// Yönetici/personel hesabı açar. Rol JWT'de app_metadata.rol olarak taşınır (bkz. supabase public.rol()),
// bu alanı yalnızca service_role anahtarı yazabilir — anon anahtarla açılan hesap 'public' kalır.
//
// Kullanım:
//   SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/create-admin.ts --email=... --password=... [--rol=yonetici]
//
// Anahtar: Supabase panosu → Project Settings → API → service_role. Bu anahtar gizlidir, commit edilmez.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type Rol = 'personel' | 'yonetici'

const ROLLER: Rol[] = ['personel', 'yonetici']

/** .env dosyasını okur; süreç ortamı her zaman dosyadan üstündür. */
function envDosyasi(dosya: string): Record<string, string> {
  const sonuc: Record<string, string> = {}
  let icerik: string
  try {
    icerik = readFileSync(resolve(process.cwd(), dosya), 'utf8')
  } catch {
    return sonuc
  }

  for (const satir of icerik.split(/\r?\n/)) {
    const temiz = satir.trim()
    if (temiz === '' || temiz.startsWith('#')) continue
    const ayirac = temiz.indexOf('=')
    if (ayirac === -1) continue
    const anahtar = temiz.slice(0, ayirac).trim()
    const deger = temiz
      .slice(ayirac + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
    if (anahtar !== '') sonuc[anahtar] = deger
  }
  return sonuc
}

function arguman(ad: string): string | null {
  const onek = `--${ad}=`
  const bulunan = process.argv.find((item) => item.startsWith(onek))
  return bulunan ? bulunan.slice(onek.length) : null
}

function bitir(mesaj: string): never {
  console.error(`\n  HATA: ${mesaj}\n`)
  process.exit(1)
}

async function main(): Promise<void> {
  const dosya = { ...envDosyasi('.env'), ...envDosyasi('.env.local') }
  const oku = (ad: string): string | undefined => process.env[ad] ?? dosya[ad]

  const url = oku('SUPABASE_URL') ?? oku('VITE_SUPABASE_URL')
  const serviceKey = oku('SUPABASE_SERVICE_ROLE_KEY')

  if (!url) bitir('SUPABASE_URL / VITE_SUPABASE_URL bulunamadı (.env veya ortam değişkeni).')
  if (!serviceKey) {
    bitir(
      'SUPABASE_SERVICE_ROLE_KEY bulunamadı.\n' +
        '  Supabase panosu → Project Settings → API → service_role anahtarını kopyalayın.\n' +
        '  .env dosyasına SUPABASE_SERVICE_ROLE_KEY=... satırı ekleyin (bu anahtar commit edilmemeli).',
    )
  }

  const email = arguman('email')
  const password = arguman('password')
  const rol = (arguman('rol') ?? 'yonetici') as Rol

  if (!email) bitir('--email=... zorunlu.')
  if (!password) bitir('--password=... zorunlu.')
  if (password.length < 12) bitir('Parola en az 12 karakter olmalı.')
  if (!ROLLER.includes(rol)) bitir(`--rol yalnızca ${ROLLER.join(' veya ')} olabilir.`)

  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Var olan hesabı ikinci kez oluşturmak yerine rolünü güncelle; komut tekrar çalıştırılabilir olmalı.
  const { data: liste, error: listeHatasi } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listeHatasi) bitir(`Kullanıcı listesi alınamadı: ${listeHatasi.message}`)

  const hedef = liste.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())

  if (hedef) {
    const { error } = await admin.auth.admin.updateUserById(hedef.id, {
      password,
      app_metadata: { ...hedef.app_metadata, rol },
      email_confirm: true,
    })
    if (error) bitir(`Hesap güncellenemedi: ${error.message}`)
    console.log(`\n  Mevcut hesap güncellendi.\n  E-posta: ${email}\n  Rol:     ${rol}\n`)
    return
  }

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { rol },
  })
  if (error) bitir(`Hesap oluşturulamadı: ${error.message}`)

  console.log(`\n  Hesap oluşturuldu.\n  E-posta: ${email}\n  Rol:     ${rol}\n`)
  console.log('  Uygulamada sağ üstteki "Personel girişi" ile oturum açabilirsiniz.\n')
}

main().catch((cause: unknown) => {
  bitir(cause instanceof Error ? cause.message : String(cause))
})
