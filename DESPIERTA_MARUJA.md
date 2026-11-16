# DESPIERTA MARUJA – Especificación para Claude Code

## 0. Antes de empezar (lo que necesitas preparar)

1. **Cuenta de GitHub** (gratuita) y un repositorio nuevo llamado `despierta-maruja`.
2. **Cuenta de Supabase** (gratuita). Al crear el proyecto, elige región de la UE (**Frankfurt, eu-central-1**).
3. **Claude Code** instalado (requiere plan de pago de Claude; compruébalo en la web de Anthropic).
4. Una carpeta de trabajo con estos tres archivos dentro:
   - `DESPIERTA_MARUJA.md` (esta especificación).
   - `BASE_DATOS_DESPIERTA_MARUJA.xlsx` (catálogo inicial: 28 actividades).
   - `DESPIERTA_MARUJA.html` (prototipo previo, solo como referencia de diseño y funciones).
5. Abre Claude Code en esa carpeta y pega el prompt de la sección 1.

Importante: no pegues en el chat las claves secretas de Supabase (`service_role`). Solo se usa la clave pública `anon`, que está pensada para ir en el código.

---

## 1. Prompt para pegar en Claude Code

> Quiero que construyas **DESPIERTA MARUJA**, una aplicación web familiar muy sencilla para que cuatro hermanas organicen un programa de estimulación cognitiva, actividad física y autonomía de nuestra madre. Lee la especificación completa en `DESPIERTA_MARUJA.md` (secciones 2 a 10) y el prototipo `DESPIERTA_MARUJA.html`, que es una versión previa funcional cuyo diseño y funciones quiero conservar. **Si el prototipo y la especificación no coinciden, manda la especificación** (sección 10 enumera los fallos conocidos del prototipo que no deben copiarse). Importa el catálogo desde `BASE_DATOS_DESPIERTA_MARUJA.xlsx`.
>
> Antes de escribir código, resume el plan y dime los pasos que debo hacer yo a mano (crear proyecto en Supabase, desactivar el registro público, crear el usuario familiar, copiar URL y clave `anon`, activar GitHub Pages). Guíame paso a paso, en español, asumiendo que no soy desarrolladora. Prioriza la sencillez y la fiabilidad sobre añadir funciones. No incluyas IA, estadísticas complejas ni gamificación. Al terminar, ejecuta la lista de comprobaciones de la sección 8 y dime cuáles pasan y cuáles no pude verificar.

---

## 2. Objetivo y usuarias

- Cuatro hermanas usan la misma aplicación desde móvil, tablet u ordenador. **Sin cuentas individuales**: acceso con una contraseña familiar común.
- Su madre **no introduce datos**; solo consulta una vista de solo lectura mediante un enlace independiente.
- Idioma de la interfaz: español. Nombre visible de la app: **Despierta Maruja**.
- Datos mínimos: **no guardar datos médicos ni diagnósticos**. Solo actividades, fechas, visitas y registros.

## 3. Arquitectura

- **Frontend:** web estática, responsive y PWA (manifest, iconos, service worker, instalable como acceso directo). Stack simple (Vite + JavaScript, o similar); sin frameworks pesados.
- **Actualizaciones de la PWA:** cuando haya una versión nueva publicada, la app muestra un aviso «Hay una versión nueva, toca para actualizar» en lugar de quedarse con la versión antigua en caché.
- **Alojamiento del frontend:** GitHub Pages (el repositorio puede ser público porque no contiene datos ni secretos).
- **Rutas:** GitHub Pages no admite rutas de aplicación del tipo `/ver/...`. Usar rutas con almohadilla (`#/calendario`, `#/ver/<token>`) o parámetro (`?ver=<token>`). Nunca rutas que dependan del servidor.
- **Base de datos y sincronización:** Supabase, región UE. Usar Supabase Realtime para que los cambios aparezcan automáticamente en todos los dispositivos.
- **Acceso familiar:**
  - Una única cuenta compartida en Supabase Auth (email fijo interno, p. ej. `familia@despierta-maruja.local`, + contraseña familiar). La app solo pide la contraseña. La sesión se mantiene en el dispositivo.
  - **Desactivar el registro público** en Supabase (Authentication → Sign In / Providers → *Allow new users to sign up* desactivado) y desactivar la confirmación por email para ese usuario. Así nadie puede crearse una cuenta con la clave `anon`.
  - El usuario familiar se crea a mano desde el panel de Supabase (Authentication → Users → Add user).
- **Seguridad (Row Level Security):**
  - Activar RLS en **todas** las tablas.
  - Las políticas **no** deben conceder acceso a «cualquier usuario autenticado», sino **solo al usuario familiar concreto**. Guardar su identificador en una tabla `allowed_users (user_id uuid)` y usar en cada política `auth.uid() in (select user_id from allowed_users)`. La tabla `allowed_users` no es legible ni editable desde la app.
  - El visitante anónimo no puede leer ni escribir ninguna tabla directamente.
- **Vista de la madre:** enlace con un token aleatorio largo (mínimo 32 caracteres): `https://<usuario>.github.io/despierta-maruja/#/ver/<token>`. Se sirve mediante una función de Postgres (`security definer`, con `search_path` fijado) que recibe el token y devuelve **solo campos públicos** (ver sección 5). Debe poder revocarse y regenerarse el token desde la app (el enlace antiguo deja de funcionar al instante).
- **Fechas y horas:** todas las fechas se calculan en **hora local de Europe/Madrid**, nunca en UTC (no usar `toISOString()` para obtener «hoy»).
- **Sin almacenamiento solo local:** `localStorage` solo para la sesión y preferencias de pantalla.

## 4. Modelo de datos

Estos nombres de tablas y campos son los definitivos (el prototipo usa otros nombres; ver sección 10).

**activities** (catálogo)
- `id` (texto, clave; conserva `ACT001`, `ACT002`…), `nombre`, `area`, `modalidad`, `instrucciones`, `materiales`, `duracion` (texto, p. ej. «15–30»), `dificultad`, `capacidades`, `contexto` (En casa / Exterior), `activa` (bool), `objetivo` (opcional), `created_at`, `updated_at`.
- **Numeración de IDs:** los IDs del Excel no son correlativos (llegan a ACT041 con 28 actividades). Las actividades nuevas y las duplicadas reciben el **número siguiente al ID más alto existente** (ACT042, ACT043…), con tres cifras. Nunca IDs aleatorios.

**events** (calendario)
- `id`, `fecha`, `hora`, `activity_id` (nulo = solo visita), `nombre` (copia del nombre al programar), `area` (copia), `modalidad`, `hermana`, `duracion_min` (número), `estado` (Pendiente / Realizada / Cancelada).

**logs** (registros)
- `id`, `event_id` (opcional), `activity_id`, `nombre`, `area`, `modalidad`, `fecha`, `hermana`, `duracion_real_min`, `realizacion`, `participacion`, `ayuda`, `dificultad_percibida`, `gusto`, `observaciones` (**privado**), `proxima_vez`.

**settings** (una sola fila)
- `share_token` (para la vista de la madre), `hermanas` (lista de las cuatro, editable desde la app, usada en todos los desplegables desde el primer uso).

**Listas de valores (únicas y definitivas; usarlas igual en app, Excel y gráficos):**

| Campo | Valores |
|---|---|
| Área | Las 11 áreas de la hoja `Listas` del Excel |
| Modalidad | Autónoma · Autónoma con supervisión ocasional · Acompañada |
| Dificultad (actividad) | Fácil · Intermedio · Avanzado · Adaptable |
| Realización | Completa · Parcial · No realizada |
| Participación | Activa · Con ayuda · Observadora · No ha querido participar |
| Ayuda | Ninguna · Algunas pistas · Ayuda frecuente · Acompañamiento continuo |
| Dificultad percibida | Fácil · Adecuada · Difícil |
| Gusto | Sí · Regular · No |
| Próxima vez | Repetir · Adaptar · Aumentar dificultad |

Al importar, aceptar también las variantes antiguas y convertirlas: «Participa con ayuda» → Con ayuda; «Observa» → Observadora; «No quiso participar» → No ha querido participar; «Pocas pistas» → Algunas pistas; columna «Disfrute» → `gusto`. Un valor desconocido se marca como error en el resumen de importación; nunca se sustituye en silencio por el primero de la lista.

**Reglas de integridad:**
- **Desactivar** una actividad no afecta a eventos ni registros ya creados (es la forma normal de retirar una actividad).
- **Borrar** una actividad solo se permite si no tiene eventos ni registros; si los tiene, la app propone desactivarla.
- **Borrar** un evento o un registro sí lo elimina definitivamente, siempre tras confirmación («¿Seguro? No se puede deshacer»).
- Las columnas `nombre` y `area` en events y logs se guardan como copia, para que el historial se conserve aunque se edite el catálogo.

## 5. Pantallas y funciones

Navegación: barra superior fija con 4 botones grandes en recuadros de colores (Calendario, Actividades, Registro, Seguimiento). Se mantiene el diseño del prototipo: fondo blanco, tipografía grande, colores cálidos, azul para autónomas y naranja para acompañadas. En una pantalla de **Ajustes** (icono discreto): lista de hermanas, regenerar enlace de la madre, copiar enlace, cerrar sesión.

1. **Calendario / Inicio**
   - Resumen: actividades de los próximos 7 días, próxima visita de cada hermana, actividades autónomas pendientes, últimas 5 realizadas.
   - Las pendientes con fecha pasada aparecen arriba como «Atrasadas» para registrarlas o cancelarlas.
   - Vista **semanal y mensual** (el prototipo solo tiene lista por días; añadir cuadrícula mensual).
   - Cada evento muestra día, hora, nombre, modalidad, hermana, duración y estado.
   - Añadir, editar, cancelar, **reprogramar** (botón propio que solo pide nueva fecha y hora) y borrar. Programar visitas sin actividad asociada.
   - Al marcar como realizada o cancelada, el evento **desaparece de los próximos** y las realizadas pasan a «Últimas realizadas».
2. **Banco de actividades**
   - Buscar; filtrar por área, modalidad y dificultad.
   - Añadir, editar, duplicar, desactivar/activar y «Programar» desde la ficha.
   - 11 áreas fijas. Importar y exportar Excel (sección 7).
3. **Registro**
   - Formulario breve (menos de un minuto) con los campos del modelo `logs`.
   - Si la realización es «No realizada», el evento sigue Pendiente y la app pregunta si se quiere reprogramar.
   - Historial cronológico con opción de borrar. Observaciones solo visibles aquí, nunca en la vista de la madre.
4. **Seguimiento**
   - Actividades en los últimos 7 días y en el mes en curso (indicar claramente el periodo); frecuencia por área; autónomas vs. acompañadas; visitas y registros por hermana; las que más le gustan; las que requieren más ayuda.
   - Solo gráficos simples. **Sin interpretaciones ni conclusiones clínicas.**
5. **Vista de la madre** (`#/ver/<token>`, solo lectura)
   - Muy sencilla y con letra grande (mínimo 22 px): qué día viene cada hija, qué harán juntas, qué puede hacer ella sola, qué se ha hecho.
   - Textos según modalidad: Autónoma → «Puedes hacerla tú sola»; Autónoma con supervisión ocasional → «Puedes hacerla tú, con alguien cerca»; Acompañada → «Viene <hermana>».
   - Solo muestra: fecha, hora, nombre de la actividad, modalidad, hermana, estado.
   - **No muestra:** observaciones, participación, ayuda, dificultad, gusto ni ningún dato de registro.
   - Sin botones de edición; la base de datos debe impedir escribir aunque se manipule el navegador.
   - Si el token no es válido o se ha regenerado: mensaje amable «Este enlace ya no funciona. Pide uno nuevo a tus hijas».

## 6. Diseño

Cálido, moderno y limpio; no infantil ni médico. Botones grandes, texto de al menos 18 px, colores suaves, iconos intuitivos, adaptación completa a móvil. Crear una actividad o un registro en menos de un minuto. La vista de la madre, aún más simple.

## 7. Excel

- **Importar catálogo:** hoja `Actividades` con columnas `ID_actividad, Nombre, Area_trabajo, Modalidad, Instrucciones, Materiales, Duracion_min, Dificultad, Capacidades_implicadas, Contexto, Activa`. Ignorar filas vacías. Usar `ID_actividad` como clave: si existe se actualiza, si no se crea (evita duplicados y conserva IDs). Mostrar un resumen antes de confirmar (nuevas / actualizadas / con errores, indicando fila y motivo).
- **Importar registros (opcional):** hoja `Registro` del Excel, si tiene filas con fecha. Mismo resumen previo. Aplicar las conversiones de valores de la sección 4.
- **Exportar:** catálogo en el mismo formato; y una **copia de seguridad completa** (hojas Actividades, Calendario, Registro y Ajustes), con fecha en el nombre del archivo.
- **Restaurar copia completa:** la copia de seguridad debe poder reimportarse desde la app. Antes de restaurar, mostrar resumen y avisar de que se sobrescribirán los datos coincidentes.
- Las descargas usan la descarga normal del navegador (no funciones propias de Claude).
- El Excel sigue siendo editable fuera de la app.

## 8. Comprobaciones antes de dar por terminado

1. Acceso desde al menos dos dispositivos o navegadores distintos con la contraseña común.
2. Un cambio hecho en un dispositivo aparece en el otro sin recargar.
3. Crear, editar, duplicar (con ID correlativo) y desactivar actividades.
4. Importar el Excel adjunto: 28 actividades con sus IDs (ACT001…ACT041), dificultad «Adaptable» conservada, sin duplicados al repetir la importación. Si ACT041 («Cita médica») sigue sin área ni modalidad, debe aparecer como error en el resumen, no importarse a medias.
5. Programar visitas y actividades; cancelar y reprogramar.
6. Registrar una actividad realizada; comprobar que sale de próximas y aparece en últimas.
7. La vista de la madre funciona sin contraseña, **no muestra observaciones** y no permite escribir (probar una escritura directa con la clave `anon` y verificar que falla). Regenerar el enlace y comprobar que el antiguo deja de funcionar.
8. **Intentar crear una cuenta nueva con la clave `anon` y verificar que falla**; y que un usuario distinto del familiar (si existiera) no puede leer datos.
9. Crear un evento a las 00:30 hora de Madrid y comprobar que aparece en el día correcto.
10. Los datos persisten al cerrar y volver a abrir; instalación como PWA en móvil; aviso de nueva versión tras publicar un cambio.
11. Exportación de copia de seguridad y restauración correctas.

Indica claramente cuáles de estas pruebas no pudiste hacer tú misma y cómo debo comprobarlas yo.

## 9. Entregables

- Código en el repositorio y app publicada en GitHub Pages.
- Scripts SQL de Supabase (tablas, `allowed_users`, políticas RLS, función de la vista pública), documentados y reutilizables.
- `README.md` en español, para una persona no técnica, con:
  - Cómo entrar, instalar en el móvil y usar cada pantalla.
  - Cómo compartir con las hermanas (enlace + contraseña) y con la madre (enlace de consulta); cómo cambiar la contraseña y regenerar el enlace.
  - Cómo hacer y restaurar copias de seguridad (exportar a Excel y, si procede, desde Supabase).
  - **Aviso:** el plan gratuito de Supabase pausa el proyecto tras 7 días sin uso. Explicar cómo reactivarlo desde la web de Supabase y recomendar abrir la app al menos una vez por semana.
  - Qué hacer si algo falla y cómo pedir cambios a Claude Code.
  - Aviso de privacidad: qué datos se guardan, dónde (UE) y que no se incluyen datos médicos.

## 10. Fallos conocidos del prototipo (no copiar)

El prototipo `DESPIERTA_MARUJA.html` sirve solo como referencia visual y funcional. No reproducir estos fallos:

1. Calcula «hoy» con `toISOString()` (UTC): entre medianoche y la 1–2 h en España muestra el día anterior. Usar fecha local.
2. Usa nombres de campo distintos (`actId`, `dur`, `instr`, `mat`, `cap`, `obs`, `prox`, `min`, `minReal`, `realizada`, `evId`, colección `acts`). Usar los de la sección 4.
3. Lista de dificultad «Fácil / Intermedio / Difícil»: al editar una actividad «Adaptable» la cambia a «Fácil» sin avisar. Usar la lista de la sección 4.
4. Genera IDs aleatorios (`uid("ACT")`) al crear y duplicar. Usar numeración correlativa.
5. `claude.use("db")` y `claude.use("downloads")` solo existen dentro de Claude: sustituir por Supabase y descarga normal del navegador.
6. Trata «Autónoma con supervisión ocasional» igual que «Autónoma» («Puede hacerla ella sola»). Usar los textos de la sección 5.
7. La lista de hermanas se deduce de los datos ya guardados, así que está vacía al principio. Usar `settings.hermanas`.
8. La importación no muestra resumen previo ni detecta valores no válidos.
9. «Última semana» es móvil y «último mes» es el mes natural sin indicarlo. Etiquetar claramente cada periodo.
