// Harita araçlarının uyması gereken sözleşme; panel bileşeninin bağlanması aracın etkinleşmesi demektir.

import type { ComponentType } from 'react'
import type { Access } from '../core/types'

export interface ToolModule {
  id: string
  title: string
  description: string
  access: Access
  Panel: ComponentType
}
