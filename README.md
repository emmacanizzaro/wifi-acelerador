# Wifi Acelerator

Aplicacion de escritorio (Electron + React + TypeScript) para monitoreo y optimizacion real de red WiFi domestica.

## Stack

- Electron
- React
- TypeScript (estricto)
- TailwindCSS
- Node.js + Express
- Socket.IO
- Framer Motion
- Recharts
- Lucide React
- systeminformation, node-os-utils, ping, speedtest-net, node-wifi, arp-a (opcional)

## Arquitectura

```text
/frontend
  /src
    /components
    /context
    /hooks
    /layouts
    /pages
    /services
/backend
  /network
  /scanner
  /system
  /socket
  /services
/shared
  /types
  /constants
  /utils
/electron
```

## MVP Incluye

- Dashboard en tiempo real (download, upload, ping, jitter, health score, estado global, dispositivos, uso estimado)
- Graficos en vivo (Recharts)
- Escaner de red LAN con estado online/offline
- Deteccion de procesos con actividad de red (estimada)
- Herramientas de optimizacion local:
  - Flush DNS
  - Renovar IP
  - Limpiar cache de red
  - Reiniciar adaptador
  - Test de velocidad
- Acelerator Insights local con recomendaciones inteligentes sin APIs externas

## Instalacion

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Esto levanta en paralelo:

- Frontend (Vite) en puerto 5173
- Backend (Express + Socket.IO) en puerto 4000
- Electron apuntando a Vite

## Typecheck

```bash
npm run typecheck
```

## Build

```bash
npm run build
```

Salida:

- dist/frontend
- dist/backend
- dist/electron

## Ejecutar build local

```bash
npm run start
```

## Empaquetar

```bash
npm run package
```

Genera instaladores para:

- macOS (DMG)
- Windows (NSIS)

## Notas de permisos y plataforma

- Varias acciones de optimizacion requieren permisos elevados (sudo/admin).
- Algunos nombres de interfaz pueden variar por equipo (ej. en0 en macOS).
- `arp-a` se define como dependencia opcional para evitar bloqueos de instalacion en entornos con Python moderno; hay fallback al comando del sistema `arp -a`.

## Escalado recomendado

1. Persistencia historica (SQLite/TimescaleDB local).
2. Politicas de alertas personalizadas y umbrales por perfil.
3. Deteccion avanzada por modelo local (tiny ML on-device).
4. Modulo de control parental/QoS asistido (sin bloqueo automatico inicial).
5. Telemetria anonimizada opt-in para evolucion SaaS.
