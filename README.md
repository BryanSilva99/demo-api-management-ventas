# Mini aplicación de gestión de ventas e inventario

MVP interno con React + Vite + JavaScript + CSS propio + fetch. Permite consultar productos, reservar inventario y gestionar ventas desde una SPA con tres vistas. También sirve como frontend de una arquitectura de API Management para una exposición universitaria.

## Arquitectura

```text
React/Vite
    |
    v
AWS API Gateway
   |          |
   v          v
Orders      Inventory
```

Todas las solicitudes pasan exclusivamente por la URL de AWS API Gateway definida en `src/api.js`. Se usa el header `x-api-key`, se bloquean redirecciones y se admiten únicamente los nueve contratos existentes. No hay autenticación simulada ni llamadas directas a los microservicios.

## Ejecutar

Con Node.js 22.12 o superior:

```bash
npm ci
cp .env.example .env
# Configura VITE_API_KEY en .env
npm run dev
```

La clave se lee de `import.meta.env.VITE_API_KEY`. `.env` está ignorado por Git; `.env.example` contiene únicamente la variable vacía. Nunca se muestra la clave, se imprime ni se guarda en localStorage. Reinicia Vite después de cambiar la configuración. Las variables `VITE_*` se incorporan al bundle del navegador: este mecanismo de acceso es aceptable exclusivamente para esta demostración universitaria.

## Flujos

- **Dashboard:** totales de productos, unidades disponibles, pedidos pendientes y confirmados, y suma de ventas confirmadas. Los valores desconocidos se muestran con «—». La sección de pedidos recientes conserva el orden recibido: el contrato no proporciona fechas y no se puede verificar su cronología.
- **Nueva venta:** crea un pedido pendiente, selecciona un producto, introduce cantidad, agrega al pedido, revisa el detalle y total, y confirma. El precio se obtiene del catálogo y se muestra junto con stock y subtotal en tiempo real. No hay campo de precio editable.
- **Pedidos / Ventas:** lista filtrable por Todos / Pendientes / Confirmados, selección de pedidos y consulta por UUID. Las ventas confirmadas se presentan para lectura.
- **Productos / Inventario:** lista con nombre, ID, precio y stock; detalle mediante consulta individual; formulario de creación y reserva explícita. Sin stock = 0, stock bajo = 1–5 y disponible > 5.
- **Estado de API:** panel discreto con método, endpoint, estado y código HTTP de la última petición iniciada, además de detalles secundarios de errores. Explica API Key, CORS y rate limiting como configuración, sin fabricar métricas ni verificar remotamente esa configuración.

**Confirmar un pedido no reserva automáticamente inventario; ambos microservicios permanecen independientes.** Agregar productos tampoco reserva unidades. La UI impide cantidades superiores al stock disponible y productos sin precio válido; el backend sigue siendo la autoridad final.

Las escrituras actualizan primero los datos de la respuesta y luego refrescan su lista. Si falla esa lectura posterior, se conserva el resultado exitoso y se ofrece reintentar. Los formularios conservan sus valores ante errores y bloquean envíos mientras se procesa una operación. No hay polling, fechas inventadas ni precios inventados.

Crear una venta genera inmediatamente un pedido vacío persistente. Los contratos no incluyen cancelación, eliminación ni edición de items; esas acciones no se simulan en la interfaz.

## Contratos conservados

| Operación | Método y endpoint | Cuerpo JSON |
| --- | --- | --- |
| Listar productos | `GET /productos` | Sin cuerpo |
| Consultar producto | `GET /productos/{id}` | Sin cuerpo |
| Crear producto | `POST /productos` | `nombre`, `precio`, `stockDisponible` |
| Reservar stock | `POST /productos/{id}/reservar` | `cantidad` |
| Listar pedidos | `GET /pedidos` | Sin cuerpo |
| Consultar pedido | `GET /pedidos/{id}` | Sin cuerpo |
| Crear pedido | `POST /pedidos` | Sin cuerpo |
| Agregar item | `POST /pedidos/{id}/items` | `productoId`, `cantidad`, `precioUnitario` |
| Confirmar pedido | `POST /pedidos/{id}/confirmar` | Sin cuerpo |

Se mantiene la validación de UUID, enteros seguros de JavaScript, cantidad de items dentro del rango Integer y precios finitos positivos con hasta dos decimales. Los contratos siguen definidos en `operations.js`; transporte y errores HTTP permanecen en `api.js`. Inventory genera el ID y persiste el precio. Orders mantiene su contrato.

## Organización y validación

- `App.jsx`: navegación, feedback y panel técnico.
- `views/`: Dashboard, Inventory y Orders.
- `components/Common.jsx`: formularios, estados, badges y modal nativo accesible.
- `hooks/useSales.js`: datos compartidos, operaciones, bloqueo de envíos y refrescos.
- `presentation.js`: cálculos y formatos de presentación.

```bash
npm test
npm run build
```

Los tests usan fetch simulado y verifican contratos, errores, protección de destinos y claves, límites de stock, cálculos del dashboard y actualización de recursos. No consumen servicios reales ni generan datos en ellos.

## Modelo y flujo de precios

Producto: `productoId` generado automáticamente por SQLite, `nombre`, `precio`,
`stockDisponible`. Crear solicita únicamente nombre, precio de venta y stock inicial;
el ID procede de la respuesta. Tras crear se cierra el modal y se refresca el inventario.

Crear producto → Inventory genera ID.
Nueva venta → React obtiene producto + precio de Inventory → usuario selecciona
cantidad → React envía productoId + cantidad + precioUnitario a Orders → Orders
conserva precioUnitario como precio histórico de la venta.

Inventory mantiene el precio actual del catálogo. Orders conserva el precio unitario aplicado en cada pedido.
Confirmar un pedido no reserva automáticamente stock.
La reserva de stock se realiza por separado en Inventario.

`SaleItemForm` muestra precio de solo lectura, stock y subtotal. `useSales` busca el
producto en el catálogo recibido antes de construir la operación; no usa un precio
escrito por el usuario. El detalle histórico siempre usa `item.precioUnitario` y mantiene
el fallback `Producto #ID` cuando no existe el producto. Las validaciones de stock son
por incorporación: no acumulan unidades de ítems previos ni garantizan stock concurrente.

POST /productos:
```json
{"nombre":"Coca Cola 500 ml","precio":4.50,"stockDisponible":20}
```
GET /productos:
```json
[{"productoId":1,"nombre":"Coca Cola 500 ml","precio":4.50,"stockDisponible":20}]
```
El precio se recibe y envía como número JSON, no como cadena.
Antes de desplegar React, actualiza Inventory y sigue su README para la SQLite antigua.
AWS API Gateway HTTP proxy no requiere nuevas rutas ni cambios si pasa JSON directamente.
Si hay validadores o plantillas de mapeo, deben revisarse manualmente. No se cambiaron
API Gateway ni Cloudflare Tunnel.
