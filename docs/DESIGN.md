# DESIGN: sistema visual "Ágora cívica"

Describe el sistema que está en `src/ui/`. Si algo de aquí no coincide con el código, manda el código y este archivo está desactualizado.

Alcance: sitio público, `/login`, páginas de error, panel y tema de inicio de sesión de Keycloak. Todo comparte los mismos tokens, en modo claro y oscuro.

---

## 1. Dirección

Una plaza pública bien señalizada: la claridad de un edificio institucional y la precisión de la señalización civil. Mármol y tinta, un solo carmín que señala la acción y la escalera CLEI como forma que ordena.

- Sin fotografía de archivo ni imágenes inventadas. La profundidad sale de la tipografía, la marca, la escalera y los tonos de superficie.
- Un solo acento (carmín). El laurel dorado solo acompaña a la marca.
- Densidad media, composición asimétrica en portadas, movimiento corto y con propósito.

**Elemento firma: la escalera CLEI.** Cada ciclo es un peldaño que equivale a un grado. Se reinterpreta en cada superficie sin repetirse: tarjetas que suben en `/inicio`, filas escalonadas en `/modelo-clei`, marcas de peldaño en los estados vacíos.

---

## 2. Tokens (`src/ui/tokens.css`)

Los valores viven en variables CSS de `:root` (claro) y `.dark` (oscuro). `@theme inline` los expone como utilidades de Tailwind (`bg-superficie`, `text-texto-secundario`…), así que los componentes no necesitan `dark:` para el color. El modo oscuro se activa por clase: `@custom-variant dark (&:where(.dark, .dark *));`.

### Color semántico

Contraste medido con la fórmula de WCAG 2.x (texto normal ≥ 4,5:1; controles y texto grande ≥ 3:1).

| Token | Claro | Oscuro | Uso | Contraste (claro / oscuro) |
|---|---|---|---|---|
| `superficie` | `#FFFFFF` | `#000000` | Fondo de página, del pie y de todo el sitio | |
| `superficie-elevada` | `#FFFFFF` | `#000000` | Tarjetas, campos, diálogos, cajón, encabezado fijo: el mismo tono que la página; se separan con borde y sombra | |
| `texto` | `#000000` | `#FFFFFF` | Texto principal | 21 / 21 |
| `texto-secundario` | `#595959` | `#A6A6A6` | Entradas, rótulos, ayudas | 7,0 / 8,6 |
| `borde` | `#D4D4D4` | `#333333` | Filetes y bordes de tarjetas (decorativos) | 1,5 / 1,7 |
| `borde-control` | `#767676` | `#8A8A8A` | Borde de campos, insignias, estados vacíos (1.4.11) | 4,5 / 6,1 |
| `borde-fuerte` | `#000000` | `#FFFFFF` | Botón secundario | 21 / 21 |
| `acento` | `#B3121C` | `#B3121C` | Relleno del botón principal | texto blanco 6,95; contorno contra el fondo 6,95 / 3,02 |
| `acento-hover` | `#8E0E16` | `#C41E29` | Botón principal en *hover* | texto blanco 9,4 / 5,9 |
| `acento-texto` | `#B3121C` | `#EB4A55` | Carmín como texto, ícono o enlace activo | 6,95 / 5,64 |
| `sobre-acento` | `#FFFFFF` | `#FFFFFF` | Texto sobre `acento` | |
| `foco` | `#B3121C` | `#EB4A55` | Anillo de foco | 6,95 / 5,64 |
| `exito` | `#1D6B43` | `#4CC38A` | Confirmaciones | 6,5 / 9,5 |
| `alerta` | `#855700` | `#E2A336` | Advertencias | 6,3 / 9,5 |
| `error` | `#B42318` | `#F2626C` | Errores de campo | 6,6 / 6,7 |
| `info` | `#1F5A85` | `#6CB4EE` | Información | 7,3 / 9,4 |
| `laurel` | `#7A5F0E` | `#C9A227` | Dorado como texto | 6,1 / 8,7 |
| `laurel-marca` | `#C9A227` | `#C9A227` | Filetes y greca decorativos | decorativo |
| `velo` | negro al 45 % | negro al 72 % | Fondo de diálogos y cajones | |

El sitio es blanco con negro en modo claro y negro con blanco en modo oscuro: no hay tonos grises de fondo. Los estados de *hover* y de página actual no cambian el fondo: usan borde o subrayado, y el enlace activo lleva el subrayado en `acento-texto`.

Por qué el carmín oscuro es `#EB4A55` y no `#FF6B72`: conserva el tono institucional (más rojo y menos rosado) y pasa 4,5:1 sobre el negro. El relleno del botón es el mismo `#B3121C` en ambos modos.

### Regla del carmín

El carmín señala la acción principal. Como máximo un elemento carmín por pantalla dentro del contenido, medido en reposo. El anillo de foco no cuenta. Las páginas legales no llevan ninguno.

### Tipografía

Servida desde el propio sitio con `next/font` (en ejecución no hay peticiones a terceros).

| Rol | Familia | Utilidad |
|---|---|---|
| Títulos y lema | Newsreader (variable, con eje óptico, normal e itálica) | `font-titulo` |
| Interfaz y cuerpo | Schibsted Grotesk (variable 400 a 900) | por defecto (`font-interfaz`) |
| Cifras: radicado, códigos de ciclo, teléfonos, NIT | Geist Mono 400 y 500 | `font-mono font-tnum` |

Escala (`text-*`):

| Clase | Tamaño | Uso |
|---|---|---|
| `text-menudo` | 0,75 rem | Metadatos, pie legal |
| `text-nota` | 0,875 rem | Interfaz, etiquetas, botones |
| `text-cuerpo` | 1 rem | Cuerpo |
| `text-guia` | 1,1875 rem | Entrada de página |
| `text-rubro` | 1,25 a 1,5 rem | Títulos de tarjeta, subtítulos |
| `text-titulo` | 1,75 a 2,5 rem | `h2` de sección |
| `text-portada` | 2,25 a 3,5 rem | `h1` de página |
| `text-lema` | 2,75 a 5 rem | Lema de la portada |

Los títulos grandes llevan tracking negativo (ya incluido en la escala); el cuerpo, 0. Ancho de lectura: `max-w-medida` (65ch).

### Espacio, retícula y forma

- Aire de sección: `aire-sm`, `aire`, `aire-lg`. Margen lateral: `margen` (1 a 2,5 rem). Barra lateral del panel: `barra` (16,5 rem).
- Anchos: `amplio` 80 rem (maqueta), `contenido` 72 rem, `texto` 44 rem, `medida` 65ch. Retícula de 12 columnas; todo colapsa a una columna por debajo de 768 px.
- Radios: `rounded-control` 6 px (botones, campos, insignias), `rounded-tarjeta` 12 px (tarjetas, diálogos). No hay otros.
- Sombras negras de baja opacidad: `shadow-sutil`, `shadow-elevado`, `shadow-flotante`. En oscuro casi no se ven, así que la separación la da el borde.
- Capas: `--capa-pegajosa` 10, `--capa-menu` 20, `--capa-velo` 30, `--capa-dialogo` 40, `--capa-aviso` 50.

### Foco

Contorno sólido de 2 px en `foco`, separado 2 px, en `:focus-visible`. `scroll-padding-top` evita que el encabezado fijo tape el elemento enfocado (WCAG 2.4.11).

---

## 3. Tema claro y oscuro

Solo hay dos modos: claro y oscuro. No existe una tercera opción "sistema" en el selector, en los menús, en el valor guardado ni en los avisos.

- **Primera visita:** el tema sale de `prefers-color-scheme`. Un script en línea en `<head>` (`app/layout.tsx`, con el nonce de `headers().get('x-nonce')`) aplica `.dark` antes de pintar.
- **Mientras la persona no elija:** `SeguidorDeTema` (`src/ui/seguidor-de-tema.tsx`) escucha `matchMedia('(prefers-color-scheme: dark)')` y sigue los cambios del sistema en vivo.
- **Cuando elige con el selector:** se guarda en `localStorage` con la clave `agora-tema` y valor `claro` u `oscuro`, y desde ahí se respeta aunque cambie el sistema. El cambio se propaga a las demás pestañas abiertas (evento `storage`).
- `color-scheme` acompaña a la clase para que los controles nativos cambien de tono. `themeColor` es `#FFFFFF` en claro y `#000000` en oscuro.
- Los avisos (Sonner) reciben `theme="light"` o `theme="dark"` según la clase del documento, nunca `"system"`.

Utilidades en `src/ui/tema.ts`: `aplicarTema`, `temaActual`, `guardarTema`, `temaGuardado`, `temaDelSistema`, `seguirAlSistema`.

Comprobado con `capturas/rediseno/tema.mjs`: sistema claro, sistema oscuro, preferencia guardada contraria a cada uno (el tema correcto ya está al cargar), y cambio del sistema en vivo con y sin preferencia guardada.

## 4. Componentes (`src/ui/`)

Son de servidor salvo los marcados como cliente.

| Componente | Archivo | API y notas |
|---|---|---|
| `Boton`, `EnlaceBoton`, `EnlaceSubrayado`, `estiloBoton` | `boton.tsx` | `tono`: `primario` (carmín), `secundario`, `fantasma`, `claro`, `peligro`. `talla`: `sm` 36 px, `md` 44 px, `lg` 48 px, `icono` 44 px |
| `Campo`, `Etiqueta`, `Entrada`, `Selector`, `AreaTexto`, `MensajeDeError`, `estiloControl` | `campo.tsx` | `Campo` recibe `id`, `etiqueta`, `ayuda?`, `error?`, `opcional?` y entrega al control `aria-invalid`, `aria-describedby` y `aria-required`. El error va debajo del campo, con ícono y asociado por id |
| `Tarjeta`, `TituloDeTarjeta`, `DescripcionDeTarjeta` | `tarjeta.tsx` | `tono`: `elevada` (borde y sombra), `plana` (solo borde); `relleno`: `ninguno`, `sm`, `md`, `lg` |
| `Insignia`, `Cifra` | `insignia.tsx` | `tono`: `neutra`, `acento`, `exito`, `alerta`, `error`, `info` |
| `Dialogo`, `AbrirDialogo`, `CerrarDialogo`, `ContenidoDeDialogo` (cliente) | `dialogo.tsx` | Radix Dialog. `ContenidoDeDialogo` exige `titulo`; botón de cierre "Cerrar" de 44 px |
| `Avisos`, `aviso` (cliente) | `avisos.tsx` | Un solo `<Toaster>` en el layout raíz, con textos en español y tokens del sistema. `aviso()` es `toast()` de Sonner |
| `EncabezadoSitio` | `encabezado-sitio.tsx` | Fijo, translúcido con alternativa sólida. Navegación en una línea desde 1280 px; debajo, `MenuMovil`. Recibe `acciones` (ahí va el selector de tema) |
| `NavegacionPrincipal` (cliente) | `navegacion-principal.tsx` | Marca la página actual con `aria-current` |
| `MenuMovil` (cliente) | `menu-movil.tsx` | Cajón de Radix desde la derecha; se cierra al navegar |
| `PieSitio` | `pie-sitio.tsx` | Mismo fondo que la página, separado por un filete. Si no hay datos de contacto, enlaza a `/contacto` en vez de inventarlos |
| `SeguidorDeTema` (cliente) | `seguidor-de-tema.tsx` | Sigue el tema del sistema mientras no haya preferencia guardada |
| `SelectorDeTema` (cliente) | `selector-de-tema.tsx` | Envuelve el Animated Theme Toggler de Magic UI en modo controlado: alterna solo claro y oscuro, guarda `agora-tema`, `aria-label` "Cambiar a modo oscuro" o "Cambiar a modo claro", 44 px |
| `TarjetaMagica`, `EnlaceTarjetaMagica` | `tarjeta-magica.tsx` | Envuelven Magic Card. `EnlaceTarjetaMagica` es un enlace con borde visible, sombra, presión y flecha: en pantallas táctiles esas son las señales de interacción, no el brillo |
| `CajonPanel` (cliente) | `cajon-panel.tsx` | Cajón izquierdo del panel en móvil (Radix): navegación del perfil, identidad y cierre de sesión |
| `EncabezadoDeInicio`, `AccesosRapidos` | `inicio-panel.tsx` | Inicio de cada panel: saludo según la hora de Bogotá y el nombre de la cuenta, perfil, descripción; accesos como `EnlaceTarjetaMagica` o, si la sección aún no existe, tarjeta con borde discontinuo e insignia "Disponible pronto" (sin brillo, porque no es interactiva) |
| `campo`, `etiqueta`, `boton`, `botonSecundario`, `tarjeta`, `tituloTarjeta`, `encabezadoTabla`, `filaTabla` | `estilos.ts` | Clases compartidas por los formularios y tablas del panel, construidas sobre `estiloControl` y `estiloBoton`. Todo control lleva etiqueta visible (`etiqueta` envuelve el control); en filas de tabla, `aria-label` con el nombre de la persona. Toda tabla va dentro de una región enfocable con desplazamiento horizontal |
| `MarcoPublico` | `marco-publico.tsx` | Enlace para saltar al contenido, encabezado, `main` y pie |
| `NavPerfil` (cliente) | `nav-perfil.tsx` | Navegación del panel con íconos y `aria-current` |
| `PERFILES`, `perfilPorClave` | `perfiles.ts` | Los siete perfiles: clave, nombre visible, ruta, ícono de lucide y una línea de descripción |
| `Seccion`, `TituloDeSeccion`, `EntradaDeSeccion`, `EncabezadoDePagina` | `seccion.tsx` | `Seccion`: `aire`, `filete`, `fondo` (`base`, `elevado`) |
| `EscaleraPortada`, `EscaleraCleiCompleta`, `ordenarCiclos` | `escalera-clei.tsx` | `EscaleraPortada` (portada de `/inicio`): peldaños que suben hacia la derecha, del 3A abajo al 6 arriba, con entrada escalonada. `EscaleraCleiCompleta` (`/modelo-clei`): filas escalonadas, cada una en una Magic Card. Siempre lista ordenada; "equivale a" solo para lectores de pantalla |
| `EstadoVacio` | `estado-vacio.tsx` | Caja con borde discontinuo en `borde-control`, marcas de peldaño, `titulo`, `descripcion?`, `accion?`, `icono?` |
| `Marca`, `MarcaAdaptable`, `EscudoDeVirtudes` | `marca.tsx` | `MarcaAdaptable` muestra el logo a color en claro y el blanco en oscuro |
| `Contenedor`, `Migas`, `Greca`, `FileteLaurel` | varios | Sin cambios de API |

Íconos: `lucide-react`, trazo de 1,75, siempre con `aria-hidden` cuando acompañan a un texto.

Utilidades: `cn()` une clases con tailwind-merge, que conoce los tokens del sistema.

---

### Componentes de Magic UI (`src/ui/magicui/`)

Instalados con `npx shadcn@latest add` desde el registro de Magic UI, con `components.json` escrito a mano (alias `ui` → `@/src/ui/magicui`, `utils` → `@/src/ui/utils`) para que el CLI no reescribiera los estilos. Se adaptaron después de instalarlos:

| Componente | Cambios respecto del registro |
|---|---|
| `MagicCard` (`magic-card.tsx`) | Sin `next-themes` (su modo "system" no existe aquí): el modo oscuro se lee de la clase `.dark`. Tokens propios en vez de los de shadcn (`--superficie-elevada`, `--borde`). Colores por defecto desde `--resplandor-desde`, `--resplandor-hasta` y `--resplandor-halo`, distintos en claro y oscuro. El efecto sigue solo al puntero de ratón (`pointerType === 'mouse'`) y se oculta con `prefers-reduced-motion` |
| `AnimatedThemeToggler` (`animated-theme-toggler.tsx`) | Duración de 250 ms (antes 400) con `cubic-bezier(0.77, 0, 0.175, 1)`. Con `prefers-reduced-motion` o sin View Transitions cambia el tema al instante. Los íconos sol y luna se muestran por CSS según `.dark` (sin parpadeo de ícono al hidratar). Se quitó el texto en inglés y los 17 comentarios del registro. Se usa siempre en modo controlado desde `SelectorDeTema`, así nunca escribe `localStorage.theme` |

Dependencia agregada: `motion` 13.4.3 (versión exacta). Magic Card se usa solo donde el encargo lo prevé: las siete tarjetas de perfil de `/login`, las tarjetas de ciclos y jornadas de `/oferta` y `/modelo-clei`, y los accesos rápidos del inicio de cada panel.

### Páginas

- **`/login` (Portal de acceso):** formulario fijo a la derecha en escritorio (`sticky`) y primero en móvil; perfiles en dos grupos, Comunidad (Estudiante, Acudiente, Profesor) y Administración (Secretaría, Contador, Administrador, Superadministrador), como radios nativos dentro de Magic Cards de igual tamaño. En móvil las tarjetas muestran ícono y nombre, y la descripción solo en la elegida. Elegir un perfil solo cambia el título del formulario: el panel de destino sale de `usuario.rol`. Mensajes distintos para 401 y 400, 403, 429, 5xx y falla de red; el foco va al mensaje. Botón para mostrar u ocultar la contraseña con `aria-pressed`.
- **Panel:** barra lateral fija de `barra` (16,5 rem) en escritorio con la navegación del perfil, la identidad y el cierre de sesión; en móvil, barra superior con el `CajonPanel`. El selector de tema está en la barra superior. `/panel` redirige al inicio del perfil (`PERFILES[].ruta`).
- **Tipos de documento:** `src/dominio/documentos.ts` es la única lista (CC, TI, CE, PPT, RC, PA, NIP), y los selectores muestran "sigla · nombre".
- **Imágenes Open Graph:** negro con blanco, Newsreader 500 (`assets/fuentes/Newsreader-500.woff`, OFL) y un filete carmín.
- **Visor de la galería:** negro con blanco en los dos modos (valores fijos, no tokens), porque es un visor de fotografías.

## 5. Movimiento

Tokens: `--ease-out` `cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out` `cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-cajon` `cubic-bezier(0.32, 0.72, 0, 1)`. Duraciones: `presion` 120 ms, `fast` 160 ms, `base` 200 ms, `slow` 250 ms.

| Qué | Cómo |
|---|---|
| Presión de botones (`presionable`) | `scale(0.97)` en 120 ms, solo sin `prefers-reduced-motion` |
| Cambios de color en *hover* (`transicion-ui`) | 160 ms, propiedades explícitas, nunca `all` |
| Diálogo | Entra en 200 ms (`scale(0.97)` y opacidad, centrado), sale en 160 ms |
| Cajones | Entran en 250 ms con `--ease-cajon`, salen en 160 ms |
| Cambio de tema | View Transition circular desde el botón, 250 ms; instantáneo con movimiento reducido |
| Brillo de Magic Card | Sigue al ratón con un resorte; el halo aparece en 200 ms; oculto con movimiento reducido y sin ratón |
| Entrada escalonada (`aparece-escalonado`) | 250 ms por elemento, 40 ms de separación, solo `transform` y `opacity` |

Reglas: solo se animan `transform` y `opacity`; nada se anima al desplazarse; nada retrasa la lectura ni la interacción; las acciones de teclado no se animan. Con `prefers-reduced-motion: reduce`, las animaciones duran 0,01 ms y la presión no escala.

---

## 6. Marca

| Variante | Dónde |
|---|---|
| `logo-agora.png` (color) | Encabezado y pie en modo claro |
| `logo-agora-blanco.png` | Encabezado y pie en modo oscuro, imagen OG |
| `escudo-agora-completo.png` | `/institucion` |
| `icono-32/180/512.png` | Favicon, ícono de Apple, manifiesto |

Tamaños mínimos medidos: la lambda se reconoce desde 32 px, la palabra "ÁGORA" se lee desde 64 px y las cuatro virtudes del escudo desde unos 96 px.

---

## 7. Verificación

Scripts en `capturas/` (fuera de git), contra el contenedor `web` en `http://localhost:3001`:

| Qué | Cómo |
|---|---|
| Capturas, textos y contraste de todas las rutas, incluido el panel | `node capturas/rediseno/auditoria.mjs <carpeta>` (`ESQUEMA=dark` para modo oscuro) |
| Tema sin parpadeo: sistema claro u oscuro y preferencia guardada | `node capturas/rediseno/tema.mjs <carpeta> [ruta…]` |
| axe, carmín, formulario, visor, impresión | scripts de `capturas/` descritos en cada uno |
| Pruebas de punta a punta | `npx playwright test` |
| Cero comentarios en el código | `npm run verificar:comentarios` (también corre al inicio de `npm run lint`) |
