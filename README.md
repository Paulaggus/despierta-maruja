# 🌞 Despierta Maruja

Aplicación familiar para organizar las actividades de estimulación cognitiva, actividad física y autonomía de mamá, y coordinarnos entre las cuatro hermanas.

- Las **hermanas** entran con una **contraseña común** desde el móvil, la tablet o el ordenador. Lo que cambia una lo ven las demás al momento.
- **Mamá** tiene su propio **enlace**, sin contraseña, donde ve quién viene, qué puede hacer ella sola y qué se ha hecho. No puede cambiar nada y no ve las observaciones.
- **No se guardan datos médicos.** Solo actividades, fechas, visitas y registros, en servidores de la Unión Europea.

---

## Índice

1. [Puesta en marcha (una sola vez)](#1-puesta-en-marcha-una-sola-vez)
2. [Instalar la app en el móvil](#2-instalar-la-app-en-el-móvil)
3. [Cómo se usa cada pantalla](#3-cómo-se-usa-cada-pantalla)
4. [Compartir con las hermanas y con mamá](#4-compartir-con-las-hermanas-y-con-mamá)
5. [Copias de seguridad](#5-copias-de-seguridad)
6. [Si algo falla](#6-si-algo-falla)
7. [Pedir cambios a Claude](#7-pedir-cambios-a-claude)
8. [Privacidad](#8-privacidad)

---

## 1. Puesta en marcha (una sola vez)

Se tarda unos 30 minutos. Solo lo hace una persona.

### Paso 1 · Crear la base de datos en Supabase

1. Entra en <https://supabase.com> y crea una cuenta gratuita (puedes usar «Continue with GitHub»).
2. Pulsa **New project**:
   - **Name:** `despierta-maruja`
   - **Database Password:** pulsa *Generate a password* y **guárdala** en un sitio seguro (no es la contraseña de la familia; solo hace falta para tareas técnicas).
   - **Region:** **Central EU (Frankfurt)** ← importante, para que los datos estén en la UE.
3. Pulsa **Create new project** y espera un par de minutos.

### Paso 2 · Crear las tablas y la seguridad

1. En el menú de la izquierda, entra en **SQL Editor** → **New query**.
2. Abre el archivo `supabase/1_preparar_base_datos.sql`, copia **todo** su contenido, pégalo y pulsa **Run**.
3. Debe aparecer «Success. No rows returned». Si sale algún error en rojo, copia el mensaje y consúltalo (sección 7).

### Paso 3 · Crear la cuenta de la familia y cerrar la puerta a desconocidos

1. Menú **Authentication** → **Sign In / Providers** (en algunas versiones, *Providers* → *Email*):
   - **Desactiva** «**Allow new users to sign up**» y guarda. Así nadie más puede crearse una cuenta.
   - Si ves la opción «Confirm email», puedes dejarla como está.
2. Menú **Authentication** → **Users** → **Add user** → **Create new user**:
   - **Email:** `familia@despierta-maruja.es` (no recibe correos; solo es un identificador interno).
   - **Password:** la **contraseña de la familia** que usaréis las cuatro. Mínimo 8 caracteres; mejor una frase fácil de recordar y difícil de adivinar (por ejemplo `maruja-girasol-1948`).
   - Marca **Auto Confirm User**.
3. Vuelve a **SQL Editor** → **New query**, pega el contenido de `supabase/2_autorizar_usuario.sql` y pulsa **Run**. Debe salir una fila con el email. Esto le dice a la base de datos que **solo esa cuenta** puede ver y cambiar los datos.

> Si usaste otro email en el punto 2, cámbialo también dentro de `2_autorizar_usuario.sql` y en `js/config.js`.

### Paso 4 · Conectar la app con Supabase

1. En Supabase, entra en **Project Settings** (rueda dentada) → **API Keys** (o **API**).
2. Copia:
   - La **Project URL** (algo como `https://abcdxyz.supabase.co`). Está en *Project Settings → Data API* o en la parte superior de *API*.
   - La **Publishable key** (empieza por `sb_publishable_…`). En proyectos antiguos se llama **anon public**.
3. Abre el archivo `js/config.js` con cualquier editor de texto (o directamente en GitHub, ver paso 5) y sustituye:
   - `https://TU-PROYECTO.supabase.co` por tu Project URL.
   - `PEGA-AQUI-LA-CLAVE-PUBLICA` por la Publishable key.

> ⚠️ **Nunca** pegues en ningún sitio la clave **secret** / **service_role**. La *publishable/anon* sí puede ir en el código: está pensada para eso y, sin la contraseña de la familia, no da acceso a nada.

### Paso 5 · Publicar la app en GitHub Pages

1. Entra en <https://github.com> (crea una cuenta gratuita si no la tienes).
2. Pulsa **+** (arriba a la derecha) → **New repository**:
   - **Repository name:** `despierta-maruja`
   - **Public** (no contiene datos ni contraseñas, solo el programa).
   - Pulsa **Create repository**.
3. En la página del repositorio vacío, pulsa **uploading an existing file**. Arrastra **todo el contenido** de la carpeta `despierta-maruja` (los archivos y las carpetas `css`, `js`, `vendor`, `iconos`, `supabase`) y pulsa **Commit changes**.
4. Ve a **Settings** → **Pages**:
   - **Source:** *Deploy from a branch*
   - **Branch:** `main` y carpeta `/ (root)` → **Save**.
5. Espera 1-2 minutos y recarga. Arriba aparecerá la dirección de la app:
   **`https://TU-USUARIO.github.io/despierta-maruja/`**

### Paso 6 · Primer uso

1. Abre esa dirección y escribe la contraseña de la familia.
2. Pulsa ⚙️ (arriba a la derecha) y escribe los **nombres de las cuatro hermanas** → *Guardar nombres*.
3. Ve a **Actividades** → **📥 Importar Excel** y elige `BASE_DATOS_DESPIERTA_MARUJA.xlsx`. Verás un resumen (nuevas, actualizadas, con errores) antes de confirmar.
   - La fila de **ACT041 «Cita médica»** saldrá como error porque está incompleta. Es lo esperado: complétala o bórrala del Excel. Para apuntar una cita, mejor créala como **visita** en el calendario (sin detalles médicos).
4. ¡Listo! Comparte la dirección y la contraseña con tus hermanas (sección 4).

---

## 2. Instalar la app en el móvil

Así aparece como un icono más (un sol naranja) y se abre a pantalla completa.

- **iPhone / iPad (Safari):** abre la dirección → botón **Compartir** (cuadrado con flecha) → **Añadir a pantalla de inicio**.
- **Android (Chrome):** abre la dirección → menú **⋮** → **Instalar aplicación** (o *Añadir a pantalla de inicio*).
- **Ordenador (Chrome o Edge):** icono de instalar en la barra de direcciones.

La sesión se queda guardada en cada dispositivo: no hace falta escribir la contraseña cada vez.

Cuando haya una versión nueva, aparecerá arriba una franja azul: **«Hay una versión nueva. Toca aquí para actualizar»**.

---

## 3. Cómo se usa cada pantalla

La barra de arriba tiene cuatro botones grandes. El punto verde junto a ⚙️ indica que hay conexión; si se pone rojo, no la hay.

**Colores:** 🟧 naranja = acompañada · 🟦 azul = la puede hacer ella sola · azul claro con borde discontinuo = sola, con supervisión ocasional.

### 📅 Calendario

- **Resumen:** la próxima visita de cada hermana, lo **atrasado** (pendiente con fecha pasada), los **próximos 7 días**, lo que puede hacer ella sola y las **5 últimas realizadas**.
- **Semana** y **Mes:** cambia de semana o de mes con ◀ ▶; «Hoy» vuelve a la fecha actual. En el mes, toca un día para ver el detalle o añadir algo.
- **+ Añadir:** elige día, hora, actividad (o deja «Solo visita»), modalidad, hermana y duración.
- En cada actividad:
  - **✔ Registrar:** abre el formulario de cómo ha ido. Al guardarlo, pasa a «Realizada» y sale de los próximos. Si eliges «No realizada», sigue pendiente y te propone reprogramarla.
  - **📆 Reprogramar:** solo pide el nuevo día y la hora.
  - **Cancelar:** desaparece de los próximos (se conserva en el historial).
  - **Editar** y **🗑 Borrar** (pide confirmación; borrar no se puede deshacer).

### 📚 Actividades

- Busca por nombre, instrucciones o material (no importan las tildes) y filtra por área, modalidad y dificultad.
- **+ Nueva:** el número (ACT042, ACT043…) se pone solo.
- En cada ficha: **📅 Programar**, **Editar**, **Duplicar**, **Desactivar/Activar** y **🗑**.
  - **Desactivar** es la forma normal de retirar una actividad: deja de salir para programar, pero no se pierde nada del historial.
  - Solo se puede **borrar** una actividad que nunca se ha usado. Si ya tiene historial, la app te propone desactivarla.
- **📥 Importar Excel:** añade las actividades nuevas y actualiza las existentes (por su ID). No crea duplicados aunque importes varias veces. Si el Excel tiene filas en la hoja *Registro*, también te ofrece importarlas.
- **📤 Exportar catálogo:** descarga el catálogo en el mismo formato, para editarlo en Excel y volver a importarlo.

### 📝 Registro

- **+ Nuevo registro:** para apuntar algo que no estaba programado. Para algo programado, usa «✔ Registrar» desde el calendario.
- El formulario se rellena tocando botones; lleva menos de un minuto.
- **🔒 Observaciones:** son privadas. Solo las veis las hermanas aquí; **nunca** salen en el enlace de mamá.
- El historial está ordenado del más reciente al más antiguo y cada registro se puede borrar.

### 📊 Seguimiento

Cuántas actividades se han hecho (últimos 7 días, este mes y en total), por semana y por mes, por área, autónomas frente a acompañadas, visitas y registros por hermana, las que más le gustan y las que requieren más ayuda.

Son datos para organizarnos en familia: **no son una valoración médica**.

### ⚙️ Ajustes

Nombres de las hermanas, enlace de mamá, copias de seguridad, cambiar la contraseña y cerrar sesión.

---

## 4. Compartir con las hermanas y con mamá

### Hermanas

Envíales:
1. La dirección: `https://TU-USUARIO.github.io/despierta-maruja/`
2. La contraseña de la familia (mejor en persona o por teléfono que por escrito).

### Mamá

1. En ⚙️ **Ajustes → Enlace para mamá → Copiar enlace**.
2. Envíaselo o, mejor, ábreselo en su móvil o tablet y añádelo a la pantalla de inicio (sección 2), para que solo tenga que tocar el icono.

Su pantalla es muy sencilla y con letra grande: qué hay hoy, quién viene a verla, qué puede hacer ella sola y qué se ha hecho. Se actualiza sola cada pocos minutos. **No ve** observaciones, participación, ayuda, dificultad ni si le ha gustado, y no puede cambiar nada.

### Cambiar el enlace de mamá

Si el enlace ha llegado a quien no debía: ⚙️ **Ajustes → Cambiar enlace**. El antiguo deja de funcionar al instante (mostrará «Este enlace ya no funciona») y tendrás que darle el nuevo.

### Cambiar la contraseña de la familia

⚙️ **Ajustes → Cambiar contraseña**. Después, avisa a tus hermanas. Los dispositivos que ya habían entrado siguen dentro. Si necesitas echar a un dispositivo concreto, cierra la sesión en él (⚙️ → Cerrar sesión).

¿Se os ha olvidado la contraseña? Como el email de la familia no es un correo real, no sirve «recuperar contraseña». En Supabase: **Authentication → Users** → los tres puntos junto al usuario → **Delete user**. Después créalo otra vez con la contraseña nueva y ejecuta de nuevo `2_autorizar_usuario.sql` (paso 3, puntos 2 y 3). **No se pierde ningún dato**: los datos no dependen del usuario.

---

## 5. Copias de seguridad

### Hacer una copia (recomendado: una vez al mes)

📝 **Registro** (o ⚙️ Ajustes) → **Descargar copia**. Se descarga un Excel `despierta-maruja-copia-AAAA-MM-DD.xlsx` con cuatro hojas: Actividades, Calendario, Registro y Ajustes. Guárdalo en un sitio seguro (por ejemplo, Google Drive o un pendrive). Contiene las observaciones privadas: no lo compartas fuera de la familia.

### Restaurar una copia

📝 **Registro** → **Restaurar copia** → elige el archivo. Verás un resumen antes de confirmar. Los datos del archivo sustituyen a los que tengan el mismo identificador; lo que no esté en el archivo se conserva.

### Copias en Supabase

El plan gratuito de Supabase **no** permite descargar copias automáticas de la base de datos; por eso es importante la copia en Excel. (Con el plan de pago, están en *Database → Backups*.)

---

## 6. Si algo falla

| Qué pasa | Qué hacer |
|---|---|
| **La app no carga datos / sale un error de conexión, y hace días que nadie la usaba** | Supabase gratuito **pausa el proyecto tras 7 días sin uso**. Entra en <https://supabase.com>, abre el proyecto y pulsa **Restore / Resume project**. Tarda unos minutos y no se pierde nada. Para evitarlo, que alguien abra la app al menos una vez por semana. |
| Sale «Falta un paso de configuración» | Revisa `js/config.js` (paso 4) y vuelve a subirlo a GitHub. |
| «La contraseña no es correcta» y estás segura de que lo es | Comprueba en `js/config.js` que el email es exactamente el del usuario creado en Supabase. |
| Entra pero no aparece ningún dato y no da error | Falta el paso 3.3 (`2_autorizar_usuario.sql`). |
| Mamá ve «Este enlace ya no funciona» | Alguien ha cambiado el enlace. Cópialo de nuevo en ⚙️ Ajustes. |
| Un cambio no aparece en otro móvil | Espera unos segundos o cierra y abre la app. El punto junto a ⚙️ debe estar verde. |
| La app instalada no muestra un cambio publicado | Cierra la app del todo y ábrela; debería aparecer la franja azul de «versión nueva». |
| El Excel no se importa | El resumen indica la hoja, la fila y el motivo (por ejemplo, un área mal escrita). Corrígelo en el Excel y vuelve a importar. |

---

## 7. Pedir cambios a Claude

Abre una conversación con Claude (o Claude Code en la carpeta del proyecto), adjunta este README y los archivos que haya que cambiar, y explica lo que quieres con un ejemplo. Por ejemplo:

> «En la app Despierta Maruja, quiero que en el calendario se pueda marcar una actividad como favorita. Te adjunto `js/app.js` y `css/estilos.css`.»

Para quien haga el cambio (nota técnica):

- Cada vez que se publique un cambio, hay que **subir el número de `VERSION` en `sw.js`** (por ejemplo, de `2026-11-15.1` a `2026-11-20.1`). Si no, los móviles con la app instalada no muestran el aviso de versión nueva.
- La especificación completa del proyecto está en `DESPIERTA_MARUJA.md`.

### Cómo está hecha (para quien tenga curiosidad)

```
index.html                 Página principal
css/estilos.css            Diseño
js/config.js               Conexión con Supabase (lo único que hay que editar)
js/app.js                  Pantallas y funciones
js/api.js                  Comunicación con la base de datos
js/datos.js                Listas de valores y fechas (siempre hora de Madrid)
js/excel.js                Importar y exportar Excel
sw.js, manifest.webmanifest  App instalable
vendor/                    Librerías: supabase-js 2.119 y SheetJS 0.20.3
supabase/*.sql             Tablas, seguridad y funciones de la base de datos
```

Sin frameworks ni compilación: lo que hay en el repositorio es exactamente lo que se publica. Los scripts SQL se pueden volver a ejecutar sin perder datos.

**Seguridad:** todas las tablas tienen *Row Level Security*. Solo la cuenta familiar (registrada en la tabla interna `allowed_users`) puede leer y escribir; el registro público está desactivado. El enlace de mamá llama a la función `vista_madre(token)`, que comprueba un token aleatorio de 64 caracteres y devuelve **solo** fecha, hora, nombre, modalidad, hermana y estado de las actividades (de 14 días atrás a 45 días adelante). Un visitante sin contraseña no puede leer ni escribir ninguna tabla.

---

## 8. Privacidad

- **Qué se guarda:** catálogo de actividades; calendario (fecha, hora, actividad, modalidad, hermana, duración y estado); registros (cómo fue cada actividad y observaciones breves); nombres de pila de las hermanas.
- **Qué NO se guarda:** diagnósticos, medicación, informes ni ningún otro dato médico. Por favor, no los escribáis en las observaciones.
- **Dónde:** en Supabase, en servidores de la Unión Europea (Frankfurt, Alemania). La app se sirve desde GitHub Pages, que solo aloja el programa, sin ningún dato.
- **Quién lo ve:** solo quien tenga la contraseña de la familia. Mamá ve, con su enlace, únicamente lo indicado en la sección 4.
- **En el dispositivo:** solo se guarda la sesión y alguna preferencia de pantalla, nunca los datos.
- **Borrar todo:** en Supabase, *Project Settings → General → Delete project*. Haz antes una copia si quieres conservarla.
