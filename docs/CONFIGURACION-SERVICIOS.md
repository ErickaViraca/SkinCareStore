# Configuración de servicios externos

Pasos para crear los servicios que usa el panel. Son las mismas cuentas que el proyecto de Xiaomi, pero con **recursos nuevos y separados** para Soleil.

> ⚠️ **Claves y contraseñas:** guárdalas en un gestor de contraseñas. **Nunca** las pegues en el chat, en GitHub ni en un archivo del repositorio. Se cargan solo en Vercel (producción) y en `.env.local` (tu computadora, que Git ignora).

---

## 1. Neon (base de datos)

1. Entra a [console.neon.tech](https://console.neon.tech) → **New Project**.
   - **Nombre:** `soleil`.
   - **Postgres:** 17 (la misma versión de los tests).
   - **Región:** *AWS São Paulo (sa-east-1)*, la más cercana a Bolivia. Vercel usa la misma región (la fija `vercel.json`).
2. El proyecto se crea con la rama **`main`**: será **producción**.
3. **Branches → Create branch**, con nombre `desarrollo` y creada desde `main`. Es la copia para probar mientras se programa.
4. En cada rama, **Connect** → copia la *connection string* del rol dueño (`soleil_owner`). Guárdalas como:
   - `DATABASE_URL` de **desarrollo**;
   - `DATABASE_URL` de **producción**.
5. No hace falta crear tablas: las migraciones las crean (`npm run db:migrate`). Los usuarios `soleil_app` y `soleil_web` los crea una migración; sus contraseñas se asignan después, con los pasos que te pasaré en ese momento.

## 2. Google Cloud (login con Google)

1. Entra a [console.cloud.google.com](https://console.cloud.google.com). Puedes usar el mismo proyecto de Xiaomi o crear uno nuevo, por ejemplo "Soleil".
Los nombres van en español (como aparecen con la consola en español) y, entre paréntesis, en inglés.

2. **Google Auth Platform → Descripción general → Comenzar** (*Get started*). Es un asistente de 4 pasos:
   1. **Información de la app** (*App information*): nombre **Soleil Gestión** y tu email de soporte.
   2. **Público** (*Audience*): **Usuarios externos** (*External*).
   3. **Información de contacto** (*Contact information*): tu email.
   4. **Finalizar**: aceptar la política de datos del usuario → **Crear**.
3. **Usuarios de prueba:** la app queda en estado **Prueba** (*Testing*). En **Público → Usuarios de prueba** (*Audience → Test users*) → **Agregar usuarios**: el email de Google de cada socia.
   - En Prueba solo pueden pasar por el ingreso con Google esos emails (hasta 100). Google puede mostrar un aviso de "app no verificada" o "en prueba"; se acepta y sigue.
   - La sesión del panel dura lo mismo (12 horas) en Prueba o en producción.
   - **Publicar la app** (pasar a *En producción*) exige una URL de página principal y una de política de privacidad. Se hace en la etapa 8, cuando exista el dominio (ver más abajo).
4. **Clientes → Crear cliente** (*Clients → Create client*):
   - Tipo: **Aplicación web** (*Web application*). Nombre: `Soleil panel`.
   - **Orígenes autorizados de JavaScript** (*Authorized JavaScript origins*): `http://localhost:3000` (más adelante se agrega el dominio del panel).
   - **URI de redireccionamiento autorizados** (*Authorized redirect URIs*): `http://localhost:3000/api/auth/callback/google` (más adelante, `https://<dominio-del-panel>/api/auth/callback/google`).
5. Copia y guarda el **ID de cliente** (*Client ID*) y el **Secreto del cliente** (*Client secret*) en tu gestor de contraseñas.

**Etapa 8 (dominio y producción), pendiente en Google:**
1. Publicar una página de **política de privacidad** (qué datos guardamos de las administradoras: nombre y email, y para qué).
2. En **Información de la marca**: página principal, política de privacidad y el dominio en **Dominios autorizados**. No subir logo (obliga a verificar la marca).
3. En **Clientes**: agregar `https://<dominio-del-panel>` como origen y `https://<dominio-del-panel>/api/auth/callback/google` como URI de redireccionamiento.
4. En **Público**: **Publicar app**.

> Recuerda: quién puede entrar **no** se configura en Google. Se controla en la tabla `admin_users` (especificación §4.16).

## 3. Cloudflare R2 (fotos y facturas)

1. Entra a [dash.cloudflare.com](https://dash.cloudflare.com) → **R2 Object Storage**.
2. **Create bucket** `soleil-fotos`. Ubicación: automática.
   - **Settings → Public access:** activa por ahora el subdominio **r2.dev** (sirve para probar). Cuando tengas el dominio, se conecta uno propio, por ejemplo `fotos.<dominio>`, como en Xiaomi.
   - **Settings → CORS policy:** pega esto, que permite subir fotos desde el panel:
     ```json
     [
       {
         "AllowedOrigins": ["http://localhost:3000"],
         "AllowedMethods": ["GET", "PUT"],
         "AllowedHeaders": ["*"],
         "MaxAgeSeconds": 3600
       }
     ]
     ```
     Agrega también la dirección del panel en Vercel (`https://soleil-admin-panel.vercel.app`) y, más adelante, el dominio propio.
3. **Create bucket** `soleil-facturas`. **Sin acceso público**: las facturas se ven solo con enlaces temporales desde el panel.
4. **R2 → Manage API tokens → Create API token:**
   - Permiso: **Object Read & Write**.
   - Buckets: **solo** `soleil-fotos` y `soleil-facturas`.
   - Guarda el **Access Key ID**, el **Secret Access Key** y el **Account ID** (aparece en la página de R2).
5. Guarda también la URL pública de `soleil-fotos` (la de r2.dev).

## 4. Vercel (el panel en línea)

Cada vez que se mergea un PR a `main`, Vercel publica el panel solo. Antes de compilar aplica las migraciones pendientes en la base de producción (`scripts/migrate-on-deploy.ts`), así nunca queda código nuevo con tablas viejas.

**A. Crear el proyecto**
1. [vercel.com](https://vercel.com) → **Add New → Project** → importar `ErickaViraca/SkinCareStore`. Si no aparece, **Adjust GitHub App Permissions** y darle acceso a ese repositorio.
2. Vercel detecta Next.js. **No cambiar** los comandos de build: los define `vercel.json` (también la región São Paulo, `gru1`, junto a Neon).
3. Antes de **Deploy**, en **Environment Variables**, cargar solo para **Production**:
   - `DATABASE_URL_MIGRATIONS`: en Neon, rama `main` → **Connect** → rol `soleil_owner`, con **Connection pooling desactivado** (el host **sin** `-pooler`).
   - `AUTH_SECRET`: una clave al azar de 40 caracteres generada con el gestor de contraseñas.
   - `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET`: los del cliente de Google.
4. **Deploy.** Este primer despliegue crea las tablas, las vistas y los usuarios `soleil_app` y `soleil_web`. El panel abre en `https://<proyecto>.vercel.app`, pero todavía no deja ingresar (faltan B, C y D).
5. Opcional: **Settings → Domains** → editar el subdominio `*.vercel.app` por uno más claro, por ejemplo `soleil-panel.vercel.app` (gratis).

**B. Neon: usuario del panel y administradoras.** En Neon, rama `main` → **SQL Editor**:
```sql
-- Contraseña: 32 caracteres, solo letras y números (generada con el gestor de contraseñas).
ALTER ROLE soleil_app WITH LOGIN PASSWORD 'LA_CONTRASEÑA';

-- Quiénes pueden entrar al panel (los mismos emails que en Usuarios de prueba de Google).
INSERT INTO admin_users (email, name) VALUES
  ('tu-email@gmail.com', 'Ericka'),
  ('email-de-vanessa@gmail.com', 'Vanessa');
```

> El dueño de la base es `soleil_owner` (en otros proyectos Neon lo llama `neondb_owner`). Si Neon se conectó desde Vercel (integración), Vercel ya trae `DATABASE_URL` y `DATABASE_URL_UNPOOLED` por ambiente con el dueño: en el paso C se **edita** la `DATABASE_URL` de Production en vez de crearla. Las de Development no se tocan (no se despliegan).

**C. Vercel: conexión del panel.**
1. En Neon, rama `main` → **Connect** → con **Connection pooling activado** (host con `-pooler`). Copiar la cadena y reemplazar `soleil_owner:...@` por `soleil_app:LA_CONTRASEÑA@`.
2. En Vercel, **Settings → Environment Variables** → agregar `DATABASE_URL` con ese valor, solo para **Production**.
3. **Deployments** → el último → **⋯ → Redeploy**.

**D. Google: la dirección del panel.** En **Clientes** → tu cliente, agregar:
- Origen autorizado de JavaScript: `https://<proyecto>.vercel.app`
- URI de redireccionamiento: `https://<proyecto>.vercel.app/api/auth/callback/google`

**E. Probar:** abrir `https://<proyecto>.vercel.app` → **Ingresar con Google**.

**Después:**
- Cada merge a `main` despliega solo (si falla la migración o el build, el panel anterior sigue en línea).
- Cada PR recibe una **vista previa** con su propia dirección. Ahí todavía no se puede ingresar: Google solo acepta direcciones fijas. Se resolverá más adelante si hace falta.

## 5. Ambiente de pruebas (rama `develop`)

Un segundo panel, igual al oficial, con **su propia base y sus propias fotos**, para probar sin tocar los datos de la tienda. Se publica solo con cada merge a `develop`. Arriba muestra una franja amarilla **"Ambiente de pruebas"**.

**A. Neon (rama `desarrollo`)**
1. En Neon, proyecto `soleil` → **Connect** → **Branch: `desarrollo`**, **Role: `soleil_owner`**, **Connection pooling desactivado** → copiar la cadena (host **sin** `-pooler`). Es `DATABASE_URL_MIGRATIONS` de pruebas.
2. Después del primer despliegue de `develop` (que crea las tablas y los usuarios en esta rama), en **SQL Editor** con la rama **`desarrollo`** elegida arriba:
   ```sql
   -- Contraseña DISTINTA a la de producción (32 caracteres, letras y números).
   ALTER ROLE soleil_app WITH LOGIN PASSWORD 'LA_CONTRASEÑA_DE_PRUEBAS';

   INSERT INTO admin_users (email, name) VALUES
     ('tu-email@gmail.com', 'Ericka'),
     ('email-de-vanessa@gmail.com', 'Vanessa')
   ON CONFLICT (email) DO NOTHING;
   ```
3. **Connect** otra vez, rama `desarrollo`, **con** pooling (host con `-pooler`): reemplazar `soleil_owner:...@` por `soleil_app:LA_CONTRASEÑA_DE_PRUEBAS@`. Es `DATABASE_URL` de pruebas.

**B. R2:** bucket nuevo `soleil-fotos-pruebas` con **acceso público (r2.dev)** y el mismo CORS que `soleil-fotos`, pero con `https://soleil-admin-pruebas.vercel.app` en `AllowedOrigins`. En el token de R2, agregar este bucket.

**C. Vercel:** en **Settings → Environment Variables**, cada variable con **Environments: Preview** y **"Select a Custom Preview Branch" → `develop`**:

| Variable | Valor |
|---|---|
| `DATABASE_URL_MIGRATIONS` | A.1 |
| `DATABASE_URL` | A.3 |
| `AUTH_SECRET` | Otra clave al azar (distinta a la de producción) |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Los mismos de producción |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Los mismos (el token ya incluye el bucket nuevo) |
| `R2_PHOTOS_BUCKET` | `soleil-fotos-pruebas` |
| `R2_PUBLIC_URL` | La URL r2.dev de `soleil-fotos-pruebas` |

Y en **Settings → Domains**: `soleil-admin-pruebas.vercel.app` asignado a la rama **`develop`**.

**D. Google:** en el cliente, agregar el origen `https://soleil-admin-pruebas.vercel.app` y la URI `https://soleil-admin-pruebas.vercel.app/api/auth/callback/google`.

**Copiar datos:** para ensayar con datos reales, en Neon se puede reiniciar la rama `desarrollo` desde `production` (**Branches → desarrollo → Reset from parent**). Borra lo que había en pruebas. Nunca al revés cuando haya ventas reales.

## 6. Qué se carga en cada lugar

| Variable | Desarrollo (`.env.local`) | Producción (Vercel) |
|---|---|---|
| `DATABASE_URL` | Rama `desarrollo` de Neon | Rama `main` de Neon, usuario `soleil_app`, con `-pooler` |
| `DATABASE_URL_MIGRATIONS` | — | Rama `main` de Neon, usuario `soleil_owner`, sin `-pooler` |
| `AUTH_SECRET` | Clave al azar (40 caracteres) | Otra distinta |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Del cliente OAuth | Los mismos |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Del token de R2 | Los mismos |
| `R2_PHOTOS_BUCKET`, `R2_PUBLIC_URL` | `soleil-fotos`, URL r2.dev sin `/` al final | Igual (luego, con el dominio propio) |
| `R2_INVOICES_BUCKET` | `soleil-facturas` (etapa 4) | Igual |

El dominio propio (`.com`) se configura en la etapa 8.
