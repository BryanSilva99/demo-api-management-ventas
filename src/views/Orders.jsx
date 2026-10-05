import { useState } from "react";
import { money, shortId } from "../presentation.js";
import { Badge, LoadState, OperationForm } from "../components/Common.jsx";
export function OrderList({ orders, busy, openOrder, selected }) {
  if (orders?.length === 0)
    return <p className="empty">No hay pedidos para mostrar.</p>;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Estado</th>
            <th>Total</th>
            <th>
              <span className="visually-hidden">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {orders?.map((order) => (
            <tr
              key={order.id}
              className={selected === order.id ? "selected" : ""}
            >
              <td className="nowrap" title={order.id}>
                {shortId(order.id)}
              </td>
              <td>
                <Badge state={order.estado} />
              </td>
              <td className="nowrap">{money(order.total)}</td>
              <td>
                <button
                  disabled={busy}
                  aria-label={`Ver pedido ${order.id}`}
                  onClick={() => openOrder(order.id)}
                >
                  {order.estado === "PENDIENTE" ? "Continuar" : "Ver"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default function Orders({ model, openOrder }) {
  const [filter, setFilter] = useState("TODOS");
  const order = model.order;
  const pending = order?.estado === "PENDIENTE";
  return (
    <>
      <LoadState model={model} kind="orders" />
      <div className="workspace sales">
        <section className="panel">
          <h2>Pedidos</h2>
          <div className="filters" aria-label="Filtrar pedidos">
            {["TODOS", "PENDIENTE", "CONFIRMADO"].map((state, index) => (
              <button
                key={state}
                aria-pressed={filter === state}
                onClick={() => setFilter(state)}
              >
                {["Todos", "Pendientes", "Confirmados"][index]}
              </button>
            ))}
          </div>
          <OrderList
            orders={model.orders?.filter(
              (item) => filter === "TODOS" || item.estado === filter,
            )}
            busy={model.busy}
            openOrder={openOrder}
            selected={order?.id}
          />
          <details className="lookup">
            <summary>Consultar por ID</summary>
            <OperationForm
              action="consultarPedido"
              busy={model.busy}
              label="Consultar pedido"
              submit={(values) => model.run("consultarPedido", values)}
            />
          </details>
        </section>
        <section className="panel">
          {order ? (
            <>
              <div className="section-heading">
                <h2>{pending ? "Venta en curso" : "Detalle de venta"}</h2>
                <Badge state={order.estado} />
              </div>
              <p className="entity-id">{order.id}</p>
              {pending && (
                <section className="add-product">
                  <h3>Agregar producto</h3>
                  <LoadState model={model} kind="products" />
                  {model.products?.length ? (
                    <OperationForm
                      key={order.id}
                      action="agregarItem"
                      products={model.products}
                      fixed={{ pedidoId: order.id }}
                      busy={model.busy}
                      label="Agregar al pedido"
                      submit={(values) => model.run("agregarItem", values)}
                    />
                  ) : (
                    <p className="muted">
                      Necesitas productos disponibles en el catálogo de
                      Inventario.
                    </p>
                  )}
                </section>
              )}
              <h3>Detalle de venta</h3>
              {order.items?.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, index) => (
                        <tr key={index}>
                          <td>
                            {model.products?.find(
                              (product) =>
                                product.productoId === item.productoId,
                            )?.nombre ?? `Producto #${item.productoId}`}
                          </td>
                          <td>{item.cantidad}</td>
                          <td className="nowrap">
                            {money(item.precioUnitario)}
                          </td>
                          <td className="nowrap">
                            {money(
                              item.subtotal ??
                                item.cantidad * item.precioUnitario,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty">
                  Agrega el primer producto para comenzar esta venta.
                </p>
              )}
              <p className="total">
                <span>Total</span>
                <strong>{money(order.total)}</strong>
              </p>
              {pending && (
                <button
                  className="primary wide"
                  disabled={model.busy || !order.items?.length}
                  onClick={() =>
                    model.run("confirmarPedido", { pedidoId: order.id })
                  }
                >
                  Confirmar venta
                </button>
              )}
              <p className="muted independence">
                La reserva de stock se realiza por separado en Inventario.
                Confirmar esta venta no modifica el stock.
              </p>
            </>
          ) : (
            <p className="empty">
              Continúa un pedido pendiente o inicia una nueva venta.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
