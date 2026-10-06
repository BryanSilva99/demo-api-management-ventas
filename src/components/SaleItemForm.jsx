import { useState } from "react";
import { saleItem, saleSubtotal } from "../operations.js";
import { money } from "../presentation.js";

export function SaleItemForm({ products, busy, submit }) {
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const product = products.find(item => String(item.productoId) === productoId);
  let error;
  let subtotal;
  try { subtotal = saleSubtotal(product, cantidad); }
  catch (failure) { error = failure.message; }
  return (
    <form onSubmit={async event => {
      event.preventDefault();
      if (error) return;
      saleItem(product, cantidad);
      if (await submit({ productoId, cantidad })) {
        setProductoId("");
        setCantidad("");
      }
    }}>
      <fieldset disabled={busy}>
        <legend className="visually-hidden">Agregar al pedido</legend>
        <div className="form-fields">
          <div className="product-field">
            <label htmlFor="sale-product">Producto</label>
            <select id="sale-product" required value={productoId} onChange={event => setProductoId(event.target.value)}>
              <option value="">Selecciona un producto</option>
              {products.map(item => <option key={item.productoId} value={item.productoId}>
                {item.nombre}{item.stockDisponible === 0 ? " · Sin stock" : ""}
              </option>)}
            </select>
          </div>
          <div><span>Precio unitario</span><p>{money(product?.precio)}</p></div>
          <div><span>Stock disponible</span><p>{product?.stockDisponible ?? "—"}</p></div>
          <div>
            <label htmlFor="sale-quantity">Cantidad</label>
            <input id="sale-quantity" type="number" required min="1" step="1" max={product?.stockDisponible ?? 2147483647} value={cantidad} onChange={event => setCantidad(event.target.value)} />
          </div>
          <div><span>Subtotal</span><p aria-live="polite">{money(subtotal)}</p></div>
        </div>
        {productoId && error && <p className="notice error" role="alert">{error}</p>}
        <button className="primary" type="submit" disabled={Boolean(error)}>{busy ? "Procesando…" : "Agregar al pedido"}</button>
      </fieldset>
    </form>
  );
}
