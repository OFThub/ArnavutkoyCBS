// Haritanın yerleşeceği kapsayıcıyı üretip sağlayıcıya bildiren kanvas bileşeni.

import { useContext } from 'react'
import { Box } from '@mantine/core'
import { MapContainerContext } from './mapContext'

export function MapCanvas() {
  const setContainer = useContext(MapContainerContext)
  return <Box ref={setContainer} h="100%" w="100%" />
}
