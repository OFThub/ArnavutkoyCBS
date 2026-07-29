// Enstrüman rayı: paneli açan ikon şeridi. Masaüstünde solda dikey, mobilde altta yatay durur.

import type { ComponentType } from 'react'
import { ActionIcon, Tooltip } from '@mantine/core'
import {
  IconChartHistogram,
  IconMap2,
  IconMathFunction,
  IconStack2,
  IconTools,
} from '@tabler/icons-react'
import { navigate } from '../core/route'

export type PanelId = 'katmanlar' | 'araclar' | 'analiz' | 'pano'

interface RayOgesi {
  id: PanelId
  label: string
  Icon: ComponentType<{ size?: number; stroke?: number }>
}

export const RAIL_ITEMS: RayOgesi[] = [
  { id: 'katmanlar', label: 'Katmanlar', Icon: IconStack2 },
  { id: 'araclar', label: 'Araçlar', Icon: IconTools },
  { id: 'analiz', label: 'Analiz', Icon: IconMathFunction },
  { id: 'pano', label: 'Pano', Icon: IconChartHistogram },
]

export function Rail({
  active,
  onSelect,
  mobil,
}: {
  active: PanelId | null
  onSelect: (id: PanelId | null) => void
  mobil: boolean
}) {
  return (
    <nav
      aria-label="Panel seçimi"
      style={{
        display: 'flex',
        flexDirection: mobil ? 'row' : 'column',
        justifyContent: mobil ? 'space-around' : 'flex-start',
        alignItems: 'center',
        gap: mobil ? 0 : 4,
        padding: mobil ? '6px 4px' : '10px 0',
        width: mobil ? '100%' : 'var(--pafta-ray)',
        height: mobil ? 'auto' : '100%',
        background: 'var(--pafta-yuzey-duz)',
        borderRight: mobil ? 'none' : '1px solid var(--pafta-cizgi)',
        borderTop: mobil ? '1px solid var(--pafta-cizgi)' : 'none',
        flexShrink: 0,
      }}
    >
      {RAIL_ITEMS.map(({ id, label, Icon }) => (
        <Tooltip key={id} label={label} position={mobil ? 'top' : 'right'} openDelay={400}>
          <ActionIcon
            variant={active === id ? 'filled' : 'subtle'}
            color={active === id ? 'kadastro' : 'gray'}
            size={44}
            radius="sm"
            aria-label={label}
            aria-pressed={active === id}
            onClick={() => onSelect(active === id ? null : id)}
          >
            <Icon size={22} stroke={1.6} />
          </ActionIcon>
        </Tooltip>
      ))}

      <Tooltip label="Mahalle karnesi" position={mobil ? 'top' : 'right'} openDelay={400}>
        <ActionIcon
          variant="subtle"
          color="gray"
          size={44}
          radius="sm"
          aria-label="Mahalle karnesi sayfasına git"
          style={mobil ? undefined : { marginTop: 'auto' }}
          onClick={() => navigate('/rehber')}
        >
          <IconMap2 size={22} stroke={1.6} />
        </ActionIcon>
      </Tooltip>
    </nav>
  )
}
