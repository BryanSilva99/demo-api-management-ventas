// Contratos revisados en inventory-service/api/main.py y PedidoMService/api/{controller,dto}.
const productId = { name: 'productoId', label: 'Producto ID', type: 'number', min: 1, step: 1, max: Number.MAX_SAFE_INTEGER, placeholder: '100' };
const orderId = { name: 'pedidoId', label: 'Pedido ID', placeholder: 'd975494b-3d64-4652-a872-0be4c19cc74b' };
const quantity = { name: 'cantidad', label: 'Cantidad', type: 'number', min: 1, step: 1, max: Number.MAX_SAFE_INTEGER };

export const inventoryOperations = [
  { id: 'consultarProducto', label: 'Consultar producto', description: 'Busca un producto para revisar su stock disponible.', fields: [productId], success: 'Producto encontrado' },
  { id: 'crearProducto', label: 'Crear producto', description: 'Registra un producto con su stock inicial.', fields: [{ name: 'nombre', label: 'Nombre', placeholder: 'Nombre del producto' }, { name: 'precio', label: 'Precio de venta (S/)', type: 'number', min: 0.01, max: 9999999999.99, step: 0.01 }, { name: 'stockDisponible', label: 'Stock inicial', type: 'number', min: 0, step: 1, max: Number.MAX_SAFE_INTEGER }], success: 'Producto creado' },
  { id: 'reservarStock', label: 'Reservar stock', description: 'Reserva unidades de un producto. La cantidad se descontará del stock disponible.', fields: [productId, quantity], success: 'Stock reservado' },
];
export const orderOperations = [
  { id: 'crearPedido', label: 'Crear pedido', description: 'Crea un pedido vacío en estado PENDIENTE. Después podrás agregar sus items.', fields: [], success: 'Pedido creado' },
  { id: 'consultarPedido', label: 'Consultar pedido', description: 'Revisa el estado, el total y los items de un pedido.', fields: [orderId], success: 'Pedido encontrado' },
  { id: 'agregarItem', label: 'Agregar item', description: 'Agrega un producto a un pedido pendiente.', fields: [orderId, productId, { ...quantity, max: 2147483647 }], success: 'Item agregado' },
  { id: 'confirmarPedido', label: 'Confirmar pedido', description: 'Confirma un pedido pendiente que tenga al menos un item.', fields: [orderId], success: 'Pedido confirmado' },
];

function integer(value, label, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const text = String(value ?? '').trim();
  const number = Number(text);
  if (!text || !Number.isSafeInteger(number) || number < min || number > max) {
    throw new Error(`${label}: introduce un entero entre ${min} y ${max}.`);
  }
  return number;
}

function pedidoPath(value) {
  const id = String(value ?? '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Introduce un UUID válido para el pedido.');
  }
  return `/pedidos/${encodeURIComponent(id)}`;
}

export function buildOperation(action, values) {
  const productoId = () => integer(values.productoId, 'Producto ID');
  switch (action) {
    case 'listarProductos': return { method: 'GET', endpoint: '/productos' };
    case 'listarPedidos': return { method: 'GET', endpoint: '/pedidos' };
    case 'consultarProducto': return { method: 'GET', endpoint: `/productos/${productoId()}` };
    case 'crearProducto': {
      const nombre = String(values.nombre ?? '').trim();
      if (!nombre) throw new Error('Introduce el nombre del producto.');
      return { method: 'POST', endpoint: '/productos', body: { nombre, precio: validPrice(values.precio), stockDisponible: integer(values.stockDisponible, 'Stock inicial', 0) } };
    }
    case 'reservarStock': return { method: 'POST', endpoint: `/productos/${productoId()}/reservar`, body: { cantidad: integer(values.cantidad, 'Cantidad') } };
    case 'crearPedido': return { method: 'POST', endpoint: '/pedidos' };
    case 'consultarPedido': return { method: 'GET', endpoint: pedidoPath(values.pedidoId) };
    case 'agregarItem': {
      const item = saleItem(values.product, values.cantidad);
      return { method: 'POST', endpoint: `${pedidoPath(values.pedidoId)}/items`, body: item };
    }
    case 'confirmarPedido': return { method: 'POST', endpoint: `${pedidoPath(values.pedidoId)}/confirmar` };
    default: throw new Error('Operación desconocida.');
  }
}

export function validPrice(value) {
  if (typeof value !== 'number' && typeof value !== 'string') throw new Error('El producto debe tener un precio válido.');
  const price = Number(value);
  if (!String(value).trim() || !Number.isFinite(price) || price <= 0 || price > 9999999999.99 || Math.abs(price * 100 - Math.round(price * 100)) > 0.001)
    throw new Error('Introduce un precio mayor que cero con hasta dos decimales.');
  return price;
}
export function saleItem(product, quantity) {
  if (!product) throw new Error('Selecciona un producto.');
  const cantidad = integer(quantity, 'Cantidad', 1, 2147483647);
  if (!Number.isSafeInteger(product.stockDisponible) || product.stockDisponible < 0) throw new Error('Stock no disponible.');
  if (cantidad > product.stockDisponible) throw new Error('La cantidad supera el stock disponible.');
  return { productoId: integer(product.productoId, 'Producto ID'), cantidad, precioUnitario: validPrice(product.precio) };
}
export function saleSubtotal(product, quantity) {
  const item = saleItem(product, quantity);
  return Math.round(item.precioUnitario * 100) * item.cantidad / 100;
}
