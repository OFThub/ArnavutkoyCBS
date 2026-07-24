// Altlık değiştirici: vektör, uydu ve topografik altlıklar arasında geçiş yapar.

import { Select } from '@mantine/core'
import { BASEMAP_LIST } from '../map/basemap'
import type { BasemapId } from '../config/sources'
import { useAppStore } from '../store/appStore'

export function BasemapSwitcher() {
  const basemap = useAppStore((state) => state.basemap)
  const setBasemap = useAppStore((state) => state.setBasemap)

  return (
    <Select
      size="xs"
      label="Altlık"
      allowDeselect={false}
      value={basemap}
      onChange={(value) => value && setBasemap(value as BasemapId)}
      data={BASEMAP_LIST.map((item) => ({ value: item.id, label: item.title }))}
    />
  )
}
