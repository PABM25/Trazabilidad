# Trazabilidad de activos

Aplicación web multiempresa para registrar, ubicar y seguir el ciclo de vida de activos identificados con RFID, código de barras o QR: uniformes, EPP, herramientas, contenedores, equipos, etc.

Cada empresa cliente es una **organización** con sus propios datos, usuarios, logo y color. Los términos se adaptan a cada rubro: tipos de activo con campos propios (por ejemplo Talla, Marca o N° de serie) y tipos de proceso (Lavado, Mantención, Inspección, Calibración…).

Desarrollado por **BeMaker**.

## Funcionalidades

| Módulo | Qué hace |
|---|---|
| **Panel** | Indicadores (vigentes, disponibles, en uso, procesos, cerca del fin de vida útil, bajas), gráfico mensual y reporte Excel de eventos por rango de fechas |
| **Activos** | Listado con filtros por código, tipo, ubicación y estado; exporta a Excel y PDF |
| **Consultar activo** | Ficha e historial completo de un activo escaneándolo |
| **Registrar activos** | Alta por lote leyendo códigos (lector RFID, lector USB o teclado) |
| **Registrar proceso** | Aplica un proceso (lavado, mantención…) a un lote, con observaciones por activo |
| **Traslados** | Mueve lotes entre ubicaciones (bodega → cliente, cliente → bodega…) |
| **Dar de baja** | Retira activos dañados o al final de su vida útil; quedan en el historial |
| **Ubicaciones** | Plantas, clientes, bodegas o sucursales, con capacidad y panel propio |
| **Usuarios** | Invitaciones por enlace con roles: administrador, operador y solo lectura |
| **Configuración** | Nombre, logo y color de la organización; tipos de activo y de proceso |

## Arquitectura

```
React + Vite (src/) ──supabase-js──▶ Supabase (Auth + Postgres con RLS)
        │
        └── (opcional) HTTP ──▶ server/  puente del lector RFID por puerto serial
```

- **Supabase** guarda todo: usuarios, datos y logos. La seguridad entre empresas la aplica la base de datos con Row Level Security: un usuario solo ve las organizaciones a las que pertenece.
- **server/** existe solo para leer un lector RFID conectado por puerto serial (Arduino, etc.). Los lectores USB que funcionan como teclado no lo necesitan.

```
src/
  pages/        una pantalla por archivo (se cargan al abrirlas)
  components/   piezas compartidas: Layout, LectorCodigos, Indicadores, Modal…
  hooks/        useCatalogos, useActivosEscaneados
  context/      AuthContext: sesión, organización actual y rol
  lib/db.js     cliente de Supabase y ayudas para consultas
  utils/        formato, alertas, exportación a Excel/PDF, validación de rutas
supabase/
  migrations/   esquema SQL, en orden
  demo/         configuración de la cuenta demo
  tests/        pruebas del esquema (npm run test:db)
server/         puente del lector RFID
docs/           guías (modo demo)
```

## Puesta en marcha (local)

### 1. Base de datos en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta en orden los archivos de [supabase/migrations/](supabase/migrations/) (pega → **Run**):
   1. `20261021000000_esquema_inicial.sql`
   2. `20261021000001_modo_demo.sql`
   3. `20261021000002_tema_bemaker.sql`
   4. `20261021000003_endurecimiento.sql`

   O con la CLI de Supabase: `supabase link --project-ref TU_PROYECTO` y `supabase db push`.
3. En **Authentication → URL Configuration**:
   - *Site URL*: la dirección de la app (`http://localhost:5173` en local, tu dominio en producción).
   - *Redirect URLs*: agrega `http://localhost:5173/**` y `https://tu-dominio/**`.

### 2. App

```bash
cp .env.example .env      # completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Los valores están en Supabase → **Project Settings → API** (*Project URL* y la clave *anon* / *publishable*). **Nunca** pongas la clave `service_role` en el frontend: la app solo usa la clave pública y la seguridad la aplica la base de datos.

> El paquete `xlsx` se descarga desde el CDN oficial de SheetJS (las versiones nuevas ya no se publican en npm); por eso `.npmrc` incluye `allow-remote=all`, que npm 12 exige para dependencias por URL.

### 3. Primer uso

1. Entra a la app y elige **Crear cuenta**.
2. Crea tu organización. Si marcas *Cargar datos de ejemplo*, se crean ubicaciones, tipos y 40 activos con historial.
3. En **Usuarios → Invitar usuario**, ingresa el correo de la persona: la app copia un **enlace de invitación**. Al abrirlo, la persona crea su cuenta con ese mismo correo y queda unida a la organización. El enlace sirve una sola vez.

Para una demo pública sin registro ni correos, ver [docs/DEMO.md](docs/DEMO.md).

### 4. (Opcional) Lector RFID por puerto serial

```bash
cd server
cp .env.example .env      # SERIAL_PORT=COM6, o SIMULAR=true para probar sin lector
npm install
npm start
```

En el `.env` de la app, agrega `VITE_LECTOR_URL=http://localhost:3000`. Las pantallas de escaneo mostrarán el interruptor "Lector RFID". El puente solo acepta conexiones del mismo equipo y de las direcciones listadas en `ORIGEN_PERMITIDO`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | App en modo desarrollo (http://localhost:5173) |
| `npm run build` | Compila para producción en `dist/` |
| `npm run preview` | Sirve la compilación localmente |
| `npm run lint` | Revisión de código (ESLint) |
| `npm run test:db` | Pruebas del esquema: seguridad entre organizaciones, roles, invitaciones y funciones. Corre Postgres en memoria; no toca ningún proyecto real |

GitHub ejecuta `lint`, `test:db` y `build` en cada envío ([.github/workflows/ci.yml](.github/workflows/ci.yml)).

## Publicar

### GitHub

```bash
git remote add origin https://github.com/TU_USUARIO/trazabilidad.git
git push -u origin main
```

El `.gitignore` deja fuera los `.env` (claves), `node_modules`, `dist` y el respaldo `legacy-lavanderia/`.

### Cloudflare Pages

1. **Workers & Pages → Create → Pages → Connect to Git** y elige el repositorio.
2. Configuración de compilación:
   - **Framework preset:** None (o Vite)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. **Environment variables** (Production y Preview):

   | Variable | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL |
   | `VITE_SUPABASE_ANON_KEY` | clave anon / publishable |
   | `VITE_APP_NOMBRE` | `Trazabilidad` (o el nombre comercial) |
   | `NODE_VERSION` | `22` |
   | `VITE_DEMO`, `VITE_DEMO_EMAIL`, `VITE_DEMO_PASSWORD` | solo si es la demo pública |

4. **Save and Deploy**. Agrega la dirección publicada (`https://xxx.pages.dev` o tu dominio) en Supabase → **Authentication → URL Configuration** (*Site URL* y *Redirect URLs*).

`public/_redirects` hace que las rutas de la app (`/panel`, `/activos/…`) funcionen al recargar, y `public/_headers` agrega cabeceras de seguridad (CSP, HSTS, anti-iframe). Si agregas servicios externos (otra fuente, analítica), súmalos a la `Content-Security-Policy` de ese archivo.

## Seguridad

- **Aislamiento entre empresas:** Row Level Security en todas las tablas; cada consulta solo ve las filas de las organizaciones del usuario. Probado en `supabase/tests/`.
- **Roles:** administrador (todo), operador (registrar, procesar, trasladar, dar de baja), lector (solo consultar). Una organización no puede quedar sin administrador.
- **Columnas protegidas:** contadores, fechas de baja e historial solo los modifican las funciones de la base de datos; el historial (`eventos`) no se puede editar ni borrar.
- **Invitaciones:** código secreto de un solo uso, ligado al correo invitado.
- **Validaciones en la base de datos:** largos máximos, logo solo como imagen incrustada, coherencia entre estado "de baja" y su fecha.
- **Frontend:** solo usa la clave pública de Supabase; redirecciones del login limitadas a rutas internas; cabeceras de seguridad en `public/_headers`.

## Modelo de datos

| Tabla | Contenido |
|---|---|
| `organizaciones` | Empresa cliente: nombre, logo, color |
| `miembros` | Usuario de Supabase Auth ↔ organización, con su rol |
| `invitaciones` | Invitaciones pendientes: correo, rol y código secreto del enlace |
| `ubicaciones` | Lugares; `es_almacen = true` significa bodega propia (los activos ahí cuentan como disponibles) |
| `tipos_activo` | Categorías con `vida_util` (máximo de procesos) y `campos` personalizados en JSON |
| `tipos_evento` | Procesos configurables (Lavado, Mantención…) |
| `activos` | Cada unidad: código único por organización, tipo, ubicación, estado, atributos, contador de procesos |
| `eventos` | Historial inmutable: registro, proceso, traslado, edición, baja |

Las operaciones por lote son funciones SQL (`registrar_activos`, `registrar_proceso`, `trasladar_activos`, `dar_de_baja`, `estadisticas`, `serie_mensual`, `crear_organizacion`, `aceptar_invitacion`) que la app llama con `db.rpc()`.
