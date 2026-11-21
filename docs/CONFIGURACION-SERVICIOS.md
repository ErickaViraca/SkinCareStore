# Configuración de servicios externos

Pasos para crear los servicios que usa el panel. Son las mismas cuentas que el proyecto de Xiaomi, pero con **recursos nuevos y separados** para Soleil.

> ⚠️ **Claves y contraseñas:** guárdalas en un gestor de contraseñas. **Nunca** las pegues en el chat, en GitHub ni en un archivo del repositorio. Se cargan solo en Vercel (producción) y en `.env.local` (tu computadora, que Git ignora).

---

## 1. Neon (base de datos)

1. Entra a [console.neon.tech](https://console.neon.tech) → **New Project**.
   - **Nombre:** `soleil`.
   - **Postgres:** 17 (la misma versión de los tests).
   - **Región:** *AWS São Paulo (sa-east-1)*, la más cercana a Bolivia. Vercel debe usar la misma región (paso 4 de Vercel, más adelante).
2. El proyecto se crea con la rama **`main`**: será **producción**.
3. **Branches → Create branch**, con nombre `desarrollo` y creada desde `main`. Es la copia para probar mientras se programa.
4. En cada rama, **Connect** → copia la *connection string* del rol dueño (`neondb_owner`). Guárdalas como:
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
     Cuando exista el dominio del panel, se agrega a `AllowedOrigins`.
3. **Create bucket** `soleil-facturas`. **Sin acceso público**: las facturas se ven solo con enlaces temporales desde el panel.
4. **R2 → Manage API tokens → Create API token:**
   - Permiso: **Object Read & Write**.
   - Buckets: **solo** `soleil-fotos` y `soleil-facturas`.
   - Guarda el **Access Key ID**, el **Secret Access Key** y el **Account ID** (aparece en la página de R2).
5. Guarda también la URL pública de `soleil-fotos` (la de r2.dev).

## 4. Qué se carga en cada lugar

| Variable | Desarrollo (`.env.local`) | Producción (Vercel) |
|---|---|---|
| `DATABASE_URL` | Rama `desarrollo` de Neon | Rama `main` de Neon (luego, con el usuario `soleil_app`) |
| `AUTH_SECRET` | `openssl rand -base64 32` | Otro distinto, generado igual |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Del cliente OAuth | Los mismos |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Del token de R2 | Los mismos |
| `R2_PHOTOS_BUCKET`, `R2_INVOICES_BUCKET`, `R2_PUBLIC_URL` | `soleil-fotos`, `soleil-facturas`, URL r2.dev | Igual (luego, con el dominio propio) |

El proyecto de Vercel y el dominio se configuran en la etapa 8 (producción).
