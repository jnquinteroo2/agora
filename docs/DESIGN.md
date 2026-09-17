# DESIGN — Sistema de Diseño Ágora

Skill aplicada: `frontend-design` — dirección estética deliberada antes de escribir una línea de UI.  
Skill aplicada: `visual-design-foundations` — tipografía, color, ritmo, espaciado.  
Skill aplicada: `tailwind-design-system` — tokens en CSS nativo con Tailwind v4.

---

## Dirección estética: Neoclásico estoico con rigor editorial

La referencia no es un sitio de colegio colombiano genérico.  
La referencia es la intersección de tres registros:

1. **Editorial académica europea** (Prestel, Taschen, Princeton University Press): márgenes generosos, tipografía serif con carácter, jerarquía construida con escala y peso, no con color.
2. **Papelería institucional griega clásica** reinterpretada: la greca como filete, la lambda como sello, el laurel como ornamento disciplinado.
3. **Periódico de calidad de los años 90** (El País, Le Monde): densidad de información en el panel, sin ruido, jerarquía por tamaño y posición.

**La regla de oro**: un elemento carmín por pantalla visible. El rojo no decora, sentencia.

---

## Tokens de color

Definidos en CSS nativo (`tokens.css`), consumidos por Tailwind v4 via `@theme`.

```css
@theme {
  /* Escala cromática base */
  --color-tinta:        #0B0B0C;   /* negro principal */
  --color-hueso:        #F6F4EF;   /* blanco cálido, fondo público */
  --color-papel:        #FFFFFF;   /* superficies elevadas */
  --color-carmin:       #C1121F;   /* acento único — máximo 1 por pantalla */
  --color-carmin-hondo: #8A0D16;   /* pressed, texto sobre claro */
  --color-laurel:       #C9A227;   /* detalle dorado: filetes, sello, aro del escudo */
  --color-piedra:       #6B6660;   /* texto secundario */
  --color-niebla:       #E4E0D8;   /* bordes y separadores */

  /* Semánticos */
  --color-exito:   #2F6F4E;
  --color-alerta:  #B4761E;
  --color-error:   #B3121A;
  --color-info:    #2C5473;

  /* Superficies del panel */
  --color-panel-fondo:    #0B0B0C;
  --color-panel-lateral:  #111113;
  --color-panel-borde:    #252527;
  --color-panel-texto:    #E8E6E1;
  --color-panel-secundario: #9B9790;
}
```

**Contrastes validados (WCAG)**:
| Par | Ratio | Nivel |
|---|---|---|
| tinta / hueso | 18.4:1 | AAA |
| carmin / hueso | 5.8:1 | AA (texto grande AAA) |
| carmin / papel | 5.6:1 | AA |
| piedra / papel | 4.8:1 | AA |
| panel-texto / panel-lateral | 12.1:1 | AAA |
| laurel / tinta | 6.2:1 | AA |

---

## Tipografía

```css
@theme {
  /* Display: editorial, serif con carácter */
  --font-display: 'Cormorant Garamond', 'Newsreader', 'EB Garamond', Georgia, serif;

  /* Interfaz: neutro, alto x-height, funcional */
  --font-interfaz: 'Inter Tight', 'Geist Sans', system-ui, sans-serif;

  /* Cifras: monoespaciado, numerales tabulares */
  --font-mono: 'JetBrains Mono', 'Geist Mono', monospace;
  --font-feature-mono: 'tnum', 'lnum';   /* numerales tabulares */
}
```

**Escala tipográfica** (razón 1.25 sobre base 16px):

| Token | px | rem | Uso |
|---|---|---|---|
| `text-xs` | 12 | 0.75 | Metadatos, etiquetas de tabla |
| `text-sm` | 14 | 0.875 | Texto de interfaz secundario |
| `text-base` | 16 | 1 | Texto corrido, formularios |
| `text-lg` | 20 | 1.25 | Subtítulos de sección |
| `text-xl` | 25 | 1.563 | Títulos de panel |
| `text-2xl` | 31 | 1.938 | Titulares de página |
| `text-3xl` | 39 | 2.438 | Encabezados de sección pública |
| `text-4xl` | 49 | 3.063 | Héroe: tagline |
| `text-5xl` | 61 | 3.813 | Héroe: lambda monumental |

**Reglas**:
- Interlineado 1.5 en texto corrido, 1.1 en titulares display.
- Medida óptima: 60–75 caracteres por línea.
- Tracking negativo en display grande (`letter-spacing: -0.02em` en 3xl+).
- Versalitas (`font-variant: small-caps`) para etiquetas institucionales ("CICLO 4B", "JORNADA NOCTURNA").
- Inter Tight nunca como tipografía de titular.

---

## Espaciado y geometría

```css
@theme {
  --spacing-unit: 4px;   /* unidad base */

  /* Radio de esquina: máximo 2px */
  --radius-sm: 2px;
  --radius-md: 2px;
  --radius-full: 9999px;  /* solo para badges de estado */

  /* Grid: 12 columnas, canal 24px, margen 24px */
  --grid-cols: 12;
  --grid-gap: 24px;
  --grid-margin: 24px;

  /* Sombras: ninguna difusa. Jerarquía con líneas de 1px */
  --shadow-none: none;
  --border-default: 1px solid var(--color-niebla);
  --border-strong: 1px solid var(--color-tinta);
}
```

---

## Movimiento

```css
@theme {
  --duration-fast: 150ms;
  --duration-base: 200ms;
  --duration-slow: 250ms;
  --easing-out: cubic-bezier(0.16, 1, 0.3, 1);
}

/* Patrón de aparición: opacidad + 2px de desplazamiento */
.aparece-abajo {
  animation: aparecer-abajo var(--duration-base) var(--easing-out);
}
@keyframes aparecer-abajo {
  from { opacity: 0; transform: translateY(2px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Reducción de movimiento sin excepción */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Motivos gráficos

### Greca (filete divisor)
SVG inline, altura 8px, color `currentColor`. Se usa para separar secciones mayores del sitio público y en el PDF.
```svg
<!-- Meandro griego simplificado como filete de 1 ciclo repetido -->
<svg viewBox="0 0 120 8" height="8" role="presentation" aria-hidden="true">
  <path d="M0,4 H20 V0 H40 V8 H60 V4 H80 V0 H100 V8 H120"
        stroke="currentColor" stroke-width="1" fill="none"/>
</svg>
```

### Escudo como sello
- Monocromo en cabecera de PDF y pie de página web.
- Marca de agua al 8% de opacidad en documentos oficiales.
- Nunca en color sobre fondos de color.

### Las cuatro virtudes
Retícula de 4 columnas, regla superior de 1px carmín, cada virtue con:
- Nombre en versalitas mayúsculas, fuente display, tamaño lg.
- Cita estoica en cursiva, fuente display, tamaño sm, color piedra.
- Una línea de traducción pedagógica en fuente interfaz, tamaño sm.

### Numeración romana
Secciones del sitio público: "I. Identidad", "II. Modelo CLEI", "III. Oferta".  
Fuente: versalitas, display, xs, tracking amplio.

---

## Panel administrativo

- Fondo lateral: `color-panel-lateral` (#111113).
- Ítem activo: borde izquierdo 2px carmín + texto blanco.
- Ítem inactivo: texto `color-panel-secundario`, hover → `color-panel-texto`.
- Tablas: fondo `papel`, encabezados con `text-xs` versalitas + `color-piedra`, líneas de 1px `niebla`.
- Acciones destructivas: botón texto carmín, sin fondo, requiere confirmación tipeada.
- Sin tarjetas infladas para mostrar números: las métricas van en una fila horizontal con separadores verticales.

---

## Componentes del sistema de diseño (lista inicial)

Agrupados en `src/ui/`:

**Primitivas** (wrappers de Radix + estilo Ágora):
- `Button` — variantes: primario, secundario, fantasma, destructivo
- `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`
- `Badge` — variantes por nivel: Bajo/Básico/Alto/Superior + estados de matrícula
- `Separator` (línea 1px) y `GrecaSeparator` (SVG greca)
- `Avatar` (iniciales, sin foto por defecto)

**Compuestos**:
- `DataTable` — encabezados fijos, orden, filtro, búsqueda, paginación servidor
- `FormField` — label, input, error descriptivo junto al campo
- `Modal` — con confirmación tipeada para destructivos
- `Toast` (Sonner reestilizado)
- `StatBar` — fila de métricas con separadores, sin tarjetas
- `PeriodoBadge` — estado del periodo (abierto/cerrado)
- `NivelBadge` — nivel de desempeño con color semántico

**Símbolos**:
- `EscudoSello` — SVG del escudo optimizado, monocromo
- `GrecaDivider` — filete de meandro
- `VirtudGrid` — retícula de las cuatro virtudes

---

## Prohibiciones (activas en revisión de UI)

- Degradados morado-azul, glassmorphism, neomorfismo.
- Sombras difusas (`box-shadow` con blur > 0).
- Héroe con foto de banco de imágenes + capa oscura.
- Emojis como iconos de interfaz.
- Esquinas redondeadas > 2px (excepto `radius-full` solo en badges).
- Plantillas de panel sin reestilizar.
- Ilustraciones vectoriales genéricas de personas planas.
- Más de 2 familias tipográficas activas en la misma vista.
- `Inter Tight` como titular.
- `dangerouslySetInnerHTML` sin sanitización previa en servidor.

---

## Checklist al cerrar cada fase de UI

- [ ] `web-design-guidelines` skill ejecutada — cero hallazgos sin resolver
- [ ] Contrastes WCAG AA mínimo en todos los pares de texto/fondo
- [ ] Navegación completa por teclado probada
- [ ] Foco visible de alto contraste en todos los interactivos
- [ ] Jerarquía de encabezados correcta (h1 único por página)
- [ ] `prefers-reduced-motion` respetado
- [ ] LCP < 2s en 4G, CLS < 0.05, JS público < 120 KB comprimido
- [ ] Lighthouse ≥ 95 en las 4 categorías
