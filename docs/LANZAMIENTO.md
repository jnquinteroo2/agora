# LANZAMIENTO — Lo que bloquea publicar el sitio

Este archivo no es `PENDIENTES.md`. `PENDIENTES.md` es deuda técnica: cosas que el equipo puede dejar para después sin mentirle a nadie. Esta lista es distinta: son datos institucionales que hoy no existen en la base y **sin los cuales el sitio público no se puede publicar**, aunque el código esté terminado y probado.

La regla de diseño que gobierna todo el sitio es: el dato se lee de la base, y si no está, la sección no se muestra. No hay textos de relleno, no hay "próximamente", no hay guiones donde iría un teléfono. Por eso el sitio no se rompe sin estos datos: simplemente publica menos de lo que debería. Lo que sigue es lo que tiene que estar cargado antes de abrirlo al público.

Estado a 21 de septiembre de 2026.

Este archivo dice **qué falta**. **Cómo** se despliega, en qué orden y cómo se vuelve atrás está en [`DESPLIEGUE.md`](DESPLIEGUE.md).

---

## 1. Bloquea por ley

### Responsable del tratamiento de datos personales

La Ley 1581 de 2012 y el Decreto 1377 de 2013 exigen que la política de tratamiento identifique al responsable, con dirección física, correo electrónico y teléfono, y que declare el canal y el procedimiento para consultas y reclamos con sus plazos. Hoy `configuracion_institucional` tiene vacíos `direccion`, `telefono`, `correo` y `nit`.

**`/privacidad` no se puede publicar sin esto**, por más que la página esté escrita y maquetada. Un colegio trata datos de menores de edad, que es el caso más exigente de la norma.

Dónde se carga: panel administrativo, configuración institucional.

Campos: `direccion`, `municipio`, `departamento`, `telefono`, `correo`, `nit`.

Pendiente adicional: la norma pide un canal de reclamos identificable. Si el colegio quiere un correo distinto al general para habeas data, hoy no hay columna donde guardarlo y hay que agregarla.

### Las cuatro páginas legales, revisadas por un abogado

`/privacidad`, `/cookies`, `/terminos` y `/accesibilidad` se redactaron el 21 de septiembre de 2026 a partir de la norma vigente y del esquema real de la plataforma, sin plantillas. No las ha revisado un abogado. **Ninguna se publica sin esa revisión.** En particular, el abogado debe revisar:

- La lista de datos y finalidades de `/privacidad`, contra lo que la institución hace de verdad con cada dato.
- La correspondencia entre los artículos del Decreto 1377 de 2013 y los del Decreto 1074 de 2015. Se verificó contra el texto compilado del Decreto 1074 publicado por la Superintendencia de Sociedades.
- El texto de la autorización y del aviso de privacidad del formulario de `/admisiones`.

### Área responsable de consultas y reclamos

El art. 13, num. 4, del Decreto 1377 de 2013 (art. 2.2.2.25.3.1 del Decreto 1074 de 2015) exige nombrar la persona o el área que atiende consultas y reclamos. No se inventó: la constante `AREA_DE_ATENCION` de `src/legal/politica.ts` está en `null`, y mientras lo esté la política dice solo "ante la institución". La institución debe designar el área (por ejemplo, Rectoría o Secretaría) y cargarla ahí. El canal sale de `configuracion_institucional` (correo, teléfono y dirección). Sin ninguno de los tres, `/privacidad` no muestra canal y **no se puede publicar**.

### Periodo de vigencia de las bases de datos

El art. 13, num. 6, del Decreto 1377 de 2013 exige indicarlo. Es una decisión de la institución, no un dato técnico. La constante `VIGENCIA_DE_LAS_BASES_DE_DATOS` de `src/legal/politica.ts` está en `null`, y el párrafo no se muestra hasta que se defina. Hoy la política solo cita la regla general del art. 11 (art. 2.2.2.25.2.8 del Decreto 1074): conservar mientras sea razonable y necesario para la finalidad, o mientras lo exija una obligación legal o contractual. Conviene definir plazos por finalidad, por ejemplo cuánto se guarda una solicitud de admisión no aprobada.

### Fecha de entrada en vigencia

`src/legal/versiones.ts` tiene `vigenteDesde: '2026-09-21'` en los cuatro documentos. Esa es la fecha de redacción, no de publicación. **Cámbiela por la fecha real de publicación** el día del lanzamiento. Si después el texto de la política de datos cambia en lo sustancial, suba `POLITICA_DATOS.version`: es la misma constante que `registrarAspirante` guarda en `aspirante.autorizacion_version`.

### Encargados del tratamiento y transmisión internacional

El servidor de producción (VPS) y el proveedor de correo tratan datos por cuenta de la institución, así que son encargados del tratamiento. Si el servidor está fuera de Colombia, hay transmisión internacional de datos, que exige un contrato de transmisión (arts. 24 y 25 del Decreto 1377 de 2013; arts. 2.2.2.25.5.1 y 2.2.2.25.5.2 del Decreto 1074 de 2015). Ninguno de estos datos está confirmado:

- Proveedor del servidor y país donde están los datos: **por confirmar.**
- Proveedor de correo de producción: **por confirmar.** Hoy la plataforma no envía ningún correo: `SMTP_*` está en `src/env.ts`, pero ningún código lo usa. Si se activa el envío, el proveedor pasa a ser encargado.

Cuando estén confirmados, se cargan en `ENCARGADOS_DEL_TRATAMIENTO` (`src/legal/politica.ts`), y la sección "Encargados y transmisiones" aparece sola en `/privacidad`.

### Registro Nacional de Bases de Datos

Confirmar si la institución debe inscribir sus bases de datos ante la SIC. Según el art. 2.2.2.26.1.2 del Decreto 1074 de 2015, modificado por el Decreto 090 de 2018, están obligadas las sociedades y las entidades sin ánimo de lucro con activos totales superiores a 100.000 UVT, y las personas jurídicas de naturaleza pública. Depende de la naturaleza jurídica y de los activos de la institución, que no constan en la base.

### Finalidad de los datos sensibles

`/privacidad` declara como posibles datos sensibles la EPS y las anotaciones del observador. La EPS se recoge hoy en el alta de personas y en la importación desde Excel, como dato opcional. El código no documenta para qué se usa. La institución debe confirmar esa finalidad e informar que la respuesta es facultativa (art. 6 del Decreto 1377 de 2013; art. 2.2.2.25.2.3 del Decreto 1074 de 2015).

### Discapacidad y necesidades educativas: pregunta para el abogado

`persona` tiene las columnas `discapacidad` y `necesidad_edu`, pero ningún formulario las recoge, y por eso `/privacidad` no las declara. **El abogado debe confirmar un punto:** la institución puede tratar datos de discapacidad por fuera de la plataforma, por ejemplo para el reporte al SIMAT. Si es así, la política debe declararlos como dato sensible de niños, niñas y adolescentes aunque la plataforma no los recoja, porque la política es de la institución y no solo del sistema.

### Reforma de la Ley 1581

En agosto de 2025 el Gobierno radicó un proyecto de ley para reformar la Ley 1581 de 2012. La política está redactada según la norma vigente, no según el proyecto. **Si el proyecto se aprueba, las cuatro páginas se revisan.**

---

## 2. Bloquea por veracidad

### Horario real de cada jornada con oferta, confirmado por la institución

`/oferta` publica el campo `detalle` de cada jornada bajo el rótulo "Horario", como si fuera el horario oficial. Hoy ninguno de los dos está confirmado:

| Jornada | `detalle` publicado hoy | Estado |
|---|---|---|
| Diurna | "Lunes a viernes en la mañana" | **Sin verificar.** Sale de `src/datos/semilla.ts`, que es un dato de desarrollo, no de la institución. |
| Semipresencial sabatina | vacío | **Faltante.** La página no lo muestra y no inventa uno. |

El texto de la diurna no se borra porque es plausible y la página lo necesita para comparar, pero **no se puede publicar el sitio mientras siga siendo un dato de semilla**. La institución tiene que confirmar días y franja horaria de cada jornada que tenga oferta en el año activo, y ese texto se carga en `jornada.detalle`.

---

## 3. Bloquea la utilidad del sitio

### Datos de contacto de la institución

Sin `direccion`, `telefono` ni `correo`, la ruta `/contacto` no tiene nada que mostrar y el pie de página dice que los datos todavía no están publicados. Es honesto, pero un colegio que no publica cómo contactarlo no cumple la función básica de su sitio.

Los mismos campos de la sección anterior resuelven las dos cosas.

### Fechas reales del año lectivo activo

El año lectivo 2026 está creado y activo con fechas **provisionales** (`2026-02-01` a `2026-11-30`) porque el esquema no admite fechas nulas. El sitio público no publica esas fechas en ninguna parte, justamente porque no son reales.

No se pueden corregir desde el panel: no existe una acción para editar un año lectivo ya creado. El `UPDATE` exacto está anotado en `PENDIENTES.md`.

Antes de publicar: confirmar las fechas reales del calendario académico y corregirlas.

---

## 4. Bloquea la calidad, no el lanzamiento

### Fotografía de la institución

No hay una sola imagen del colegio. El sitio está resuelto con composición tipográfica, la marca y la greca, y no usa fotografía de archivo ni de banco de imágenes porque sería falsear la institución.

Funciona, pero es el mayor techo de calidad del sitio. La galería y el gestor de contenidos ya soportan subir imágenes reales: con una decena de buenas fotografías, el sitio sube un escalón que ningún recurso tipográfico compensa.

### Días, horario y modalidad de cada jornada

`jornada` solo tiene `nombre` y `detalle` (texto libre). El horario en sí es bloqueo de publicación (sección 2). Lo que queda aquí es la estructura: un texto libre no permite comparar jornadas campo por campo.

Solución de fondo: una migración que agregue columnas de días, horario y modalidad, más su edición en el panel.

### Consecutivo de radicados de admisión

Las pruebas de desarrollo consumieron radicados del año activo: hoy el primer aspirante real recibiría `RAD-2026-0004`. **El día del lanzamiento, antes de abrir admisiones al público, reinicie el consecutivo.** No se reinicia antes porque las pruebas lo vuelven a consumir. El orden respecto de los demás pasos está en `DESPLIEGUE.md`, paso 8.

```sql
DELETE FROM aspirante;
DELETE FROM secuencia WHERE tipo = 'radicado_aspirante';
```

El primer `DELETE` solo es seguro si no hay solicitudes reales; verifíquelo antes con `SELECT count(*) FROM aspirante`. Con la fila de `secuencia` borrada, `siguienteConsecutivo` vuelve a empezar en 1. La prueba de punta a punta (`npm run test:e2e`) se niega a correr contra cualquier host que no sea local, así que no puede consumir radicados de producción.

### Contenido del gestor

Hoy hay una sola noticia y un álbum de galería que es **dato de prueba sintético**, marcado como tal en las propias imágenes. Antes de publicar hay que borrar el álbum de prueba y cargar contenido real, o dejar la galería vacía con su estado vacío, que está diseñado.

Mientras exista, el álbum de prueba (`album-de-prueba`) lleva `noindex` y no entra al sitemap: la lista `CONTENIDO_DE_PRUEBA` de `src/seo/metadatos.ts` lo marca. **Bórrelo antes de publicar**, y quite su slug de esa lista.

---

## Bloquea por seguridad del despliegue

### Los secretos del `.env` quedan dentro de la imagen de Docker

El repositorio no tiene `.dockerignore`. La etapa `builder` del `Dockerfile` hace `COPY . .`, y Next copia los archivos `.env` al build standalone: la imagen final tiene `/app/.env` con **todos** los secretos (contraseña del superusuario de Postgres, `BETTER_AUTH_SECRET`, contraseña inicial del superadministrador, credenciales SMTP). Se verificó el 21 de septiembre de 2026 con `docker exec` sobre la imagen `agora-dev-web`. Cualquiera que obtenga la imagen, por ejemplo desde un registro de contenedores, obtiene los secretos.

Además, ese `.env` horneado hace que una variable que falte en el entorno del contenedor se tome en silencio del archivo copiado en el build, en vez de fallar.

**No se corrigió en este encargo** porque el build depende hoy de ese archivo: `NEXT_PUBLIC_APP_URL` se fija en el bundle del navegador durante el build y sale de ahí. La imagen `pdf` tiene el mismo problema. La corrección (`.dockerignore`, argumento de build, secretos nuevos generados en el VPS y verificación de que la imagen no contiene `.env`) está en `DESPLIEGUE.md`, pasos 2, 3, 5 y 6. **No se publica ninguna imagen fuera de este equipo hasta resolverlo.**

### Otros bloqueos del despliegue

- **Falta el perfil seccomp de Chromium** que el compose de producción exige para el servicio `pdf` (`infra/worker/seccomp-chromium.json`). Sin él, `pdf` no arranca. Ver `DESPLIEGUE.md`, paso 4.
- **Los secretos se leen de `/run/secrets`**, que en Linux se vacía al reiniciar. Ver `DESPLIEGUE.md`, paso 5.
- **Qué datos iniciales se cargan en producción.** `src/datos/semilla.ts` es de desarrollo y no se corre tal cual. Hay que decidir y conseguir los datos reales (configuración institucional, ciclos, jornadas, año lectivo). Ver `DESPLIEGUE.md`, paso 7.

### Indexación en buscadores

`SITIO_INDEXABLE` es falsa por defecto: `robots.txt` responde `Disallow: /` y todas las páginas llevan `noindex, nofollow`. **Active `SITIO_INDEXABLE=true` solo cuando esta lista esté cerrada.** Activarla antes haría que los buscadores guarden páginas con datos pendientes, el álbum de prueba o textos legales sin revisar.

`SITIO_URL` debe tener la URL pública definitiva (con `https://`). Se lee al arrancar, no en el build, y el servicio no arranca sin ella.

---

## Bloqueos de operación de la plataforma

Esta sección es distinta de las anteriores. No bloquea la publicación del sitio público: bloquea **usar la plataforma de gestión escolar con personas reales**. Lo que sigue debe resolverse antes de registrar al primer estudiante real.

### La matrícula trata datos de menores sin prueba de autorización

La matrícula, el alta de personas y la importación desde Excel registran datos de estudiantes, en su mayoría menores de edad, y de sus familias, sin guardar prueba de la autorización. La ley exige la autorización previa (art. 9 de la Ley 1581 de 2012) y que el responsable conserve la prueba de haberla obtenido (art. 8 del Decreto 1377 de 2013; art. 2.2.2.25.2.5 del Decreto 1074 de 2015). La tabla `estudiante_familiar` tiene las columnas `autorizacion_habeas_data`, `autorizacion_fecha` y `autorizacion_version`, pero ninguna pantalla ni acción las llena. `/privacidad` solo afirma que se conserva la prueba de la autorización del formulario de admisión.

**Debe resolverse antes de matricular a un estudiante real.** La institución decide cómo obtiene y guarda la autorización (en papel o en la plataforma) y, si es en la plataforma, se implementa como una fase propia. No se implementó en este encargo.

---

## 5. Verificación antes de abrir al público

- [ ] `configuracion_institucional` con dirección, municipio, departamento, teléfono, correo y NIT reales.
- [ ] Canal y procedimiento de habeas data definidos, con plazos, y `/privacidad` revisada por quien corresponda en la institución.
- [ ] Fechas reales del año lectivo activo corregidas en la base.
- [ ] Oferta del año cargada desde el panel: los ciclos que de verdad se abren en cada jornada.
- [ ] Álbum de prueba de la galería eliminado y su slug quitado de `CONTENIDO_DE_PRUEBA`.
- [ ] Fotografía institucional cargada, o galería deliberadamente vacía.
- [ ] Horario real de cada jornada con oferta, confirmado por la institución: diurna sin verificar (dato de semilla), sabatina faltante.
- [ ] `/privacidad`, `/cookies`, `/terminos` y `/accesibilidad` revisadas por un abogado.
- [ ] Área responsable de consultas y reclamos designada y cargada en `AREA_DE_ATENCION`.
- [ ] Periodo de vigencia de las bases de datos definido y cargado en `VIGENCIA_DE_LAS_BASES_DE_DATOS`.
- [ ] `vigenteDesde` de `src/legal/versiones.ts` cambiado a la fecha real de publicación.
- [ ] Proveedor del servidor, país de los datos y proveedor de correo confirmados y cargados en `ENCARGADOS_DEL_TRATAMIENTO`.
- [ ] Confirmado si la institución debe inscribir sus bases de datos en el Registro Nacional de Bases de Datos.
- [ ] Finalidad de la EPS confirmada por la institución, y respondido por el abogado si la política debe declarar discapacidad por el reporte al SIMAT.
- [ ] Consecutivo de radicados reiniciado el día del lanzamiento.
- [ ] `.dockerignore` agregado, `NEXT_PUBLIC_APP_URL` como argumento de build y secretos nuevos generados en el VPS (`DESPLIEGUE.md`).
- [ ] Perfil seccomp de Chromium creado y probado, y secretos fuera de `/run` (`DESPLIEGUE.md`, pasos 4 y 5).
- [ ] Datos iniciales de producción decididos y cargados, sin la semilla de desarrollo.
- [ ] `SITIO_URL` con la URL pública definitiva.
- [ ] `SITIO_INDEXABLE=true`, activada solo al final, cuando todo lo anterior esté cerrado.
- [ ] Si el proyecto de reforma de la Ley 1581 se aprobó, las páginas legales revisadas.
