# Modo demo

Para mostrar la aplicación a posibles clientes sin registro ni correos: el login muestra un
recuadro **"Prueba la demo"** con una cuenta de administrador pública, y los datos de ejemplo
se reinician solos cada noche.

> **Importante:** usa un proyecto de Supabase **separado** para la demo. El reinicio nocturno
> borra los datos de la cuenta demo.

## 1. Base de datos

En Supabase → **SQL Editor**, ejecuta en orden (pega → **Run**):

1. `supabase/migrations/20261021000000_esquema_inicial.sql`
2. `supabase/migrations/20261021000001_modo_demo.sql`
3. `supabase/migrations/20261021000002_tema_bemaker.sql`
4. `supabase/migrations/20261021000003_endurecimiento.sql`

## 2. Cuenta demo

1. **Authentication → Users → Add user → Create new user**
   - Email: por ejemplo `demo@tudominio.cl`
   - Contraseña: una fácil de escribir, por ejemplo `demo1234`. **Será pública.**
   - Marca **Auto Confirm User** (así no se envía ningún correo).
2. (Opcional, para el reinicio nocturno) **Database → Extensions** → activa `pg_cron`.
3. Abre `supabase/demo/configurar_demo.sql`, cambia el correo en las tres líneas marcadas
   con `← CAMBIA EL CORREO` / `← MISMO CORREO`, pégalo en el SQL Editor y pulsa **Run**.
   Al final debe mostrar `Empresa Demo · admin · 40`.
4. Cierra el registro: **Authentication → Sign In / Providers** → desactiva
   **Allow new users to sign up** → **Save**.

Para reiniciar la demo a mano en cualquier momento:

```sql
select public.reiniciar_demo('demo@tudominio.cl', 'Empresa Demo');
```

## 3. Variables de entorno

En `.env` (local) o en las variables del hosting:

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | Project URL del proyecto demo |
| `VITE_SUPABASE_ANON_KEY` | clave anon / publishable |
| `VITE_DEMO` | `true` |
| `VITE_DEMO_EMAIL` | el correo de la cuenta demo |
| `VITE_DEMO_PASSWORD` | la contraseña de la cuenta demo |

Reinicia `npm run dev` después de cambiar el `.env`.

## 4. Publicar (opcional)

Cualquier hosting de sitios estáticos sirve (Cloudflare Pages, Netlify, Vercel):
comando de compilación `npm run build`, carpeta de salida `dist`, y las variables de la tabla anterior.
Como la app usa rutas del navegador, configura que todas las rutas sirvan `index.html`
(en Cloudflare Pages y Netlify basta con el archivo `public/_redirects` que trae el proyecto).
Agrega la dirección publicada en Supabase → **Authentication → URL Configuration**.
