'use client'

import React, { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'motion/react'

import { cn } from '@/src/ui/utils'

interface MagicCardBaseProps {
  children?: React.ReactNode
  className?: string
  gradientSize?: number
  gradientFrom?: string
  gradientTo?: string
}

interface MagicCardGradientProps extends MagicCardBaseProps {
  mode?: 'gradient'

  gradientColor?: string
  gradientOpacity?: number

  glowFrom?: never
  glowTo?: never
  glowAngle?: never
  glowSize?: never
  glowBlur?: never
  glowOpacity?: never
}

interface MagicCardOrbProps extends MagicCardBaseProps {
  mode: 'orb'

  glowFrom?: string
  glowTo?: string
  glowAngle?: number
  glowSize?: number
  glowBlur?: number
  glowOpacity?: number

  gradientColor?: never
  gradientOpacity?: never
}

type MagicCardProps = MagicCardGradientProps | MagicCardOrbProps
type ResetReason = 'enter' | 'leave' | 'global' | 'init'

function isOrbMode(props: MagicCardProps): props is MagicCardOrbProps {
  return props.mode === 'orb'
}

function suscribirAlTema(alCambiar: () => void) {
  const observador = new MutationObserver(alCambiar)
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observador.disconnect()
}

function useModoOscuro(): boolean {
  return useSyncExternalStore(
    suscribirAlTema,
    () => document.documentElement.classList.contains('dark'),
    () => false
  )
}

export function MagicCard(props: MagicCardProps) {
  const {
    children,
    className,
    gradientSize = 200,
    gradientColor = 'var(--resplandor-halo)',
    gradientOpacity = 1,
    gradientFrom = 'var(--resplandor-desde)',
    gradientTo = 'var(--resplandor-hasta)',
    mode = 'gradient',
  } = props

  const glowFrom = isOrbMode(props)
    ? (props.glowFrom ?? 'var(--resplandor-desde)')
    : 'var(--resplandor-desde)'
  const glowTo = isOrbMode(props)
    ? (props.glowTo ?? 'var(--resplandor-hasta)')
    : 'var(--resplandor-hasta)'
  const glowAngle = isOrbMode(props) ? (props.glowAngle ?? 90) : 90
  const glowSize = isOrbMode(props) ? (props.glowSize ?? 420) : 420
  const glowBlur = isOrbMode(props) ? (props.glowBlur ?? 60) : 60
  const glowOpacity = isOrbMode(props) ? (props.glowOpacity ?? 0.9) : 0.9
  const isDarkTheme = useModoOscuro()

  const mouseX = useMotionValue(-gradientSize)
  const mouseY = useMotionValue(-gradientSize)

  const orbX = useSpring(mouseX, { stiffness: 250, damping: 30, mass: 0.6 })
  const orbY = useSpring(mouseY, { stiffness: 250, damping: 30, mass: 0.6 })
  const orbVisible = useSpring(0, { stiffness: 300, damping: 35 })

  const modeRef = useRef(mode)
  const glowOpacityRef = useRef(glowOpacity)
  const gradientSizeRef = useRef(gradientSize)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    glowOpacityRef.current = glowOpacity
  }, [glowOpacity])

  useEffect(() => {
    gradientSizeRef.current = gradientSize
  }, [gradientSize])

  const reset = useCallback(
    (reason: ResetReason = 'leave') => {
      const currentMode = modeRef.current

      if (currentMode === 'orb') {
        if (reason === 'enter') orbVisible.set(glowOpacityRef.current)
        else orbVisible.set(0)
        return
      }

      const off = -gradientSizeRef.current
      mouseX.set(off)
      mouseY.set(off)
    },
    [mouseX, mouseY, orbVisible]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== 'mouse') return
      const rect = e.currentTarget.getBoundingClientRect()
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
    },
    [mouseX, mouseY]
  )

  useEffect(() => {
    reset('init')
  }, [reset])

  useEffect(() => {
    const handleGlobalPointerOut = (e: PointerEvent) => {
      if (!e.relatedTarget) reset('global')
    }
    const handleBlur = () => reset('global')
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') reset('global')
    }

    window.addEventListener('pointerout', handleGlobalPointerOut)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('pointerout', handleGlobalPointerOut)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [reset])

  const fondoBorde = useMotionTemplate`
    linear-gradient(var(--superficie-elevada) 0 0) padding-box,
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
      ${gradientFrom},
      ${gradientTo},
      var(--borde) 100%
    ) border-box
  `
  const fondoHalo = useMotionTemplate`
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
      ${gradientColor},
      transparent 100%
    )
  `

  return (
    <motion.div
      className={cn(
        'group relative isolate overflow-hidden rounded-[inherit] border border-transparent',
        className
      )}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => reset('leave')}
      onPointerEnter={(e) => e.pointerType === 'mouse' && reset('enter')}
      style={{ background: fondoBorde }}
    >
      <div className="absolute inset-px z-20 rounded-[inherit] bg-superficie-elevada" />

      {mode === 'gradient' && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-px z-30 rounded-[inherit] opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 motion-reduce:hidden"
          style={{ background: fondoHalo, opacity: gradientOpacity }}
        />
      )}

      {mode === 'orb' && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute z-30 motion-reduce:hidden"
          style={{
            width: glowSize,
            height: glowSize,
            x: orbX,
            y: orbY,
            translateX: '-50%',
            translateY: '-50%',
            borderRadius: 9999,
            filter: `blur(${glowBlur}px)`,
            opacity: orbVisible,
            background: `linear-gradient(${glowAngle}deg, ${glowFrom}, ${glowTo})`,
            mixBlendMode: isDarkTheme ? 'screen' : 'multiply',
            willChange: 'transform, opacity',
          }}
        />
      )}
      <div className="relative z-40">{children}</div>
    </motion.div>
  )
}
