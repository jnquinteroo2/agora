'use client'

import { useEffect } from 'react'
import { seguirAlSistema } from './tema'

export function SeguidorDeTema() {
  useEffect(() => seguirAlSistema(), [])
  return null
}
