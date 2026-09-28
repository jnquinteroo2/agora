import { CircleAlert } from 'lucide-react'
import { cn } from './cn'

export const estiloControl =
  'transicion-ui w-full rounded-control border border-borde-control bg-superficie-elevada px-3 text-cuerpo text-texto placeholder:text-texto-secundario hover:border-texto disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-error aria-[invalid=true]:hover:border-error'

export function Etiqueta({
  opcional = false,
  className,
  children,
  ...resto
}: React.ComponentPropsWithoutRef<'label'> & { opcional?: boolean }) {
  return (
    <label className={cn('text-nota font-medium text-texto', className)} {...resto}>
      {children}
      {opcional ? <span className="font-normal text-texto-secundario"> (opcional)</span> : null}
    </label>
  )
}

export function Entrada({ className, ...resto }: React.ComponentPropsWithoutRef<'input'>) {
  return <input className={cn(estiloControl, 'h-11', className)} {...resto} />
}

export function Selector({ className, ...resto }: React.ComponentPropsWithoutRef<'select'>) {
  return <select className={cn(estiloControl, 'h-11 pr-8', className)} {...resto} />
}

export function AreaTexto({ className, ...resto }: React.ComponentPropsWithoutRef<'textarea'>) {
  return <textarea className={cn(estiloControl, 'min-h-28 py-2.5', className)} {...resto} />
}

export function MensajeDeError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-nota text-error">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
      <span>{children}</span>
    </p>
  )
}

export interface PropiedadesDeControl {
  id: string
  'aria-invalid': true | undefined
  'aria-describedby': string | undefined
  'aria-required': true | undefined
}

export function Campo({
  id,
  etiqueta,
  ayuda,
  error,
  opcional = false,
  className,
  children,
}: {
  id: string
  etiqueta: React.ReactNode
  ayuda?: React.ReactNode
  error?: React.ReactNode
  opcional?: boolean
  className?: string
  children: (props: PropiedadesDeControl) => React.ReactNode
}) {
  const idAyuda = ayuda ? `${id}-ayuda` : undefined
  const idError = error ? `${id}-error` : undefined
  const describe = [idError, idAyuda].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Etiqueta htmlFor={id} opcional={opcional}>
        {etiqueta}
      </Etiqueta>
      {ayuda ? (
        <p id={idAyuda} className="text-menudo text-texto-secundario">
          {ayuda}
        </p>
      ) : null}
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describe,
        'aria-required': opcional ? undefined : true,
      })}
      {error && idError ? <MensajeDeError id={idError}>{error}</MensajeDeError> : null}
    </div>
  )
}
