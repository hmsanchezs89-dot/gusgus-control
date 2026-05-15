# GUS GUS CONTROL PRO

Versión completa y estable para Supabase + Vercel.

## Qué incluye

- Caja funcional
- Productos
- Ventas
- Historial
- Gastos
- Compras
- Mermas
- Inventario básico
- Corte diario
- Corte semanal jueves-lunes
- SAT estimado
- Utilidad real
- Dinero no tocar
- Protección contra pantalla negra
- Datos demo si Supabase falla

## Variables en Vercel

En Vercel deben existir:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxx
```

Importante: la URL puede funcionar con o sin `/rest/v1/`, pero se recomienda sin `/rest/v1/`.

## Base de datos

Ejecuta el archivo:

`supabase-pro.sql`

en Supabase SQL Editor.
