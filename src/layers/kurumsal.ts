// Kurumsal katmanların config listesi; şema ve RLS zaten hazır, her satır bir tabloyu haritaya bağlar.

import type { LayerModule } from '../core/types'
import { supabaseLayer, type SupabaseLayerSpec } from './supabaseLayer'

// İmar plan lejandı renk kodu (Mekânsal Planlar Yapım Yönetmeliği).
const IMAR_RENKLERI: Record<string, string> = {
  konut: '#e8c95a',
  ticaret: '#d9534f',
  'ticaret-konut': '#e07b5a',
  sanayi: '#9b6fb0',
  'resmi-kurum': '#8aa2c0',
  egitim: '#f0a94a',
  saglik: '#e86a6a',
  'yesil-alan': '#6E8B3D',
  park: '#4d9c52',
  rekreasyon: '#7fbf7f',
  tarim: '#c8d68a',
  orman: '#3f7a3f',
  su: '#2E6E8E',
}

const SPECS: SupabaseLayerSpec[] = [
  {
    id: 'imar-lekesi',
    title: 'İmar planı (lekeler)',
    group: 'mulkiyet',
    access: 'personel',
    table: 'imar_lekesi',
    select: 'id, fonksiyon, taks, kaks, hmax, geom',
    shape: 'fill',
    color: '#a8a29e',
    colorBy: { field: 'fonksiyon', values: IMAR_RENKLERI },
    bosMesaj:
      'İmar lekesi verisi henüz yüklenmedi. Belediye imar planı GeoJSON olarak içe aktarıldığında bu katman dolar (Araçlar → Veri içe aktar).',
    legend: [
      { color: IMAR_RENKLERI['konut']!, label: 'Konut', shape: 'fill' },
      { color: IMAR_RENKLERI['ticaret']!, label: 'Ticaret', shape: 'fill' },
      { color: IMAR_RENKLERI['sanayi']!, label: 'Sanayi', shape: 'fill' },
      { color: IMAR_RENKLERI['egitim']!, label: 'Eğitim', shape: 'fill' },
      { color: IMAR_RENKLERI['yesil-alan']!, label: 'Yeşil alan', shape: 'fill' },
      { color: IMAR_RENKLERI['tarim']!, label: 'Tarım', shape: 'fill' },
    ],
  },
  {
    id: 'imar-uygulama-alani',
    title: 'İmar uygulama alanları',
    group: 'mulkiyet',
    access: 'personel',
    table: 'imar_uygulama_alani',
    select: 'id, ad, uygulama_turu, encumen_karar_no, karar_tarihi, durum, geom',
    shape: 'fill',
    color: '#D9A02B',
    labelField: 'ad',
    bosMesaj:
      '18. madde uygulama alanı kaydı yok. İmar Müdürlüğü encümen kararlarını içe aktardığında listelenir.',
  },
  {
    id: 'numarataj',
    title: 'Numarataj (adres noktaları)',
    group: 'mulkiyet',
    access: 'personel',
    table: 'adres',
    select: 'id, csbm, kapi_no, bagimsiz_bolum, uavt_kod, geom',
    shape: 'circle',
    color: '#C8402F',
    labelField: 'kapi_no',
    limit: 20000,
    bosMesaj:
      'Adres kaydı yok. UAVT numarataj verisi yüklendiğinde kapı numaraları haritada görünür.',
  },
  {
    id: 'yol-rayic',
    title: 'Yol rayiç değerleri',
    group: 'mulkiyet',
    access: 'personel',
    table: 'yol_rayic',
    select: 'id, cadde_sokak, yil, rayic_tl_m2, geom',
    shape: 'line',
    color: '#9b6fb0',
    labelField: 'cadde_sokak',
    bosMesaj:
      'Rayiç kaydı yok. Emlak servisinin cadde/sokak rayiç cetveli içe aktarıldığında çizilir.',
  },
  {
    id: 'fen-isleri',
    title: 'Fen işleri çalışmaları',
    group: 'altyapi',
    access: 'public',
    table: 'kazi_ruhsat',
    select: 'id, kurum, baslangic, bitis, durum, aciklama, geom',
    shape: 'line',
    color: '#D9A02B',
    labelField: 'kurum',
    bosMesaj:
      'Açık kazı ruhsatı yok. Altyapı kurumları çalışma bildirdiğinde güzergâhlar burada görünür.',
  },
  {
    id: 'projeler',
    title: 'Projeler',
    group: 'altyapi',
    access: 'public',
    table: 'proje',
    select: 'id, ad, tur, durum, baslangic, bitis, yuklenici, geom',
    shape: 'fill',
    color: '#2E6E8E',
    labelField: 'ad',
    colorBy: {
      field: 'durum',
      values: { planlandi: '#8aa2c0', devam: '#D9A02B', tamamlandi: '#6E8B3D', iptal: '#a8a29e' },
    },
    bosMesaj: 'Kayıtlı proje yok. Belediye yatırım programı girildiğinde haritada listelenir.',
    legend: [
      { color: '#8aa2c0', label: 'Planlandı', shape: 'fill' },
      { color: '#D9A02B', label: 'Devam ediyor', shape: 'fill' },
      { color: '#6E8B3D', label: 'Tamamlandı', shape: 'fill' },
    ],
  },
  {
    id: 'zemin-etut',
    title: 'Zemin etüd çalışmaları',
    group: 'altyapi',
    access: 'personel',
    table: 'zemin_etut',
    select: 'id, rapor_no, etut_tarihi, zemin_sinifi, tasima_gucu_kpa, sivilasma_riski, geom',
    shape: 'circle',
    color: '#7a5c3a',
    labelField: 'rapor_no',
    colorBy: {
      field: 'sivilasma_riski',
      values: { yok: '#6E8B3D', dusuk: '#c8d68a', orta: '#D9A02B', yuksek: '#C8402F' },
    },
    bosMesaj:
      'Zemin etüd raporu yok. Jeolojik etüt sonuçları içe aktarıldığında sıvılaşma riski renklenir.',
    legend: [
      { color: '#6E8B3D', label: 'Sıvılaşma riski yok', shape: 'circle' },
      { color: '#D9A02B', label: 'Orta risk', shape: 'circle' },
      { color: '#C8402F', label: 'Yüksek risk', shape: 'circle' },
    ],
  },
  {
    id: 'toplanma-alani',
    title: 'Afet ACİL — toplanma alanları',
    group: 'risk',
    access: 'public',
    table: 'toplanma_alani',
    select: 'id, ad, kapasite_kisi, alan_m2, geom',
    shape: 'fill',
    color: '#6E8B3D',
    labelField: 'ad',
    bosMesaj:
      'Toplanma alanı kaydı yok. AFAD listesi yüklendiğinde tahliye analizi de bu veriyi kullanır.',
  },
  {
    id: 'askidaki-imar-plani',
    title: 'Askıdaki imar planları',
    group: 'mulkiyet',
    access: 'public',
    table: 'imar_lekesi',
    select: 'id, fonksiyon, taks, kaks, hmax, geom, imar_plani!inner(ad, durum, aski_bitis)',
    shape: 'fill',
    color: '#D9A02B',
    // imar_plani_okuma_askida politikası askıdaki planı anonim okumaya zaten açıyor.
    equals: { column: 'imar_plani.durum', value: 'askida' },
    bosMesaj: 'Şu anda askıda plan yok. Askı süreci başladığında ilan bu katmanda görünür.',
  },
]

export const kurumsalLayers: LayerModule[] = SPECS.map(supabaseLayer)
