// Mahalle nüfus/hane bilgisi girişi. Mahalle bazlı nüfus açık veride bulunmadığı için
// (TÜİK ADNKS'nin API'si yok, İBB setleri ilçe kırılımlı) değer elle girilir.
// Kayıt yapılan mahallede karne "tahmini" etiketini bırakır, gerçek veriye geçer.

import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Group, NumberInput, Select, Stack, Text, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { formatAlan, formatYogunluk, yogunluk, yogunlukSinifi } from '../core/nufus'
import { isBackendConfigured, supabase } from '../lib/supabase'
import { useAppStore } from '../store/appStore'
import type { ToolModule } from './types'

interface MahalleSatiri {
  uavt_kod: string
  ad: string
  nufus: number | null
  hane: number | null
  alan_km2: number | null
  veri_yili: number | null
  nufus_kaynak: string | null
}

const SELECT = 'uavt_kod, ad, nufus, hane, alan_km2, veri_yili, nufus_kaynak'

function metin(value: number | null): string {
  return value === null ? '' : String(value)
}

function sayi(value: string): number | null {
  const trimmed = value.trim().replace(',', '.')
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? Math.round(parsed) : null
}

function MahallePanel() {
  const role = useAppStore((state) => state.role)
  const bumpDataVersion = useAppStore((state) => state.bumpDataVersion)

  const [mahalleler, setMahalleler] = useState<MahalleSatiri[]>([])
  const [uavt, setUavt] = useState<string | null>(null)
  const [nufus, setNufus] = useState('')
  const [hane, setHane] = useState('')
  const [yil, setYil] = useState('')
  const [kaynak, setKaynak] = useState('')
  const [busy, setBusy] = useState(false)
  const [hata, setHata] = useState<string | null>(null)

  const backend = isBackendConfigured()
  const yetkili = role === 'personel' || role === 'yonetici'

  const yukle = useCallback(async (): Promise<void> => {
    if (!supabase) return
    const { data, error } = await supabase.from('mahalle').select(SELECT).order('ad')
    if (error) {
      setHata(`Mahalleler okunamadı: ${error.message}`)
      return
    }
    setMahalleler((data ?? []) as unknown as MahalleSatiri[])
  }, [])

  useEffect(() => {
    if (!backend || !yetkili) return
    void yukle()
  }, [backend, yetkili, yukle])

  const secili = mahalleler.find((item) => item.uavt_kod === uavt) ?? null

  // Mahalle değişince formu o mahallenin mevcut kaydıyla doldur.
  useEffect(() => {
    if (!secili) return
    setNufus(metin(secili.nufus))
    setHane(metin(secili.hane))
    setYil(metin(secili.veri_yili))
    setKaynak(secili.nufus_kaynak ?? 'TÜİK ADNKS')
  }, [secili])

  if (!backend) {
    return (
      <Text size="xs" c="dimmed">
        Sunucu bağlantısı yapılandırılmadı. `.env` içindeki VITE_SUPABASE_* değerleri
        doldurulduğunda mahalle bilgisi girişi açılır.
      </Text>
    )
  }

  if (!yetkili) {
    return (
      <Text size="xs" c="dimmed">
        Mahalle nüfus bilgisi girmek için personel hesabıyla giriş yapın.
      </Text>
    )
  }

  const nufusDegeri = sayi(nufus)
  const alanKm2 = secili?.alan_km2 ?? null
  const hesaplananYogunluk = yogunluk(nufusDegeri, alanKm2)
  const sinif = yogunlukSinifi(hesaplananYogunluk)

  const kaydet = (): void => {
    if (!supabase || !secili) return
    if (nufusDegeri === null || nufusDegeri < 0) {
      setHata('Nüfus zorunlu ve negatif olamaz.')
      return
    }

    setBusy(true)
    setHata(null)
    void (async () => {
      try {
        const { error } = await supabase
          .from('mahalle')
          .update({
            nufus: nufusDegeri,
            hane: sayi(hane),
            veri_yili: sayi(yil),
            nufus_kaynak: kaynak.trim() === '' ? null : kaynak.trim(),
          })
          .eq('uavt_kod', secili.uavt_kod)
        if (error) throw new Error(error.message)

        await yukle()
        bumpDataVersion()
        notifications.show({
          color: 'teal',
          title: 'Mahalle bilgisi',
          message: `${secili.ad} nüfusu kaydedildi`,
        })
      } catch (cause: unknown) {
        setHata(cause instanceof Error ? cause.message : 'Kaydedilemedi')
      } finally {
        setBusy(false)
      }
    })()
  }

  return (
    <Stack gap="xs">
      <Select
        size="xs"
        label="Mahalle"
        searchable
        allowDeselect={false}
        placeholder={mahalleler.length === 0 ? 'Mahalle kaydı yok' : 'Mahalle seçin'}
        disabled={mahalleler.length === 0}
        value={uavt}
        onChange={setUavt}
        data={mahalleler.map((item) => ({ value: item.uavt_kod, label: item.ad }))}
      />

      {secili ? (
        <>
          <NumberInput
            size="xs"
            label="Nüfus"
            required
            min={0}
            allowDecimal={false}
            thousandSeparator="."
            decimalSeparator=","
            disabled={busy}
            value={nufus}
            onChange={(next) => setNufus(String(next))}
          />

          <Group gap="xs" grow>
            <NumberInput
              size="xs"
              label="Hane sayısı"
              min={0}
              allowDecimal={false}
              thousandSeparator="."
              decimalSeparator=","
              disabled={busy}
              value={hane}
              onChange={(next) => setHane(String(next))}
            />
            <NumberInput
              size="xs"
              label="Veri yılı"
              min={1900}
              max={2200}
              allowDecimal={false}
              disabled={busy}
              value={yil}
              onChange={(next) => setYil(String(next))}
            />
          </Group>

          <TextInput
            size="xs"
            label="Kaynak"
            placeholder="TÜİK ADNKS"
            disabled={busy}
            value={kaynak}
            onChange={(event) => setKaynak(event.currentTarget.value)}
          />

          <Stack gap={2}>
            <Group justify="space-between" gap="xs">
              <Text fz={10} c="dimmed">
                Yüzölçümü (geometriden)
              </Text>
              <Text fz={10} className="pafta-veri">
                {formatAlan(alanKm2)}
              </Text>
            </Group>
            <Group justify="space-between" gap="xs">
              <Text fz={10} c="dimmed">
                Yoğunluk
              </Text>
              <Text fz={10} className="pafta-veri" c={sinif?.color ?? 'inherit'}>
                {formatYogunluk(hesaplananYogunluk)}
                {sinif ? ` · ${sinif.label}` : ''}
              </Text>
            </Group>
          </Stack>

          <Button size="xs" loading={busy} onClick={kaydet}>
            Kaydet
          </Button>
        </>
      ) : null}

      {hata ? (
        <Alert color="red" p="xs">
          <Text size="xs">{hata}</Text>
        </Alert>
      ) : null}

      <Text fz={10} c="dimmed">
        Mahalle nüfusu açık veride yok; karne şu an bina taban alanından türetilmiş tahmin
        gösteriyor. Buradan girilen değer o mahallede tahminin yerine geçer.
      </Text>
    </Stack>
  )
}

export const mahalleTool: ToolModule = {
  id: 'mahalle-bilgi',
  title: 'Mahalle bilgileri',
  description: 'Mahalle nüfus ve hane sayısını girer',
  access: 'personel',
  Panel: MahallePanel,
}
