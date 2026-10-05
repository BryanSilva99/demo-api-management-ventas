import { useEffect, useRef, useState } from 'react';
import { requestApi } from './api.js';
import { buildOperation, inventoryOperations, orderOperations } from './operations.js';

const apiKey = import.meta.env.VITE_API_KEY ?? '';
const operations = [...inventoryOperations, ...orderOperations];
const money = (value) => `S/ ${Number(value ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function useOperation() {
  const [request, setRequest] = useState(null);
  const inFlight = useRef(false);
  async function run(action, values, onSuccess) {
    if (inFlight.current) return false;
    inFlight.current = true;
    setRequest({ loading: true });
    try {
      const operation = buildOperation(action, values);
      setRequest({ method: operation.method, endpoint: operation.endpoint, loading: true });
      const data = await requestApi(operation, apiKey, (status) => {
        setRequest((current) => ({ ...current, status }));
      });
      await onSuccess(data);
      setRequest((current) => ({ ...current, loading: false, success: true }));
      return true;
    } catch (error) {
      setRequest((current) => ({ ...current, loading: false, error: error.message, technical: error.technical }));
      return false;
    } finally {
      inFlight.current = false;
    }
  }
  return { request, run, busy: Boolean(request?.loading) };
}

function RequestStatus({ request, quiet = false }) {
  if (!request) return null;
  return <div className="operation-feedback" aria-live="polite">
    {request.loading && <p className="muted">Procesando…</p>}
    {request.error && <p className="error" role="alert">{request.error}</p>}
    {request.success && !quiet && <p className="success-message">✓ Operación completada <span>HTTP {request.status} · vía AWS API Gateway</span></p>}
  </div>;
}

function useCollection(action) {
  const [data, setData] = useState(null);
  const operation = useOperation();
  const refresh = () => operation.run(action, {}, (items) => {
    if (!Array.isArray(items)) throw new Error('No se pudo interpretar la lista recibida.');
    setData(items);
  });
  useEffect(() => { refresh(); }, []);
  return { ...operation, data, refresh, update: (item) => setData((current) => {
    const id = item.id ?? item.productoId;
    const items = current ?? [];
    return items.some((entry) => (entry.id ?? entry.productoId) === id)
      ? items.map((entry) => (entry.id ?? entry.productoId) === id ? item : entry) : [...items, item];
  }) };
}

function OperationForm({ action, label, fixedValues = {}, onSubmit, busy, compact = false, products }) {
  const [values, setValues] = useState({});
  const operation = operations.find((item) => item.id === action);
  const fields = operation.fields.filter((field) => !(field.name in fixedValues));
  return <form onSubmit={async (event) => {
    event.preventDefault();
    if (await onSubmit({ ...values, ...fixedValues })) setValues({});
  }}>
    <fieldset disabled={busy}>
      <legend className="visually-hidden">{label}</legend>
      <div className={compact ? 'search-fields' : 'form-fields'}>
        {fields.map(({ name, label: fieldLabel, ...attributes }) => <label key={name} htmlFor={`${action}-${name}`}>
          {name === 'productoId' && products ? 'Producto' : fieldLabel}{name === 'productoId' && products ? <>
            <select id={`${action}-${name}`} required value={values[name] ?? ''}
              onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))}>
              <option value="">Selecciona un producto</option>
              {products.map((product) => <option key={product.productoId} value={product.productoId}>{product.nombre} (#{product.productoId})</option>)}
            </select>
            {values[name] && <span className="muted">Stock disponible: {products.find((product) => String(product.productoId) === values[name])?.stockDisponible ?? 'no disponible'}</span>}
          </> : <input {...attributes} id={`${action}-${name}`} name={name} required autoComplete="off"
            value={values[name] ?? ''} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} />}
        </label>)}
        {compact && <button className="primary-button" type="submit">{busy ? 'Procesando…' : label}</button>}
      </div>
      {!compact && <button className="primary-button" type="submit">{busy ? 'Procesando…' : label}</button>}
    </fieldset>
  </form>;
}

function PanelHeader({ inventory }) {
  return <header className="panel-header">
    <span className="panel-icon" aria-hidden="true">{inventory ? '▦' : '▤'}</span>
    <div><p className="eyebrow">{inventory ? 'PRODUCTOS Y STOCK' : 'GESTIÓN DE VENTAS'}</p>
      <h2 id={inventory ? 'inventory-title' : 'orders-title'}>{inventory ? 'Inventario' : 'Pedidos'}</h2></div>
  </header>;
}

function InventoryPanel({ catalog }) {
  const [product, setProduct] = useState(null);
  const [creating, setCreating] = useState(false);
  const [reserving, setReserving] = useState(false);
  const { request, run, busy: working } = useOperation();
  const busy = working || catalog.busy;
  const products = catalog.data ?? [];
  const selected = product && (products.find((item) => item.productoId === product.productoId) ?? product);
  async function saved(data) {
    setProduct(data); catalog.update(data); setCreating(false); setReserving(false);
    await catalog.refresh();
  }
  return <section className="service-card" aria-labelledby="inventory-title">
    <PanelHeader inventory />
    <p className="panel-description">Selecciona un producto para ver su disponibilidad o reservar unidades.</p>
    <fieldset disabled={busy}>
      <legend className="visually-hidden">Gestionar inventario</legend>
      <div className="order-actions"><h3 className="section-title">Productos</h3>
        <button className="text-button" type="button" aria-expanded={creating} onClick={() => setCreating(!creating)}>{creating ? 'Cancelar creación' : '+ Crear producto'}</button>
      </div>
      {creating && <div className="inline-form">
        <OperationForm action="crearProducto" label="Guardar producto" busy={busy} onSubmit={(values) => run('crearProducto', values, saved)} />
      </div>}
      {catalog.busy && <p role="status" className="muted">Cargando productos…</p>}
      {catalog.data?.length === 0 && <div className="empty-state"><p>No hay productos registrados.</p><button className="text-button" onClick={() => setCreating(true)}>Crear primer producto</button></div>}
      <ul className="record-list">{products.map((item) => <li key={item.productoId} className={selected?.productoId === item.productoId ? 'record-selected' : ''}>
        <div><strong>{item.nombre}</strong><span className="entity-id">ID #{item.productoId}</span><span className="muted">Stock disponible: {item.stockDisponible}</span></div>
        <button className="secondary-button" aria-label={`Gestionar ${item.nombre}`} onClick={() => { setReserving(false); run('consultarProducto', { productoId: item.productoId }, setProduct); }}>Gestionar</button>
      </li>)}</ul>
      {selected && <article className="entity-card">
        <h3>{selected.nombre}</h3><p className="entity-id">Producto #{selected.productoId}</p>
        <p className="stock-value">Stock disponible <strong>{selected.stockDisponible}</strong></p>
        <button className="secondary-button" type="button" aria-expanded={reserving} onClick={() => setReserving(!reserving)}>{reserving ? 'Cancelar reserva' : 'Reservar stock'}</button>
        {reserving && <div className="secondary-section"><p className="muted">La cantidad se descontará del stock disponible.</p>
          <OperationForm key={selected.productoId} action="reservarStock" label="Reservar unidades" busy={busy} fixedValues={{ productoId: selected.productoId }} onSubmit={(values) => run('reservarStock', values, saved)} />
        </div>}
      </article>}
    </fieldset>
    <RequestStatus request={request} />
    <RequestStatus request={catalog.request} quiet={Boolean(request)} />
    {catalog.request?.error && <button className="text-button" disabled={busy} onClick={catalog.refresh}>Reintentar carga de productos</button>}
  </section>;
}

function OrderItems({ items }) {
  if (!items?.length) return <p className="muted">El pedido aún no tiene productos. Agrega el primero para continuar.</p>;
  return <div className="table-scroll"><table>
    <caption className="visually-hidden">Items del pedido</caption>
    <thead><tr><th scope="col">Producto</th><th scope="col">Cantidad</th><th scope="col">Precio</th><th scope="col">Subtotal</th></tr></thead>
    <tbody>{items.map((item, index) => <tr key={index}>
      <td>{item.productoId}</td><td>{item.cantidad}</td><td>{money(item.precioUnitario)}</td><td>{money(item.subtotal)}</td>
    </tr>)}</tbody>
  </table></div>;
}

function OrdersPanel({ products, productsLoading }) {
  const [order, setOrder] = useState(null);
  const collection = useCollection('listarPedidos');
  const { request, run, busy: working } = useOperation();
  const detail = useOperation();
  const busy = working || collection.busy || detail.busy;
  const pending = order?.estado === 'PENDIENTE';
  const orders = collection.data ?? [];
  async function created(data) { setOrder(data); collection.update(data); await collection.refresh(); }
  async function updated(data) {
    setOrder(data); collection.update(data);
    await detail.run('consultarPedido', { pedidoId: data.id }, setOrder);
    await collection.refresh();
  }
  return <section className="service-card orders-card" aria-labelledby="orders-title">
    <PanelHeader />
    <p className="panel-description">Continúa un pedido pendiente o comienza una nueva venta.</p>
    <fieldset disabled={busy}>
      <legend className="visually-hidden">Gestionar pedidos</legend>
      <div className="order-actions"><h3 className="section-title">Pedidos</h3><button className="primary-button" type="button" onClick={() => run('crearPedido', {}, created)}>+ Nuevo pedido</button></div>
      {collection.busy && <p role="status" className="muted">Cargando pedidos…</p>}
      {collection.data?.length === 0 && <div className="empty-state"><p>No hay pedidos registrados.</p><button className="text-button" onClick={() => run('crearPedido', {}, created)}>Crear primer pedido</button></div>}
      <ul className="record-list">{orders.map((item) => <li key={item.id} className={order?.id === item.id ? 'record-selected' : ''}>
        <div><strong>Pedido {item.id.slice(0, 6)}…{item.id.slice(-4)}</strong>
          <span className={`state-badge ${item.estado === 'PENDIENTE' ? 'pending-badge' : ''}`}>{item.estado}</span><span>{money(item.total)}</span></div>
        <button className="secondary-button" aria-label={`Ver pedido ${item.id}`} onClick={() => detail.run('consultarPedido', { pedidoId: item.id }, setOrder)}>{item.estado === 'PENDIENTE' ? 'Continuar' : 'Ver'}</button>
      </li>)}</ul>
      {order && <article className="active-order">
        <div className="order-heading"><h3>Pedido</h3><span className={`state-badge ${pending ? 'pending-badge' : ''}`}>Estado: {order.estado}</span></div>
        <p className="entity-id">{order.id}</p>
        <section className="order-items"><h4>Items del pedido</h4><OrderItems items={order.items} /></section>
        <p className="order-total"><span>Total</span><strong>{money(order.total)}</strong></p>
        {pending && <section className="secondary-section">
          <h3 className="section-title">Agregar producto</h3>
          {productsLoading ? <p className="muted">Cargando productos…</p> : products?.length ?
            <OperationForm key={order.id} action="agregarItem" label="Agregar al pedido" busy={busy} products={products} fixedValues={{ pedidoId: order.id }} onSubmit={(values) => run('agregarItem', values, updated)} />
            : <p className="muted">{products ? 'Crea un producto en Inventario para agregarlo al pedido.' : 'Los productos no están disponibles. Reintenta su carga en Inventario.'}</p>}
          <button className="primary-button confirm-button" type="button" disabled={!order.items?.length} onClick={() => run('confirmarPedido', { pedidoId: order.id }, updated)}>Confirmar pedido</button>
          {!order.items?.length && <p className="muted">Agrega al menos un producto para confirmar.</p>}
        </section>}
        {order.estado === 'CONFIRMADO' && <p className="success-message">✓ Pedido confirmado</p>}
        <p className="independence-note">La reserva de stock se realiza por separado en Inventario.</p>
      </article>}
    </fieldset>
    <RequestStatus request={request} /><RequestStatus request={detail.request} quiet={Boolean(request)} /><RequestStatus request={collection.request} quiet={Boolean(request || detail.request)} />
    {detail.request?.error && order && <button className="text-button" disabled={busy} onClick={() => detail.run('consultarPedido', { pedidoId: order.id }, setOrder)}>Actualizar pedido seleccionado</button>}
    {collection.request?.error && <button className="text-button" disabled={busy} onClick={collection.refresh}>Reintentar carga de pedidos</button>}
  </section>;
}

export default function App() {
  const catalog = useCollection('listarProductos');
  return <>
    <header className="topbar"><div className="brand"><span className="brand-mark" aria-hidden="true">V</span>Ventas<span className="demo-badge">DEMO</span></div>
      <span className="gateway-indicator">API Management · AWS API Gateway</span></header>
    <main>
      <div className="page-heading"><p className="eyebrow">PANEL DE VENTAS</p>
        <h1>Gestiona tus ventas</h1><p>Productos disponibles y pedidos, en un solo lugar.</p>
      </div>
      <div className="panels"><InventoryPanel catalog={catalog} /><OrdersPanel products={catalog.data} productsLoading={catalog.busy} /></div>
      <footer>Demo API Management - Ventas · Demostración universitaria</footer>
    </main>
  </>;
}
