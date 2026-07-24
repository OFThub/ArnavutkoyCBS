// Denetim izi ve medya eklerinin Supabase üzerinden okunması; yetki veya yapılandırma yoksa nedeni açıkça bildirilir.

import { supabase } from '../lib/supabase'
import type { Role } from '../core/types'

export type RecordAccess = 'yapilandirilmamis' | 'yetkisiz' | 'ok'

export interface AuditEntry {
  id: number
  islem: string
  zaman: string
  kullaniciEposta: string | null
}

export interface Attachment {
  id: number
  dosyaAdi: string
  mimeTur: string | null
  boyutBayt: number | null
  storageYolu: string
}

export interface RecordHistory {
  access: RecordAccess
  entries: AuditEntry[]
}

export interface RecordAttachments {
  access: RecordAccess
  items: Attachment[]
}

function accessFor(required: 'personel' | 'yonetici', role: Role): RecordAccess {
  if (!supabase) return 'yapilandirilmamis'
  if (required === 'yonetici' && role !== 'yonetici') return 'yetkisiz'
  if (required === 'personel' && role === 'public') return 'yetkisiz'
  return 'ok'
}

export async function fetchAuditTrail(
  tablo: string,
  kayitId: string,
  role: Role,
): Promise<RecordHistory> {
  const access = accessFor('yonetici', role)
  if (access !== 'ok' || !supabase) return { access, entries: [] }

  const { data, error } = await supabase
    .from('islem_log')
    .select('id, islem, zaman, kullanici_eposta')
    .eq('tablo', tablo)
    .eq('kayit_id', kayitId)
    .order('zaman', { ascending: false })
    .limit(20)

  if (error) throw new Error(`Denetim izi okunamadı: ${error.message}`)

  return {
    access,
    entries: (data ?? []).map((row) => ({
      id: Number(row.id),
      islem: String(row.islem),
      zaman: String(row.zaman),
      kullaniciEposta: row.kullanici_eposta === null ? null : String(row.kullanici_eposta),
    })),
  }
}

export async function fetchAttachments(
  tablo: string,
  kayitId: string,
  role: Role,
): Promise<RecordAttachments> {
  const access = accessFor('personel', role)
  if (access !== 'ok' || !supabase) return { access, items: [] }

  const { data, error } = await supabase
    .from('ek_dosya')
    .select('id, dosya_adi, mime_tur, boyut_bayt, storage_yolu')
    .eq('tablo', tablo)
    .eq('kayit_id', kayitId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw new Error(`Ekler okunamadı: ${error.message}`)

  return {
    access,
    items: (data ?? []).map((row) => ({
      id: Number(row.id),
      dosyaAdi: String(row.dosya_adi),
      mimeTur: row.mime_tur === null ? null : String(row.mime_tur),
      boyutBayt: row.boyut_bayt === null ? null : Number(row.boyut_bayt),
      storageYolu: String(row.storage_yolu),
    })),
  }
}

export function accessMessage(access: RecordAccess, required: 'personel' | 'yönetici'): string {
  if (access === 'yapilandirilmamis') return 'Sunucu bağlantısı yapılandırılmamış.'
  if (access === 'yetkisiz') return `Bu bölüm ${required} yetkisi gerektirir.`
  return 'Kayıt yok.'
}
