// İmar planı, lekesi ve tesisi öznitelik formları. Durum ebeveynde tutulur; burası yalnızca giriş yüzeyi.

import { Group, NumberInput, Select, Stack, TextInput, Textarea } from '@mantine/core'
import {
  IMAR_FONKSIYONLARI,
  PLAN_DURUMLARI,
  TESIS_DURUMLARI,
  TESIS_TURLERI,
  YAPI_NIZAMLARI,
  yilEtiketi,
  type LekeGirdi,
  type PlanGirdi,
  type TesisGirdi,
} from '../../core/imar'

export const BOS_PLAN: PlanGirdi = {
  ad: '',
  olcek: '1/1000',
  onay_tarihi: '',
  aski_baslangic: '',
  aski_bitis: '',
  durum: 'taslak',
}

export const BOS_LEKE: LekeGirdi = {
  fonksiyon: 'konut',
  taks: '',
  kaks: '',
  hmax: '',
  kat_adedi: '',
  yapi_nizami: '',
  ada: '',
  parsel: '',
  plan_notu: '',
}

export const BOS_TESIS: TesisGirdi = {
  tur: 'cami',
  ad: '',
  alan_m2: '',
  kapasite: '',
  durum: 'planlanan',
  yil: '',
  aciklama: '',
}

type Yaz<T> = (alan: keyof T, value: string) => void

function yazici<T>(value: T, onChange: (next: T) => void): Yaz<T> {
  return (alan, next) => onChange({ ...value, [alan]: next })
}

export function PlanForm({
  value,
  onChange,
  disabled = false,
}: {
  value: PlanGirdi
  onChange: (next: PlanGirdi) => void
  disabled?: boolean
}) {
  const yaz = yazici(value, onChange)

  return (
    <Stack gap="xs">
      <TextInput
        size="xs"
        label="Plan adı"
        required
        disabled={disabled}
        placeholder="Merkez Revizyon İmar Planı"
        value={value.ad}
        onChange={(event) => yaz('ad', event.currentTarget.value)}
      />
      <Group gap="xs" grow>
        <TextInput
          size="xs"
          label="Ölçek"
          required
          disabled={disabled}
          placeholder="1/1000"
          value={value.olcek}
          onChange={(event) => yaz('olcek', event.currentTarget.value)}
        />
        <Select
          size="xs"
          label="Durum"
          allowDeselect={false}
          disabled={disabled}
          data={PLAN_DURUMLARI}
          value={value.durum}
          onChange={(next) => next && yaz('durum', next)}
        />
      </Group>
      <TextInput
        size="xs"
        type="date"
        label="Onay tarihi"
        disabled={disabled}
        value={value.onay_tarihi}
        onChange={(event) => yaz('onay_tarihi', event.currentTarget.value)}
      />
      <Group gap="xs" grow>
        <TextInput
          size="xs"
          type="date"
          label="Askı başlangıç"
          disabled={disabled}
          value={value.aski_baslangic}
          onChange={(event) => yaz('aski_baslangic', event.currentTarget.value)}
        />
        <TextInput
          size="xs"
          type="date"
          label="Askı bitiş"
          disabled={disabled}
          value={value.aski_bitis}
          onChange={(event) => yaz('aski_bitis', event.currentTarget.value)}
        />
      </Group>
    </Stack>
  )
}

export function LekeForm({
  value,
  onChange,
  disabled = false,
}: {
  value: LekeGirdi
  onChange: (next: LekeGirdi) => void
  disabled?: boolean
}) {
  const yaz = yazici(value, onChange)

  return (
    <Stack gap="xs">
      <Select
        size="xs"
        label="Fonksiyon"
        required
        searchable
        allowDeselect={false}
        disabled={disabled}
        data={IMAR_FONKSIYONLARI}
        value={value.fonksiyon}
        onChange={(next) => next && yaz('fonksiyon', next)}
      />

      <Group gap="xs" grow>
        <NumberInput
          size="xs"
          label="TAKS"
          decimalScale={2}
          step={0.05}
          min={0}
          max={1}
          disabled={disabled}
          value={value.taks}
          onChange={(next) => yaz('taks', String(next))}
        />
        <NumberInput
          size="xs"
          label="KAKS (Emsal)"
          decimalScale={2}
          step={0.25}
          min={0}
          disabled={disabled}
          value={value.kaks}
          onChange={(next) => yaz('kaks', String(next))}
        />
      </Group>

      <Group gap="xs" grow>
        <NumberInput
          size="xs"
          label="Hmax (m)"
          decimalScale={2}
          step={0.5}
          min={0}
          disabled={disabled}
          value={value.hmax}
          onChange={(next) => yaz('hmax', String(next))}
        />
        <NumberInput
          size="xs"
          label="Kat adedi"
          min={1}
          max={100}
          allowDecimal={false}
          disabled={disabled}
          value={value.kat_adedi}
          onChange={(next) => yaz('kat_adedi', String(next))}
        />
      </Group>

      <Select
        size="xs"
        label="Yapı nizamı"
        clearable
        disabled={disabled}
        data={YAPI_NIZAMLARI}
        value={value.yapi_nizami === '' ? null : value.yapi_nizami}
        onChange={(next) => yaz('yapi_nizami', next ?? '')}
      />

      <Group gap="xs" grow>
        <TextInput
          size="xs"
          label="Ada"
          disabled={disabled}
          value={value.ada}
          onChange={(event) => yaz('ada', event.currentTarget.value)}
        />
        <TextInput
          size="xs"
          label="Parsel"
          disabled={disabled}
          value={value.parsel}
          onChange={(event) => yaz('parsel', event.currentTarget.value)}
        />
      </Group>

      <Textarea
        size="xs"
        label="Plan notu"
        autosize
        minRows={2}
        maxRows={5}
        disabled={disabled}
        value={value.plan_notu}
        onChange={(event) => yaz('plan_notu', event.currentTarget.value)}
      />
    </Stack>
  )
}

export function TesisForm({
  value,
  onChange,
  hesaplananAlan,
  disabled = false,
}: {
  value: TesisGirdi
  onChange: (next: TesisGirdi) => void
  /** Çizilen geometrinin m² alanı; boş bırakılan alan bu değerle kaydedilir. */
  hesaplananAlan: number
  disabled?: boolean
}) {
  const yaz = yazici(value, onChange)

  return (
    <Stack gap="xs">
      <Select
        size="xs"
        label="Tesis türü"
        required
        searchable
        allowDeselect={false}
        disabled={disabled}
        data={TESIS_TURLERI}
        value={value.tur}
        onChange={(next) => next && yaz('tur', next)}
      />

      <TextInput
        size="xs"
        label="Ad"
        placeholder="Merkez Camii"
        disabled={disabled}
        value={value.ad}
        onChange={(event) => yaz('ad', event.currentTarget.value)}
      />

      <Group gap="xs" grow>
        <NumberInput
          size="xs"
          label="Alan (m²)"
          description={hesaplananAlan > 0 ? `Çizim: ${Math.round(hesaplananAlan)}` : 'Çizimden'}
          min={0}
          decimalScale={2}
          disabled={disabled}
          value={value.alan_m2}
          onChange={(next) => yaz('alan_m2', String(next))}
        />
        <NumberInput
          size="xs"
          label="Kapasite (kişi)"
          min={0}
          allowDecimal={false}
          disabled={disabled}
          value={value.kapasite}
          onChange={(next) => yaz('kapasite', String(next))}
        />
      </Group>

      <Group gap="xs" grow>
        <Select
          size="xs"
          label="Durum"
          allowDeselect={false}
          disabled={disabled}
          data={TESIS_DURUMLARI}
          value={value.durum}
          onChange={(next) => next && yaz('durum', next)}
        />
        <NumberInput
          size="xs"
          label={yilEtiketi(value.durum)}
          min={1900}
          max={2200}
          allowDecimal={false}
          disabled={disabled}
          value={value.yil}
          onChange={(next) => yaz('yil', String(next))}
        />
      </Group>

      <Textarea
        size="xs"
        label="Açıklama"
        autosize
        minRows={2}
        maxRows={5}
        disabled={disabled}
        value={value.aciklama}
        onChange={(event) => yaz('aciklama', event.currentTarget.value)}
      />
    </Stack>
  )
}
