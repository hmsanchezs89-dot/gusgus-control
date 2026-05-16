# GUS GUS CONTROL PRO+

Versión mejorada profesional.

## Mejoras incluidas

- Login demo con roles: admin, supervisor, empleado
- Permisos visuales por rol
- Caja del día: abrir/cerrar caja, fondo inicial, efectivo esperado, efectivo contado y diferencia
- Panel de reparto: ventas - costos - gastos = base real
- Reparto: 50% reinversión, 30% sueldo, 10% gastos fijos, 10% reserva
- Filtros por fecha
- Cancelación segura en productos en vez de borrar definitivo
- Gastos, compras, mermas con modificar/eliminar
- Estructura de recetas/escandallos preparada
- Inventario preparado para recetas
- Reportes resumidos para contador
- SAT estimado
- Historial/cortes más claros

## Antes de usar

Ejecuta `supabase-proplus.sql` en Supabase SQL Editor.

Después sube todos los archivos a GitHub y Vercel actualizará solo.


## PRO+ Profesional

Agregado en esta versión:

- Exportar reportes CSV.
- Tabla de auditoría.
- Movimientos de inventario.
- Función para descontar inventario por receta al cobrar.
- Preparación para escandallos reales por producto.

### Cómo usar recetas

En Supabase, tabla `recipes`:

- `product_id`: producto vendido.
- `inventory_id`: ingrediente a descontar.
- `cantidad`: cuánto descuenta por unidad vendida.

Ejemplo:
si Combo Antojo usa 250g de pollo, crea una receta:
product_id = Combo Antojo
inventory_id = Pollo
cantidad = 250

Al cobrar, la app intentará descontar esa cantidad automáticamente.
