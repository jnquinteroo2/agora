CREATE TABLE "anio_lectivo" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"nombre" text NOT NULL,
	"inicio" date NOT NULL,
	"fin" date NOT NULL,
	"activo" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "archivo" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"nombre_orig" text NOT NULL,
	"nombre_stor" text NOT NULL,
	"bucket" text NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer NOT NULL,
	"hash_sha256" text NOT NULL,
	"subido_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "archivo_nombre_stor_unique" UNIQUE("nombre_stor")
);
--> statement-breakpoint
CREATE TABLE "area" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"nombre" text NOT NULL,
	"eliminado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "asignacion_docente" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"anio_lectivo_id" uuid NOT NULL,
	"docente_id" uuid NOT NULL,
	"asignatura_id" uuid NOT NULL,
	"curso_id" uuid NOT NULL,
	CONSTRAINT "asignacion_docente_anio_lectivo_id_docente_id_asignatura_id_curso_id_unique" UNIQUE("anio_lectivo_id","docente_id","asignatura_id","curso_id")
);
--> statement-breakpoint
CREATE TABLE "asignatura" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"area_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"eliminado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "aspirante" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"radicado" text NOT NULL,
	"persona_id" uuid,
	"ciclo_id" uuid,
	"jornada_id" uuid,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"motivo_rechazo" text,
	"datos_formulario" jsonb NOT NULL,
	"autorizacion_datos" boolean DEFAULT false NOT NULL,
	"autorizacion_fecha" timestamp with time zone,
	"autorizacion_version" text,
	"revisado_por" uuid,
	"revisado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aspirante_radicado_unique" UNIQUE("radicado")
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"actor_id" uuid,
	"actor_rol" text,
	"accion" text NOT NULL,
	"entidad" text NOT NULL,
	"entidad_id" uuid,
	"diferencia" jsonb,
	"ip" "inet",
	"user_agent" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "caja_menor_movimiento" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"anio_lectivo_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"descripcion" text NOT NULL,
	"valor" numeric(10, 0) NOT NULL,
	"soporte_id" uuid,
	"registrado_por" uuid NOT NULL,
	"fecha" date NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calificacion" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"matricula_id" uuid NOT NULL,
	"asignatura_id" uuid NOT NULL,
	"periodo_id" uuid NOT NULL,
	"nota" numeric(3, 1),
	"nivel_desempeno" text,
	"descriptor_id" uuid,
	"descriptor_texto" text,
	"fallas" smallint DEFAULT 0 NOT NULL,
	"bloqueado" boolean DEFAULT false NOT NULL,
	"registrado_por" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calificacion_matricula_id_asignatura_id_periodo_id_unique" UNIQUE("matricula_id","asignatura_id","periodo_id")
);
--> statement-breakpoint
CREATE TABLE "calificacion_historial" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"calificacion_id" uuid NOT NULL,
	"nota_anterior" numeric(3, 1),
	"nota_nueva" numeric(3, 1),
	"fallas_anterior" smallint,
	"fallas_nueva" smallint,
	"razon" text,
	"modificado_por" uuid NOT NULL,
	"modificado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categoria_egreso" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"nombre" text NOT NULL,
	"eliminado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ciclo" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"codigo" text NOT NULL,
	"grado_equivalente" text NOT NULL,
	"esquema_periodos" text NOT NULL,
	CONSTRAINT "ciclo_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "cms_album_foto" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"album_id" uuid NOT NULL,
	"archivo_id" uuid NOT NULL,
	"alt" text NOT NULL,
	"orden" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_entrada" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"tipo" text NOT NULL,
	"slug" text NOT NULL,
	"titulo" text NOT NULL,
	"subtitulo" text,
	"cuerpo" text,
	"meta_desc" text,
	"meta_img_id" uuid,
	"estado" text DEFAULT 'borrador' NOT NULL,
	"publicar_en" timestamp with time zone,
	"autor_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"eliminado_en" timestamp with time zone,
	CONSTRAINT "cms_entrada_tipo_slug_unique" UNIQUE("tipo","slug")
);
--> statement-breakpoint
CREATE TABLE "concepto_ingreso" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"eliminado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "configuracion_institucional" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"nombre_legal" text NOT NULL,
	"nombre_corto" text NOT NULL,
	"lema" text,
	"nit" text,
	"dane" text,
	"resolucion" text,
	"direccion" text,
	"municipio" text,
	"departamento" text,
	"telefono" text,
	"correo" text,
	"escudo_url" text,
	"rector_nombre" text NOT NULL,
	"rector_firma_url" text,
	"dir_adm_nombre" text NOT NULL,
	"dir_adm_firma_url" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curso" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"anio_lectivo_id" uuid NOT NULL,
	"ciclo_id" uuid NOT NULL,
	"jornada_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"eliminado_en" timestamp with time zone,
	CONSTRAINT "curso_anio_lectivo_id_ciclo_id_jornada_id_unique" UNIQUE("anio_lectivo_id","ciclo_id","jornada_id")
);
--> statement-breakpoint
CREATE TABLE "descriptor" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"asignatura_id" uuid NOT NULL,
	"nivel" text NOT NULL,
	"texto" text NOT NULL,
	"eliminado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "documento_generado" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"tipo" text NOT NULL,
	"entidad_id" uuid NOT NULL,
	"anio_lectivo_id" uuid,
	"periodo_id" uuid,
	"archivo_id" uuid NOT NULL,
	"hash_contenido" text NOT NULL,
	"generado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "egreso" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"anio_lectivo_id" uuid NOT NULL,
	"consecutivo" integer NOT NULL,
	"categoria_id" uuid NOT NULL,
	"beneficiario" text NOT NULL,
	"descripcion" text,
	"valor" numeric(12, 0) NOT NULL,
	"fecha" date NOT NULL,
	"soporte_id" uuid,
	"pdf_id" uuid,
	"anulado" boolean DEFAULT false NOT NULL,
	"anulacion_motivo" text,
	"anulado_por" uuid,
	"anulado_en" timestamp with time zone,
	"registrado_por" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "egreso_anio_lectivo_id_consecutivo_unique" UNIQUE("anio_lectivo_id","consecutivo")
);
--> statement-breakpoint
CREATE TABLE "escala_valoracion" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"anio_lectivo_id" uuid NOT NULL,
	"nivel" text NOT NULL,
	"desde" numeric(3, 1) NOT NULL,
	"hasta" numeric(3, 1) NOT NULL,
	"orden" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estudiante_familiar" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"estudiante_id" uuid NOT NULL,
	"familiar_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"autorizacion_habeas_data" boolean DEFAULT false NOT NULL,
	"autorizacion_fecha" timestamp with time zone,
	"autorizacion_version" text
);
--> statement-breakpoint
CREATE TABLE "historia_academica" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"persona_id" uuid NOT NULL,
	"institucion" text NOT NULL,
	"grado" text NOT NULL,
	"anio" smallint NOT NULL,
	"aprobado" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jornada" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"codigo" char(1) NOT NULL,
	"nombre" text NOT NULL,
	"detalle" text,
	CONSTRAINT "jornada_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "limite_tasa" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"clave" text NOT NULL,
	"ventana" timestamp with time zone NOT NULL,
	"intentos" integer DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matricula" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"anio_lectivo_id" uuid NOT NULL,
	"estudiante_id" uuid NOT NULL,
	"curso_id" uuid NOT NULL,
	"aspirante_id" uuid,
	"estado" text DEFAULT 'activo' NOT NULL,
	"contrato_folio" text,
	"contrato_pdf_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matricula_anio_lectivo_id_estudiante_id_unique" UNIQUE("anio_lectivo_id","estudiante_id")
);
--> statement-breakpoint
CREATE TABLE "nomina_bloque" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"anio_lectivo_id" uuid NOT NULL,
	"docente_id" uuid NOT NULL,
	"periodo_id" uuid NOT NULL,
	"tipo_jornada" text NOT NULL,
	"bloques" smallint NOT NULL,
	"valor_bloque" numeric(10, 0) NOT NULL,
	"total" numeric(12, 0) NOT NULL,
	"egreso_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observador_registro" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"matricula_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"descripcion" text NOT NULL,
	"firmado_estudiante" boolean DEFAULT false NOT NULL,
	"firmado_acudiente" boolean DEFAULT false NOT NULL,
	"registrado_por" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "periodo" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"anio_lectivo_id" uuid NOT NULL,
	"numero" smallint NOT NULL,
	"esquema" text NOT NULL,
	"inicio" date NOT NULL,
	"fin" date NOT NULL,
	"notas_abiertas" boolean DEFAULT false NOT NULL,
	"cerrado_en" timestamp with time zone,
	CONSTRAINT "periodo_anio_lectivo_id_numero_esquema_unique" UNIQUE("anio_lectivo_id","numero","esquema")
);
--> statement-breakpoint
CREATE TABLE "persona" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"tipo_documento" text NOT NULL,
	"numero_documento" text NOT NULL,
	"primer_nombre" text NOT NULL,
	"segundo_nombre" text,
	"primer_apellido" text NOT NULL,
	"segundo_apellido" text,
	"fecha_nacimiento" date,
	"lugar_nacimiento" text,
	"genero" text,
	"telefono" text,
	"correo" text,
	"direccion" text,
	"eps" text,
	"discapacidad" text,
	"necesidad_edu" text,
	"eliminado_en" timestamp with time zone,
	CONSTRAINT "persona_tipo_documento_numero_documento_unique" UNIQUE("tipo_documento","numero_documento")
);
--> statement-breakpoint
CREATE TABLE "plan_asignatura" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"anio_lectivo_id" uuid NOT NULL,
	"ciclo_id" uuid NOT NULL,
	"asignatura_id" uuid NOT NULL,
	"horas_semana" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "plan_asignatura_anio_lectivo_id_ciclo_id_asignatura_id_unique" UNIQUE("anio_lectivo_id","ciclo_id","asignatura_id")
);
--> statement-breakpoint
CREATE TABLE "plan_cobro" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"matricula_id" uuid NOT NULL,
	"concepto_id" uuid NOT NULL,
	"mes" smallint,
	"valor_programado" numeric(12, 0) NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recibo_caja" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"anio_lectivo_id" uuid NOT NULL,
	"consecutivo" integer NOT NULL,
	"matricula_id" uuid,
	"beneficiario" text NOT NULL,
	"concepto_id" uuid NOT NULL,
	"descripcion" text,
	"valor" numeric(12, 0) NOT NULL,
	"forma_pago" text NOT NULL,
	"fecha" date NOT NULL,
	"pdf_id" uuid,
	"anulado" boolean DEFAULT false NOT NULL,
	"anulacion_motivo" text,
	"anulado_por" uuid,
	"anulado_en" timestamp with time zone,
	"registrado_por" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recibo_caja_anio_lectivo_id_consecutivo_unique" UNIQUE("anio_lectivo_id","consecutivo")
);
--> statement-breakpoint
CREATE TABLE "secuencia" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"anio_lectivo_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"ultimo" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "secuencia_anio_lectivo_id_tipo_unique" UNIQUE("anio_lectivo_id","tipo")
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"persona_id" uuid NOT NULL,
	"correo" text NOT NULL,
	"rol" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"primer_ingreso" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_correo_unique" UNIQUE("correo")
);
--> statement-breakpoint
ALTER TABLE "archivo" ADD CONSTRAINT "archivo_subido_por_usuario_id_fk" FOREIGN KEY ("subido_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignacion_docente" ADD CONSTRAINT "asignacion_docente_anio_lectivo_id_anio_lectivo_id_fk" FOREIGN KEY ("anio_lectivo_id") REFERENCES "public"."anio_lectivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignacion_docente" ADD CONSTRAINT "asignacion_docente_docente_id_usuario_id_fk" FOREIGN KEY ("docente_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignacion_docente" ADD CONSTRAINT "asignacion_docente_asignatura_id_asignatura_id_fk" FOREIGN KEY ("asignatura_id") REFERENCES "public"."asignatura"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignacion_docente" ADD CONSTRAINT "asignacion_docente_curso_id_curso_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."curso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignatura" ADD CONSTRAINT "asignatura_area_id_area_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."area"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aspirante" ADD CONSTRAINT "aspirante_persona_id_persona_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."persona"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aspirante" ADD CONSTRAINT "aspirante_ciclo_id_ciclo_id_fk" FOREIGN KEY ("ciclo_id") REFERENCES "public"."ciclo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aspirante" ADD CONSTRAINT "aspirante_jornada_id_jornada_id_fk" FOREIGN KEY ("jornada_id") REFERENCES "public"."jornada"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aspirante" ADD CONSTRAINT "aspirante_revisado_por_usuario_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_menor_movimiento" ADD CONSTRAINT "caja_menor_movimiento_anio_lectivo_id_anio_lectivo_id_fk" FOREIGN KEY ("anio_lectivo_id") REFERENCES "public"."anio_lectivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caja_menor_movimiento" ADD CONSTRAINT "caja_menor_movimiento_registrado_por_usuario_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calificacion" ADD CONSTRAINT "calificacion_matricula_id_matricula_id_fk" FOREIGN KEY ("matricula_id") REFERENCES "public"."matricula"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calificacion" ADD CONSTRAINT "calificacion_asignatura_id_asignatura_id_fk" FOREIGN KEY ("asignatura_id") REFERENCES "public"."asignatura"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calificacion" ADD CONSTRAINT "calificacion_periodo_id_periodo_id_fk" FOREIGN KEY ("periodo_id") REFERENCES "public"."periodo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calificacion" ADD CONSTRAINT "calificacion_descriptor_id_descriptor_id_fk" FOREIGN KEY ("descriptor_id") REFERENCES "public"."descriptor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calificacion" ADD CONSTRAINT "calificacion_registrado_por_usuario_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calificacion_historial" ADD CONSTRAINT "calificacion_historial_calificacion_id_calificacion_id_fk" FOREIGN KEY ("calificacion_id") REFERENCES "public"."calificacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calificacion_historial" ADD CONSTRAINT "calificacion_historial_modificado_por_usuario_id_fk" FOREIGN KEY ("modificado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_album_foto" ADD CONSTRAINT "cms_album_foto_album_id_cms_entrada_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."cms_entrada"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_album_foto" ADD CONSTRAINT "cms_album_foto_archivo_id_archivo_id_fk" FOREIGN KEY ("archivo_id") REFERENCES "public"."archivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_entrada" ADD CONSTRAINT "cms_entrada_meta_img_id_archivo_id_fk" FOREIGN KEY ("meta_img_id") REFERENCES "public"."archivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_entrada" ADD CONSTRAINT "cms_entrada_autor_id_usuario_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curso" ADD CONSTRAINT "curso_anio_lectivo_id_anio_lectivo_id_fk" FOREIGN KEY ("anio_lectivo_id") REFERENCES "public"."anio_lectivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curso" ADD CONSTRAINT "curso_ciclo_id_ciclo_id_fk" FOREIGN KEY ("ciclo_id") REFERENCES "public"."ciclo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curso" ADD CONSTRAINT "curso_jornada_id_jornada_id_fk" FOREIGN KEY ("jornada_id") REFERENCES "public"."jornada"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "descriptor" ADD CONSTRAINT "descriptor_asignatura_id_asignatura_id_fk" FOREIGN KEY ("asignatura_id") REFERENCES "public"."asignatura"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_generado" ADD CONSTRAINT "documento_generado_anio_lectivo_id_anio_lectivo_id_fk" FOREIGN KEY ("anio_lectivo_id") REFERENCES "public"."anio_lectivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_generado" ADD CONSTRAINT "documento_generado_periodo_id_periodo_id_fk" FOREIGN KEY ("periodo_id") REFERENCES "public"."periodo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_generado" ADD CONSTRAINT "documento_generado_archivo_id_archivo_id_fk" FOREIGN KEY ("archivo_id") REFERENCES "public"."archivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_generado" ADD CONSTRAINT "documento_generado_generado_por_usuario_id_fk" FOREIGN KEY ("generado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "egreso" ADD CONSTRAINT "egreso_anio_lectivo_id_anio_lectivo_id_fk" FOREIGN KEY ("anio_lectivo_id") REFERENCES "public"."anio_lectivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "egreso" ADD CONSTRAINT "egreso_categoria_id_categoria_egreso_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria_egreso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "egreso" ADD CONSTRAINT "egreso_anulado_por_usuario_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "egreso" ADD CONSTRAINT "egreso_registrado_por_usuario_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escala_valoracion" ADD CONSTRAINT "escala_valoracion_anio_lectivo_id_anio_lectivo_id_fk" FOREIGN KEY ("anio_lectivo_id") REFERENCES "public"."anio_lectivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estudiante_familiar" ADD CONSTRAINT "estudiante_familiar_estudiante_id_persona_id_fk" FOREIGN KEY ("estudiante_id") REFERENCES "public"."persona"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estudiante_familiar" ADD CONSTRAINT "estudiante_familiar_familiar_id_persona_id_fk" FOREIGN KEY ("familiar_id") REFERENCES "public"."persona"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historia_academica" ADD CONSTRAINT "historia_academica_persona_id_persona_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."persona"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matricula" ADD CONSTRAINT "matricula_anio_lectivo_id_anio_lectivo_id_fk" FOREIGN KEY ("anio_lectivo_id") REFERENCES "public"."anio_lectivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matricula" ADD CONSTRAINT "matricula_estudiante_id_persona_id_fk" FOREIGN KEY ("estudiante_id") REFERENCES "public"."persona"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matricula" ADD CONSTRAINT "matricula_curso_id_curso_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."curso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matricula" ADD CONSTRAINT "matricula_aspirante_id_aspirante_id_fk" FOREIGN KEY ("aspirante_id") REFERENCES "public"."aspirante"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nomina_bloque" ADD CONSTRAINT "nomina_bloque_anio_lectivo_id_anio_lectivo_id_fk" FOREIGN KEY ("anio_lectivo_id") REFERENCES "public"."anio_lectivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nomina_bloque" ADD CONSTRAINT "nomina_bloque_docente_id_usuario_id_fk" FOREIGN KEY ("docente_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nomina_bloque" ADD CONSTRAINT "nomina_bloque_periodo_id_periodo_id_fk" FOREIGN KEY ("periodo_id") REFERENCES "public"."periodo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nomina_bloque" ADD CONSTRAINT "nomina_bloque_egreso_id_egreso_id_fk" FOREIGN KEY ("egreso_id") REFERENCES "public"."egreso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observador_registro" ADD CONSTRAINT "observador_registro_matricula_id_matricula_id_fk" FOREIGN KEY ("matricula_id") REFERENCES "public"."matricula"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observador_registro" ADD CONSTRAINT "observador_registro_registrado_por_usuario_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "periodo" ADD CONSTRAINT "periodo_anio_lectivo_id_anio_lectivo_id_fk" FOREIGN KEY ("anio_lectivo_id") REFERENCES "public"."anio_lectivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_asignatura" ADD CONSTRAINT "plan_asignatura_anio_lectivo_id_anio_lectivo_id_fk" FOREIGN KEY ("anio_lectivo_id") REFERENCES "public"."anio_lectivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_asignatura" ADD CONSTRAINT "plan_asignatura_ciclo_id_ciclo_id_fk" FOREIGN KEY ("ciclo_id") REFERENCES "public"."ciclo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_asignatura" ADD CONSTRAINT "plan_asignatura_asignatura_id_asignatura_id_fk" FOREIGN KEY ("asignatura_id") REFERENCES "public"."asignatura"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_cobro" ADD CONSTRAINT "plan_cobro_matricula_id_matricula_id_fk" FOREIGN KEY ("matricula_id") REFERENCES "public"."matricula"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_cobro" ADD CONSTRAINT "plan_cobro_concepto_id_concepto_ingreso_id_fk" FOREIGN KEY ("concepto_id") REFERENCES "public"."concepto_ingreso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recibo_caja" ADD CONSTRAINT "recibo_caja_anio_lectivo_id_anio_lectivo_id_fk" FOREIGN KEY ("anio_lectivo_id") REFERENCES "public"."anio_lectivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recibo_caja" ADD CONSTRAINT "recibo_caja_matricula_id_matricula_id_fk" FOREIGN KEY ("matricula_id") REFERENCES "public"."matricula"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recibo_caja" ADD CONSTRAINT "recibo_caja_concepto_id_concepto_ingreso_id_fk" FOREIGN KEY ("concepto_id") REFERENCES "public"."concepto_ingreso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recibo_caja" ADD CONSTRAINT "recibo_caja_anulado_por_usuario_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recibo_caja" ADD CONSTRAINT "recibo_caja_registrado_por_usuario_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secuencia" ADD CONSTRAINT "secuencia_anio_lectivo_id_anio_lectivo_id_fk" FOREIGN KEY ("anio_lectivo_id") REFERENCES "public"."anio_lectivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_persona_id_persona_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."persona"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_auditoria_entidad_fecha" ON "auditoria" USING btree ("entidad","creado_en");--> statement-breakpoint
CREATE INDEX "idx_calificacion_matricula" ON "calificacion" USING btree ("matricula_id");--> statement-breakpoint
CREATE INDEX "idx_calificacion_asignatura_periodo" ON "calificacion" USING btree ("asignatura_id","periodo_id");--> statement-breakpoint
CREATE INDEX "idx_cms_tipo_estado" ON "cms_entrada" USING btree ("tipo","estado","publicar_en");--> statement-breakpoint
CREATE INDEX "idx_egreso_anio_fecha" ON "egreso" USING btree ("anio_lectivo_id","fecha");--> statement-breakpoint
CREATE INDEX "idx_limite_tasa_clave_ventana" ON "limite_tasa" USING btree ("clave","ventana");--> statement-breakpoint
CREATE INDEX "idx_recibo_anio_fecha" ON "recibo_caja" USING btree ("anio_lectivo_id","fecha");