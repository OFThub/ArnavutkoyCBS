// Mahalle karnesi: taşınmadan önce bakılan göstergeleri vatandaşa açık dille sunan kamu sayfası.

import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Anchor,
  Box,
  Button,
  Container,
  Grid,
  Group,
  Loader,
  Paper,
  Progress,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { DISTRICT } from '../config/district'
import { formatDistance } from '../core/format'
import { encodeMapState } from '../core/mapState'
import { navigate } from '../core/route'
import { DEFAULT_VISIBLE_LAYERS } from '../store/appStore'
import { Antet } from '../theming/Antet'
import { loadKarneler, type KarneBolumu, type MahalleKarne } from './guideScore'
import { exportKarnePdf } from './karnePdf'

function puanRengi(puan: number): string {
  if (puan >= 70) return 'var(--pafta-tarim)'
  if (puan >= 40) return 'var(--pafta-aski)'
  return 'var(--pafta-kadastro)'
}

function mesafe(value: number | null): string {
  return value === null ? 'Veri yok' : formatDistance(value)
}

/** Tezgâhı bu mahallenin üstünde açan kalıcı bağlantı; harita durumu hash'ten okunur. */
function haritaBaglantisi(karne: MahalleKarne): string {
  return encodeMapState({
    lng: karne.merkez[0],
    lat: karne.merkez[1],
    zoom: 14,
    bearing: 0,
    pitch: 0,
    basemap: 'liberty',
    layers: [...DEFAULT_VISIBLE_LAYERS, 'poi', 'otobus-duragi', 'park-bahce'],
  })
}

function BolumKarti({
  baslik,
  aciklama,
  bolum,
  satirlar,
}: {
  baslik: string
  aciklama: string
  bolum: KarneBolumu
  satirlar: { etiket: string; deger: string }[]
}) {
  return (
    <Paper withBorder radius="sm" p="md" h="100%">
      <Stack gap="xs">
        <Group justify="space-between" align="baseline" wrap="nowrap">
          <Text className="pafta-baslik" fz="sm" tt="uppercase">
            {baslik}
          </Text>
          <Text className="pafta-veri" fz="lg" fw={700} c={puanRengi(bolum.puan)}>
            {bolum.puan}
          </Text>
        </Group>

        <Progress
          value={bolum.puan}
          size="sm"
          radius={0}
          color={puanRengi(bolum.puan)}
          aria-label={`${baslik} puanı ${bolum.puan} / 100`}
        />

        <Text fz={11} c="dimmed">
          {bolum.etiket} · {aciklama}
        </Text>

        <Stack gap={2} pt={4}>
          {satirlar.map((satir) => (
            <Group key={satir.etiket} justify="space-between" gap="xs" wrap="nowrap">
              <Text fz={11} c="dimmed">
                {satir.etiket}
              </Text>
              <Text className="pafta-veri">{satir.deger}</Text>
            </Group>
          ))}
        </Stack>
      </Stack>
    </Paper>
  )
}

function KontrolListesi({ karne }: { karne: MahalleKarne }) {
  const maddeler: string[] = []

  if (karne.deprem.agirHasarliBina > 50) {
    maddeler.push(
      `Bakacağınız binanın yapım yılını ve varsa deprem güçlendirme raporunu isteyin — bu mahallede senaryoda ${karne.deprem.agirHasarliBina} bina ağır hasar alıyor.`,
    )
  }
  if (karne.erisim.hastaneM === null || karne.erisim.hastaneM > 3000) {
    maddeler.push('En yakın hastane uzak. Acil durumda hangi hastaneye gideceğinizi önceden belirleyin.')
  }
  if (karne.erisim.okulM === null || karne.erisim.okulM > 2000) {
    maddeler.push('Okul mesafesi uzun. Servis var mı, hangi okula kayıt yapılıyor, önden sorun.')
  }
  if (karne.erisim.durakM === null || karne.erisim.durakM > 1000) {
    maddeler.push('Toplu taşıma durağı yürüme mesafesinde değil. Araçsız ulaşımı deneyin.')
  }
  if (karne.hizmet.pazar === 0) {
    maddeler.push('Mahallede semt pazarı yok. En yakın pazarın gününü ve yerini öğrenin.')
  }
  if (karne.altyapi.icmeSuyuHasari > 10) {
    maddeler.push('Altyapı hasar beklentisi yüksek. Binanın su deposu ve jeneratör durumunu sorun.')
  }

  maddeler.push('Tapu ve imar durumunu belediyeden teyit edin — bu sayfa resmî imar belgesi yerine geçmez.')

  return (
    <Paper withBorder radius="sm" p="md">
      <Text className="pafta-baslik" fz="sm" tt="uppercase" mb="xs">
        Taşınmadan önce
      </Text>
      <Stack gap={8}>
        {maddeler.map((madde, index) => (
          <Group key={madde} gap={10} align="flex-start" wrap="nowrap">
            <Text className="pafta-veri" c="dimmed" pt={1}>
              {String(index + 1).padStart(2, '0')}
            </Text>
            <Text fz="sm">{madde}</Text>
          </Group>
        ))}
      </Stack>
    </Paper>
  )
}

export function GuidePage() {
  const [karneler, setKarneler] = useState<MahalleKarne[] | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [secili, setSecili] = useState<string | null>(null)
  const [pdfBusy, setPdfBusy] = useState(false)

  useEffect(() => {
    loadKarneler()
      .then((sonuc) => {
        setKarneler(sonuc)
        setSecili(sonuc[0]?.uavt ?? null)
      })
      .catch((error: unknown) => {
        setHata(error instanceof Error ? error.message : 'Mahalle verisi yüklenemedi')
      })
  }, [])

  const karne = useMemo(
    () => karneler?.find((item) => item.uavt === secili) ?? null,
    [karneler, secili],
  )

  const siralama = useMemo(() => {
    if (!karneler || !karne) return null
    const sirali = [...karneler].sort((a, b) => b.genelPuan - a.genelPuan)
    return sirali.findIndex((item) => item.uavt === karne.uavt) + 1
  }, [karneler, karne])

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <Box>
            <Text className="pafta-antet__etiket">{DISTRICT.province} · {DISTRICT.name}</Text>
            <Title order={1} className="pafta-baslik" fz={34}>
              Mahalle karnesi
            </Title>
            <Text c="dimmed" fz="sm" maw={620} mt={4}>
              Bir mahalleye taşınmadan önce bakılması gereken göstergeler: deprem senaryosu,
              günlük ihtiyaçlara mesafe, mahalledeki hizmetler ve altyapı hasar beklentisi.
              Hepsi İBB açık verisi ve OpenStreetMap'ten geliyor.
            </Text>
          </Box>
          <Anchor
            component="button"
            type="button"
            fz="sm"
            onClick={() => navigate('/')}
          >
            Harita uygulamasına git →
          </Anchor>
        </Group>

        {hata ? (
          <Alert color="red" title="Veri yüklenemedi">
            <Text fz="sm">{hata}</Text>
            <Text fz="sm" mt={4}>
              Veri dosyaları eksik olabilir. Yönetici için: `npm run data:build` çalıştırın.
            </Text>
          </Alert>
        ) : null}

        {!karneler && !hata ? (
          <Group gap="xs">
            <Loader size="sm" />
            <Text fz="sm" c="dimmed">
              38 mahallenin göstergeleri hesaplanıyor…
            </Text>
          </Group>
        ) : null}

        {karneler && karne ? (
          <>
            <Select
              label="Mahalle"
              placeholder="Mahalle seçin"
              searchable
              allowDeselect={false}
              maw={360}
              value={secili}
              onChange={setSecili}
              data={[...karneler]
                .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
                .map((item) => ({ value: item.uavt, label: item.ad }))}
            />

            <Grid gutter="md">
              <Grid.Col span={{ base: 12, sm: 5, md: 4 }}>
                <Antet
                  baslik={`${DISTRICT.name} · Mahalle Karnesi`}
                  satirlar={[
                    { etiket: 'Mahalle', deger: karne.ad },
                    { etiket: 'UAVT', deger: karne.uavt },
                    {
                      etiket: 'Konum',
                      deger: `${karne.merkez[1].toFixed(4)} / ${karne.merkez[0].toFixed(4)}`,
                    },
                    { etiket: 'Genel puan', deger: `${karne.genelPuan} / 100` },
                    {
                      etiket: 'Sıralama',
                      deger: siralama ? `${siralama}. / ${karneler.length}` : '—',
                    },
                    { etiket: 'Düzenleme', deger: new Date().toLocaleDateString('tr-TR') },
                  ]}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 7, md: 8 }}>
                <KontrolListesi karne={karne} />
              </Grid.Col>
            </Grid>

            <Grid gutter="md">
              <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <BolumKarti
                  baslik="Deprem"
                  aciklama="İBB deprem senaryosu"
                  bolum={karne.deprem}
                  satirlar={[
                    { etiket: 'Ağır hasarlı bina', deger: String(karne.deprem.agirHasarliBina) },
                    { etiket: 'Hasarlı bina (toplam)', deger: String(karne.deprem.toplamHasarliBina) },
                    { etiket: 'Can kaybı beklentisi', deger: String(karne.deprem.canKaybi) },
                    { etiket: 'Geçici barınma', deger: `${karne.deprem.geciciBarinma} kişi` },
                  ]}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <BolumKarti
                  baslik="Erişim"
                  aciklama="mahalle merkezinden mesafe"
                  bolum={karne.erisim}
                  satirlar={[
                    { etiket: 'Hastane', deger: mesafe(karne.erisim.hastaneM) },
                    { etiket: 'Eczane', deger: mesafe(karne.erisim.eczaneM) },
                    { etiket: 'Okul', deger: mesafe(karne.erisim.okulM) },
                    { etiket: 'Park', deger: mesafe(karne.erisim.parkM) },
                    { etiket: 'Otobüs durağı', deger: mesafe(karne.erisim.durakM) },
                  ]}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <BolumKarti
                  baslik="Hizmetler"
                  aciklama="mahalle sınırı içinde"
                  bolum={karne.hizmet}
                  satirlar={[
                    { etiket: 'Park ve bahçe', deger: String(karne.hizmet.park) },
                    { etiket: 'Kablosuz ağ noktası', deger: String(karne.hizmet.kablosuzAg) },
                    { etiket: 'Geri dönüşüm', deger: String(karne.hizmet.geriDonusum) },
                    { etiket: 'Semt pazarı', deger: String(karne.hizmet.pazar) },
                    { etiket: 'Otobüs durağı', deger: String(karne.hizmet.durak) },
                  ]}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <BolumKarti
                  baslik="Altyapı"
                  aciklama="senaryoda beklenen boru hasarı"
                  bolum={karne.altyapi}
                  satirlar={[
                    { etiket: 'Doğalgaz', deger: String(karne.altyapi.dogalgazHasari) },
                    { etiket: 'İçme suyu', deger: String(karne.altyapi.icmeSuyuHasari) },
                    { etiket: 'Atık su', deger: String(karne.altyapi.atikSuHasari) },
                  ]}
                />
              </Grid.Col>
            </Grid>

            <Group gap="xs">
              <Button onClick={() => navigate(`/#${haritaBaglantisi(karne)}`)}>
                {karne.ad} mahallesini haritada aç
              </Button>
              <Button
                variant="default"
                loading={pdfBusy}
                onClick={() => {
                  setPdfBusy(true)
                  void exportKarnePdf(karne).finally(() => setPdfBusy(false))
                }}
              >
                Karneyi PDF indir
              </Button>
            </Group>

            <Text fz={11} c="dimmed">
              Kaynaklar: İBB Açık Veri (deprem senaryosu, sağlık kurumları), OpenStreetMap
              (hizmet noktaları). Mahalle sınırları yaklaşıktır. Bu sayfa bilgilendirme amaçlıdır,
              resmî imar veya tapu belgesi yerine geçmez.
            </Text>
          </>
        ) : null}
      </Stack>
    </Container>
  )
}
