# Demo API Management - Ventas

Frontend pequeño con React, Vite, JavaScript, CSS y fetch. La configuración de acceso se carga desde `import.meta.env.VITE_API_KEY`; no hay campos de credenciales en la interfaz.

## Arquitectura

```text
Cliente React -> AWS API Gateway -> /productos/{id} -> Inventory Service
                               -> /pedidos/{id}   -> Orders Service
```

Todas las consultas usan `https://j0g1u0cdn7.execute-api.us-east-2.amazonaws.com/demo` con el header `x-api-key`. Las redirecciones están bloqueadas. La interfaz muestra el resultado de las operaciones y su código HTTP.

## Ejecutar

Desde esta carpeta, con Node.js 22.12 o superior:

```bash
npm ci
cp .env.example .env
# Configura VITE_API_KEY en .env antes de iniciar Vite.
npm run dev
```

Configura el valor de `VITE_API_KEY` en `.env`, que está ignorado por Git. `.env.example` solo contiene el nombre de la variable sin valor. No se imprime la clave ni se guarda en almacenamiento del navegador. Reinicia Vite después de cambiar la configuración.

Abre la dirección que muestra Vite (normalmente http://localhost:5173).

Las variables `VITE_*` se incorporan al frontend y son accesibles desde el navegador. Esta configuración es exclusivamente para la demostración universitaria y **no es una práctica segura para secretos en producción**. Referencia: [variables de entorno de Vite](https://vite.dev/guide/env-and-mode).

## Uso

- **Inventario:** los productos se cargan automáticamente. Selecciona “Gestionar” y reserva desde su tarjeta. “Crear producto” muestra el producto nuevo sin recargar.
- **Pedidos:** selecciona un pedido de la lista o crea uno nuevo. Agrega productos usando el selector del inventario, revisa sus items y total en soles, y confirma. El UUID completo se conserva internamente.
- Crear, reservar, agregar items y confirmar refrescan los datos relevantes automáticamente, sin polling. Si falla un refresco, se conserva el resultado de la escritura y se ofrece reintentar la lectura.
- Los resultados y errores aparecen junto al área correspondiente. Los resultados correctos muestran discretamente el código HTTP y AWS API Gateway.
- Inventario y Pedidos siguen siendo independientes. Ninguna acción en Pedidos reserva stock automáticamente.

## Ejemplos

- Producto: `100`.
- Pedido: `d975494b-3d64-4652-a872-0be4c19cc74b`.

Los recursos deben existir en los servicios.

## Operaciones

| Operación | Método y endpoint | Cuerpo JSON |
| --- | --- | --- |
| Listar productos | `GET /productos` | Sin cuerpo |
| Listar pedidos | `GET /pedidos` | Sin cuerpo |
| Consultar producto | `GET /productos/{id}` | Sin cuerpo |
| Crear producto | `POST /productos` | `productoId`, `nombre`, `stockDisponible` |
| Reservar stock | `POST /productos/{id}/reservar` | `cantidad` |
| Crear pedido | `POST /pedidos` | Sin cuerpo |
| Consultar pedido | `GET /pedidos/{id}` | Sin cuerpo |
| Agregar item | `POST /pedidos/{id}/items` | `productoId`, `cantidad`, `precioUnitario` |
| Confirmar pedido | `POST /pedidos/{id}/confirmar` | Sin cuerpo |

Los contratos se revisaron en `Escritorio/Micros/inventory-service/api/main.py`, su modelo de dominio y los controladores, DTO y dominio de `Escritorio/Micros/PedidoMService`. No se modificaron los microservicios.

Crear un pedido devuelve su UUID y lo deja en el formulario para agregar items y confirmarlo. Solo se puede confirmar un pedido pendiente con items. La reserva de inventario es una operación independiente: confirmar un pedido no reserva stock automáticamente en estos servicios.

Los campos enteros del frontend se limitan al rango seguro de JavaScript para no redondear IDs o cantidades. La cantidad de un item también respeta el máximo de Integer de Java.

## Verificación

`npm test` verifica los nueve contratos y el manejo de errores usando fetch simulado; no crea datos ni consume servicios reales. `npm run build` verifica la compilación.

## Proyecto local

El proyecto se encuentra en `~/Escritorio/demo-api-management-ventas`. Usa Node.js 22 (`.nvmrc`). La demo se ejecuta localmente con `npm run dev`; no se configura CI/CD.
