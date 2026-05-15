# GUS GUS CONTROL — Funcional con Supabase

## Variables en Vercel

Usa exactamente:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxx
```

> Recomendado: en VITE_SUPABASE_URL usa la URL base sin `/rest/v1/`.

## Base de datos

Ejecuta `supabase.sql` en Supabase SQL Editor.

## Funciones incluidas

- Carga productos desde Supabase.
- Permite crear productos.
- Agrega productos al carrito.
- Cobra y guarda venta real en tabla `sales`.
- Guarda detalle en `sale_items`.
- Muestra historial de ventas reales.
- Permite registrar gastos.
- Muestra gastos reales.
- Calcula IVA, RESICO, comisión, costos, utilidad y “no tocar”.
