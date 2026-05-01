# ⚽ Penca Mundial 2026

Sistema de predicciones para el Mundial FIFA 2026. Grupos privados, leaderboard en tiempo real, puntos configurables por grupo.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Supabase** (PostgreSQL + Auth + Realtime)
- **Tailwind CSS** + shadcn/ui
- **football-data.org** API para sincronizar resultados
- **Vercel** (deploy + cron jobs)

---

## Requisitos previos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) (plan gratuito funciona)
- Cuenta en [Vercel](https://vercel.com)
- API key de [football-data.org](https://www.football-data.org) (plan gratuito funciona)

---

## Setup paso a paso

### 1. Clonar y configurar el proyecto

```bash
git clone <tu-repo>
cd penca-mundial
npm install
cp .env.example .env.local
```

### 2. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → New Project
2. Anotar:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (Settings → API) → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Ejecutar el schema SQL

En el **SQL Editor** de Supabase, ejecutar el archivo completo:

```
supabase/migrations/001_initial.sql
```

Esto crea todas las tablas, índices, triggers, RLS policies y el seed inicial de equipos.

> **Nota:** Si tenés la [Supabase CLI](https://supabase.com/docs/guides/cli):
> ```bash
> supabase login
> supabase link --project-ref <tu-project-ref>
> supabase db push
> ```

### 4. Configurar autenticación en Supabase

Ir a **Authentication → Providers** y activar:

#### Google
1. Crear credenciales OAuth en [Google Cloud Console](https://console.cloud.google.com)
2. Authorized redirect URI: `https://<tu-proyecto>.supabase.co/auth/v1/callback`
3. Pegar Client ID y Secret en Supabase

#### Microsoft (Azure AD)
1. Registrar app en [Azure Portal](https://portal.azure.com) → App Registrations
2. Redirect URI: `https://<tu-proyecto>.supabase.co/auth/v1/callback`
3. Pegar Client ID y Secret en Supabase

#### Apple
1. Crear App ID + Service ID en [Apple Developer](https://developer.apple.com)
2. Configurar Sign in with Apple
3. Pegar credenciales en Supabase

### 5. Configurar variables de entorno

Editar `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FOOTBALL_DATA_API_KEY=tu_api_key_aqui
CRON_SECRET=una_cadena_aleatoria_larga_y_secreta
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Obtener API key de football-data.org

1. Registrarse en [football-data.org](https://www.football-data.org/client/register)
2. El plan gratuito permite 10 requests/minuto
3. La competencia del Mundial 2026 tendrá código `WC` o similar
4. Copiar la API key en `FOOTBALL_DATA_API_KEY`

> ⚠️ **Nota:** El Mundial 2026 comienza el 11 de junio de 2026. Antes de esa fecha, el cron job recibirá datos vacíos o de torneo anterior. Podés probar con la Eurocopa (código `EC`) para validar el flujo.

### 7. Correr en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Deploy en Vercel

### 1. Conectar repositorio

```bash
npm install -g vercel
vercel login
vercel --prod
```

O conectar el repo desde el dashboard de Vercel.

### 2. Configurar variables de entorno en Vercel

En **Settings → Environment Variables** agregar todas las variables de `.env.example`:

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (solo en servidor) |
| `FOOTBALL_DATA_API_KEY` | API key de football-data.org |
| `CRON_SECRET` | String aleatorio para proteger los endpoints de cron |
| `NEXT_PUBLIC_APP_URL` | URL de tu deploy (ej: `https://penca-mundial.vercel.app`) |

### 3. Cron jobs

El archivo `vercel.json` configura dos cron jobs:

| Cron | Descripción |
|------|-------------|
| `GET /api/cron/sync-matches` | Cada 5 min: sincroniza resultados desde football-data.org |
| `GET /api/cron/calculate-points` | Cada 5 min (+30s): recalcula puntos de predicciones |

Los endpoints están protegidos con el header `Authorization: Bearer <CRON_SECRET>`.

> **Plan gratuito de Vercel:** Permite hasta 2 cron jobs. ✅

### 4. Supabase Realtime

Habilitar Realtime para la tabla `predictions` en Supabase:
- Ir a **Database → Replication**
- Activar `predictions` en la columna **Source**

---

## Estructura del proyecto

```
penca-mundial/
├── supabase/migrations/001_initial.sql   # Schema completo con RLS
├── src/
│   ├── app/                             # Next.js App Router
│   │   ├── page.tsx                     # Landing / Login
│   │   ├── dashboard/page.tsx           # Mis grupos
│   │   ├── grupos/
│   │   │   ├── nuevo/page.tsx           # Crear grupo
│   │   │   └── [slug]/
│   │   │       ├── page.tsx             # Leaderboard + Fixture
│   │   │       ├── predicciones/        # Hacer predicciones
│   │   │       └── admin/              # Admin del grupo
│   │   ├── unirse/[code]/page.tsx       # Join via invite
│   │   └── api/cron/                   # Cron jobs
│   ├── components/                      # Componentes React
│   ├── lib/                            # Utilidades
│   │   ├── supabase/                   # Supabase clients
│   │   ├── football-api.ts             # Wrapper football-data.org
│   │   └── points.ts                  # Lógica de puntos
│   └── middleware.ts                   # Auth middleware
```

---

## Sistema de puntos

Cada grupo puede configurar su propio sistema:

| Acierto | Default | Descripción |
|---------|---------|-------------|
| Resultado exacto (grupos) | 3 pts | Acertaste 2-1 en fase de grupos |
| Ganador/empate (grupos) | 1 pt | Acertaste quién gana pero no el marcador |
| Resultado exacto (eliminatorias) | 6 pts | Acertaste en octavos, cuartos, semis, final |
| Ganador (eliminatorias) | 2 pts | Acertaste quién pasa pero no el marcador |

El admin del grupo puede cambiar estos valores antes de que empiece el torneo.

---

## Flujo de invitación

1. Admin crea un grupo → genera link único `https://app.com/unirse/<code>`
2. Comparte el link con amigos
3. Usuario accede al link → se loguea → se une automáticamente al grupo
4. Admin puede ver y gestionar miembros en `/grupos/[slug]/admin`

---

## Troubleshooting

### Los resultados no se actualizan
- Verificar que `FOOTBALL_DATA_API_KEY` esté configurada
- Revisar los logs de Vercel en **Functions → Cron**
- El plan gratuito de football-data.org tiene rate limit de 10 req/min

### Error de RLS en Supabase
- Asegurarse de ejecutar el SQL completo (incluyendo las policies)
- Verificar que RLS esté habilitado en todas las tablas
- Para debugging: usar el Service Role key temporalmente (bypasa RLS)

### El login no redirige correctamente
- Verificar que `NEXT_PUBLIC_APP_URL` sea la URL correcta
- Agregar la URL a los redirect URLs permitidos en Supabase Auth

---

## Licencia

MIT — libre para uso personal y comercial.
