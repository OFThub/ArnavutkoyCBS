// İmar planı düzenleme aracı: plan açar, imar lekesini elle çizer/koordinatla girer,
// lekenin içine tesis (cami, okul, park…) ekler. Tümü Supabase'e yazılır.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActionIcon,
  Alert,
  Button,
  Collapse,
  Divider,
  Group,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { bbox } from '@turf/turf'
import type { MultiPolygon, Polygon } from 'geojson'
import { formatArea } from '../core/format'
import {
  IMAR_FONKSIYONLARI,
  TESIS_DURUMLARI,
  TESIS_TURLERI,
  etiketBul,
  lekeRow,
  planRow,
  polygonArea,
  polygonToVertices,
  tesisRow,
  verticesToPolygon,
  type LngLatPair,
} from '../core/imar'
import {
  createLeke,
  createPlan,
  createTesis,
  deleteLeke,
  deletePlan,
  deleteTesis,
  listLekeler,
  listPlanlar,
  listTesisler,
  updateLeke,
  updateTesis,
  type LekeKaydi,
  type PlanKaydi,
  type TesisKaydi,
} from '../data/imarRepo'
import { isBackendConfigured } from '../lib/supabase'
import { startDrawSession, type DrawSession } from '../map/draw'
import { useMapContext } from '../map/mapContext'
import { useAppStore } from '../store/appStore'
import { BOS_LEKE, BOS_PLAN, BOS_TESIS, LekeForm, PlanForm, TesisForm } from './imar/ImarForms'
import { VertexTable } from './imar/VertexTable'
import type { ToolModule } from './types'

const CIZIM_RENGI = '#D9A02B'

type Mod = 'leke' | 'tesis'

function metin(value: number | string | null): string {
  return value === null ? '' : String(value)
}

function lekeBasligi(leke: LekeKaydi): string {
  const adaParsel = [leke.ada, leke.parsel].filter(Boolean).join('/')
  const fonksiyon = etiketBul(IMAR_FONKSIYONLARI, leke.fonksiyon)
  return adaParsel === '' ? fonksiyon : `${fonksiyon} · ${adaParsel}`
}

function ImarPanel() {
  const { map, overlays, ready } = useMapContext()
  const role = useAppStore((state) => state.role)
  const bumpDataVersion = useAppStore((state) => state.bumpDataVersion)

  const [planlar, setPlanlar] = useState<PlanKaydi[]>([])
  const [planId, setPlanId] = useState<number | null>(null)
  const [planFormAcik, setPlanFormAcik] = useState(false)
  const [planGirdi, setPlanGirdi] = useState(BOS_PLAN)

  const [mod, setMod] = useState<Mod>('leke')
  const [lekeler, setLekeler] = useState<LekeKaydi[]>([])
  const [tesisler, setTesisler] = useState<TesisKaydi[]>([])
  const [seciliLekeId, setSeciliLekeId] = useState<number | null>(null)
  const [duzenlenenLeke, setDuzenlenenLeke] = useState<number | null>(null)
  const [duzenlenenTesis, setDuzenlenenTesis] = useState<number | null>(null)

  const [vertices, setVertices] = useState<LngLatPair[]>([])
  const [lekeGirdi, setLekeGirdi] = useState(BOS_LEKE)
  const [tesisGirdi, setTesisGirdi] = useState(BOS_TESIS)

  const [busy, setBusy] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [uyari, setUyari] = useState<string | null>(null)

  const sessionRef = useRef<DrawSession | null>(null)
  const backend = isBackendConfigured()
  const yetkili = role === 'personel' || role === 'yonetici'

  const geometry = useMemo(() => verticesToPolygon(vertices), [vertices])
  const alan = useMemo(() => polygonArea(geometry), [geometry])
  const seciliLeke = useMemo(
    () => lekeler.find((leke) => leke.id === seciliLekeId) ?? null,
    [lekeler, seciliLekeId],
  )

  const calis = useCallback(async (fn: () => Promise<void>): Promise<void> => {
    setBusy(true)
    setHata(null)
    try {
      await fn()
    } catch (cause: unknown) {
      setHata(cause instanceof Error ? cause.message : 'İşlem tamamlanamadı')
    } finally {
      setBusy(false)
    }
  }, [])

  // ─────────────── çizim oturumu ───────────────

  useEffect(() => {
    if (!map || !overlays || !ready || !backend || !yetkili) return
    const session = startDrawSession(map, overlays, {
      mode: 'polygon',
      color: CIZIM_RENGI,
      onChange: (_feature, next) => setVertices(next),
    })
    sessionRef.current = session
    return () => {
      session.destroy()
      sessionRef.current = null
    }
  }, [map, overlays, ready, backend, yetkili])

  const cizimeYukle = useCallback((next: LngLatPair[], tamamlandi: boolean): void => {
    setVertices(next)
    sessionRef.current?.setVertices(next, tamamlandi)
  }, [])

  const cizimiTemizle = useCallback((): void => {
    setVertices([])
    sessionRef.current?.reset()
  }, [])

  const odakla = useCallback(
    (geom: Polygon | MultiPolygon | null): void => {
      if (!map || !geom) return
      const [west, south, east, north] = bbox({ type: 'Feature', geometry: geom, properties: {} })
      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        { padding: 80, duration: 600 },
      )
    },
    [map],
  )

  // ─────────────── veri yükleme ───────────────

  const yenilePlanlar = useCallback(
    async (secilecek?: number): Promise<void> => {
      const kayitlar = await listPlanlar()
      setPlanlar(kayitlar)
      setPlanId((mevcut) => {
        if (secilecek !== undefined) return secilecek
        if (mevcut !== null && kayitlar.some((plan) => plan.id === mevcut)) return mevcut
        return kayitlar[0]?.id ?? null
      })
    },
    [],
  )

  useEffect(() => {
    if (!backend || !yetkili) return
    void calis(() => yenilePlanlar())
  }, [backend, yetkili, calis, yenilePlanlar])

  const yenileKayitlar = useCallback(async (): Promise<void> => {
    if (planId === null) {
      setLekeler([])
      setTesisler([])
      return
    }
    const lekeKayitlari = await listLekeler(planId)
    setLekeler(lekeKayitlari)
    setTesisler(await listTesisler(lekeKayitlari.map((leke) => leke.id)))
  }, [planId])

  useEffect(() => {
    if (!backend || !yetkili) return
    void calis(() => yenileKayitlar())
  }, [backend, yetkili, calis, yenileKayitlar])

  const sifirla = useCallback((): void => {
    setDuzenlenenLeke(null)
    setDuzenlenenTesis(null)
    setLekeGirdi(BOS_LEKE)
    setTesisGirdi(BOS_TESIS)
    setUyari(null)
    setHata(null)
    cizimiTemizle()
  }, [cizimiTemizle])

  // ─────────────── plan ───────────────

  const kaydetPlan = (): void => {
    const { row, hata: dogrulama } = planRow(planGirdi)
    if (!row) {
      setHata(dogrulama)
      return
    }
    void calis(async () => {
      const kayit = await createPlan(row)
      await yenilePlanlar(kayit.id)
      setPlanGirdi(BOS_PLAN)
      setPlanFormAcik(false)
      notifications.show({ color: 'teal', title: 'İmar planı', message: `${kayit.ad} oluşturuldu` })
    })
  }

  const silPlan = (): void => {
    const plan = planlar.find((item) => item.id === planId)
    if (!plan) return
    if (
      !window.confirm(
        `"${plan.ad}" planı ve içindeki tüm lekeler + tesisler silinecek. Onaylıyor musunuz?`,
      )
    ) {
      return
    }
    void calis(async () => {
      await deletePlan(plan.id)
      sifirla()
      await yenilePlanlar()
      bumpDataVersion()
      notifications.show({ color: 'teal', title: 'İmar planı', message: `${plan.ad} silindi` })
    })
  }

  // ─────────────── leke ───────────────

  const duzenleLeke = (leke: LekeKaydi): void => {
    setMod('leke')
    setDuzenlenenLeke(leke.id)
    setDuzenlenenTesis(null)
    setSeciliLekeId(leke.id)
    setUyari(null)
    setLekeGirdi({
      fonksiyon: leke.fonksiyon,
      taks: metin(leke.taks),
      kaks: metin(leke.kaks),
      hmax: metin(leke.hmax),
      kat_adedi: metin(leke.kat_adedi),
      yapi_nizami: leke.yapi_nizami ?? '',
      ada: leke.ada ?? '',
      parsel: leke.parsel ?? '',
      plan_notu: leke.plan_notu ?? '',
    })
    cizimeYukle(leke.geom ? polygonToVertices(leke.geom) : [], true)
    odakla(leke.geom)
  }

  const kaydetLeke = (): void => {
    const { row, hata: dogrulama } = lekeRow(lekeGirdi, planId, geometry)
    if (!row) {
      setHata(dogrulama)
      return
    }
    void calis(async () => {
      if (duzenlenenLeke !== null) await updateLeke(duzenlenenLeke, row)
      else await createLeke(row)
      await yenileKayitlar()
      bumpDataVersion()
      notifications.show({
        color: 'teal',
        title: 'İmar lekesi',
        message: duzenlenenLeke !== null ? 'Leke güncellendi' : 'Leke kaydedildi',
      })
      sifirla()
    })
  }

  const silLeke = (leke: LekeKaydi): void => {
    if (!window.confirm(`${lekeBasligi(leke)} ve içindeki tesisler silinecek. Onaylıyor musunuz?`)) {
      return
    }
    void calis(async () => {
      await deleteLeke(leke.id)
      if (seciliLekeId === leke.id) setSeciliLekeId(null)
      if (duzenlenenLeke === leke.id) sifirla()
      await yenileKayitlar()
      bumpDataVersion()
      notifications.show({ color: 'teal', title: 'İmar lekesi', message: 'Leke silindi' })
    })
  }

  // ─────────────── tesis ───────────────

  const duzenleTesis = (tesis: TesisKaydi): void => {
    setMod('tesis')
    setSeciliLekeId(tesis.leke_id)
    setDuzenlenenTesis(tesis.id)
    setDuzenlenenLeke(null)
    setUyari(null)
    setTesisGirdi({
      tur: tesis.tur,
      ad: tesis.ad ?? '',
      alan_m2: metin(tesis.alan_m2),
      kapasite: metin(tesis.kapasite),
      durum: tesis.durum,
      yil: metin(tesis.yil),
      aciklama: tesis.aciklama ?? '',
    })
    cizimeYukle(tesis.geom ? polygonToVertices(tesis.geom) : [], true)
    odakla(tesis.geom)
  }

  const kaydetTesis = (): void => {
    const {
      row,
      hata: dogrulama,
      uyari: kapsamaUyarisi,
    } = tesisRow(tesisGirdi, seciliLekeId, geometry, seciliLeke?.geom ?? null)
    setUyari(kapsamaUyarisi)
    if (!row) {
      setHata(dogrulama)
      return
    }
    void calis(async () => {
      if (duzenlenenTesis !== null) await updateTesis(duzenlenenTesis, row)
      else await createTesis(row)
      await yenileKayitlar()
      bumpDataVersion()
      notifications.show({
        color: 'teal',
        title: 'İmar tesisi',
        message: duzenlenenTesis !== null ? 'Tesis güncellendi' : 'Tesis kaydedildi',
      })
      const korunanLeke = seciliLekeId
      sifirla()
      setSeciliLekeId(korunanLeke)
      setMod('tesis')
      if (kapsamaUyarisi) setUyari(kapsamaUyarisi)
    })
  }

  const silTesis = (tesis: TesisKaydi): void => {
    if (!window.confirm(`${etiketBul(TESIS_TURLERI, tesis.tur)} kaydı silinecek. Onaylıyor musunuz?`)) {
      return
    }
    void calis(async () => {
      await deleteTesis(tesis.id)
      if (duzenlenenTesis === tesis.id) sifirla()
      await yenileKayitlar()
      bumpDataVersion()
      notifications.show({ color: 'teal', title: 'İmar tesisi', message: 'Tesis silindi' })
    })
  }

  // ─────────────── erişim kapıları ───────────────

  if (!backend) {
    return (
      <Text size="xs" c="dimmed">
        Sunucu bağlantısı yapılandırılmadı. `.env` içindeki VITE_SUPABASE_URL ve
        VITE_SUPABASE_ANON_KEY doldurulduğunda imar düzenleme açılır.
      </Text>
    )
  }

  if (!yetkili) {
    return (
      <Text size="xs" c="dimmed">
        İmar planı düzenlemek için personel hesabıyla giriş yapın.
      </Text>
    )
  }

  const seciliTesisler = tesisler.filter((tesis) => tesis.leke_id === seciliLekeId)
  const kaydetEtiketi =
    mod === 'leke'
      ? duzenlenenLeke !== null
        ? 'Lekeyi güncelle'
        : 'Lekeyi kaydet'
      : duzenlenenTesis !== null
        ? 'Tesisi güncelle'
        : 'Tesisi kaydet'

  return (
    <Stack gap="sm">
      {/* ── Plan ── */}
      <Stack gap={6}>
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Text size="xs" fw={600}>
            İmar planı
          </Text>
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={() => setPlanFormAcik((acik) => !acik)}
          >
            {planFormAcik ? 'Vazgeç' : '+ Yeni plan'}
          </Button>
        </Group>

        <Select
          size="xs"
          searchable
          allowDeselect={false}
          disabled={planlar.length === 0}
          placeholder={planlar.length === 0 ? 'Kayıtlı plan yok' : 'Plan seçin'}
          value={planId === null ? null : String(planId)}
          onChange={(value) => {
            setPlanId(value === null ? null : Number(value))
            sifirla()
            setSeciliLekeId(null)
          }}
          data={planlar.map((plan) => ({
            value: String(plan.id),
            label: `${plan.ad} · ${plan.olcek}`,
          }))}
        />

        <Collapse in={planFormAcik}>
          <Stack gap="xs">
            <PlanForm value={planGirdi} onChange={setPlanGirdi} disabled={busy} />
            <Button size="xs" loading={busy} onClick={kaydetPlan}>
              Planı oluştur
            </Button>
          </Stack>
        </Collapse>

        {planId !== null && !planFormAcik ? (
          <Button size="compact-xs" variant="subtle" color="red" disabled={busy} onClick={silPlan}>
            Seçili planı sil
          </Button>
        ) : null}
      </Stack>

      {planId === null ? (
        <Alert color="yellow" p="xs">
          <Text size="xs">
            Önce bir imar planı oluşturun. Lekeler ve tesisler her zaman bir plana bağlanır.
          </Text>
        </Alert>
      ) : (
        <>
          <Divider />

          <SegmentedControl
            fullWidth
            size="xs"
            value={mod}
            onChange={(value) => {
              setMod(value as Mod)
              sifirla()
            }}
            data={[
              { value: 'leke', label: 'İmar lekesi' },
              { value: 'tesis', label: 'Leke içi tesis' },
            ]}
          />

          {/* ── Leke listesi ── */}
          <Stack gap={4}>
            <Text fz={10} c="dimmed">
              {mod === 'leke'
                ? `Bu planda ${lekeler.length} leke · düzenlemek için seçin`
                : 'Tesisin ekleneceği üst lekeyi seçin'}
            </Text>

            {lekeler.length > 0 ? (
              <ScrollArea.Autosize mah={160}>
                <Stack gap={2}>
                  {lekeler.map((leke) => {
                    const secili = mod === 'leke' ? duzenlenenLeke === leke.id : seciliLekeId === leke.id
                    const tesisSayisi = tesisler.filter((t) => t.leke_id === leke.id).length
                    return (
                      <Group key={leke.id} gap={4} wrap="nowrap">
                        <Button
                          size="compact-xs"
                          variant={secili ? 'light' : 'subtle'}
                          style={{ flex: 1 }}
                          justify="flex-start"
                          onClick={() => {
                            if (mod === 'leke') {
                              duzenleLeke(leke)
                            } else {
                              setSeciliLekeId(leke.id)
                              setDuzenlenenTesis(null)
                              setUyari(null)
                              odakla(leke.geom)
                            }
                          }}
                        >
                          <Text fz={10} truncate>
                            {lekeBasligi(leke)}
                            {tesisSayisi > 0 ? ` · ${tesisSayisi} tesis` : ''}
                          </Text>
                        </Button>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          onClick={() => odakla(leke.geom)}
                          aria-label="Lekeye odaklan"
                        >
                          ⌖
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          disabled={busy}
                          onClick={() => silLeke(leke)}
                          aria-label="Lekeyi sil"
                        >
                          ×
                        </ActionIcon>
                      </Group>
                    )
                  })}
                </Stack>
              </ScrollArea.Autosize>
            ) : (
              <Text fz={10} c="dimmed">
                Bu planda henüz leke yok. Haritaya çizip aşağıdan kaydedin.
              </Text>
            )}
          </Stack>

          {/* ── Tesis listesi ── */}
          {mod === 'tesis' && seciliLeke ? (
            <Stack gap={4}>
              <Text fz={10} c="dimmed">
                {lekeBasligi(seciliLeke)} içindeki tesisler
              </Text>
              {seciliTesisler.length > 0 ? (
                <ScrollArea.Autosize mah={140}>
                  <Stack gap={2}>
                    {seciliTesisler.map((tesis) => (
                      <Group key={tesis.id} gap={4} wrap="nowrap">
                        <Button
                          size="compact-xs"
                          variant={duzenlenenTesis === tesis.id ? 'light' : 'subtle'}
                          style={{ flex: 1 }}
                          justify="flex-start"
                          onClick={() => duzenleTesis(tesis)}
                        >
                          <Text fz={10} truncate>
                            {tesis.ad || etiketBul(TESIS_TURLERI, tesis.tur)}
                            {tesis.yil ? ` · ${tesis.yil}` : ''} ·{' '}
                            {etiketBul(TESIS_DURUMLARI, tesis.durum)}
                          </Text>
                        </Button>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          disabled={busy}
                          onClick={() => silTesis(tesis)}
                          aria-label="Tesisi sil"
                        >
                          ×
                        </ActionIcon>
                      </Group>
                    ))}
                  </Stack>
                </ScrollArea.Autosize>
              ) : (
                <Text fz={10} c="dimmed">
                  Bu lekede tesis yok.
                </Text>
              )}
            </Stack>
          ) : null}

          <Divider
            label={
              mod === 'leke'
                ? duzenlenenLeke !== null
                  ? 'Lekeyi düzenle'
                  : 'Yeni leke'
                : duzenlenenTesis !== null
                  ? 'Tesisi düzenle'
                  : 'Yeni tesis'
            }
            labelPosition="left"
          />

          {mod === 'tesis' && !seciliLeke ? (
            <Alert color="yellow" p="xs">
              <Text size="xs">Tesis eklemek için yukarıdan bir üst leke seçin.</Text>
            </Alert>
          ) : (
            <>
              <Text fz={10} c="dimmed">
                Haritaya tıklayarak köşe ekleyin · Enter bitirir · Backspace son köşeyi siler ·
                köşeler sürüklenebilir.
              </Text>

              <VertexTable
                vertices={vertices}
                onChange={(next) => cizimeYukle(next, vertices.length >= 3)}
                disabled={busy}
              />

              <Text fz={10} c="dimmed">
                Alan: {alan > 0 ? formatArea(alan) : '—'}
              </Text>

              {mod === 'leke' ? (
                <LekeForm value={lekeGirdi} onChange={setLekeGirdi} disabled={busy} />
              ) : (
                <TesisForm
                  value={tesisGirdi}
                  onChange={setTesisGirdi}
                  hesaplananAlan={alan}
                  disabled={busy}
                />
              )}

              <Group gap="xs" grow>
                <Button
                  size="xs"
                  loading={busy}
                  onClick={mod === 'leke' ? kaydetLeke : kaydetTesis}
                >
                  {kaydetEtiketi}
                </Button>
                <Button size="xs" variant="subtle" disabled={busy} onClick={sifirla}>
                  Vazgeç
                </Button>
              </Group>
            </>
          )}
        </>
      )}

      {uyari ? (
        <Alert color="yellow" p="xs">
          <Text size="xs">{uyari}</Text>
        </Alert>
      ) : null}

      {hata ? (
        <Alert color="red" p="xs">
          <Text size="xs">{hata}</Text>
        </Alert>
      ) : null}
    </Stack>
  )
}

export const imarTool: ToolModule = {
  id: 'imar-duzenle',
  title: 'İmar planı düzenle',
  description: 'İmar lekesi çizer, koordinat girer, leke içine tesis ekler',
  access: 'personel',
  Panel: ImarPanel,
}
