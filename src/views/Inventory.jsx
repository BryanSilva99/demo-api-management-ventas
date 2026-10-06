import { useState } from "react";
import {
  Badge,
  LoadState,
  Modal,
  OperationForm,
} from "../components/Common.jsx";
import { money } from "../presentation.js";
export default function Inventory({ model }) {
  const [creating, setCreating] = useState(false);
  const selected =
    model.product &&
    (model.products?.find(
      (item) => item.productoId === model.product.productoId,
    ) ??
      model.product);
  return (
    <>
      <div className="section-heading">
        <p className="muted">
          Consulta productos y reserva unidades de forma explícita.
        </p>
        <button
          className="primary"
          disabled={model.busy}
          onClick={() => setCreating(true)}
        >
          + Crear producto
        </button>
      </div>
      <LoadState model={model} kind="products" />
      <div className="workspace">
        <section className="panel">
          <h2>Productos</h2>
          {model.products?.length === 0 && (
            <p className="empty">
              Aún no hay productos. Crea el primero para comenzar.
            </p>
          )}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th>
                    <span className="visually-hidden">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {model.products?.map((product) => (
                  <tr
                    key={product.productoId}
                    className={
                      selected?.productoId === product.productoId
                        ? "selected"
                        : ""
                    }
                  >
                    <td>
                      <strong>{product.nombre}</strong>
                      <small>ID #{product.productoId}</small>
                    </td>
                    <td className="nowrap">{money(product.precio)}</td>
                    <td>{product.stockDisponible}</td>
                    <td>
                      <Badge stock={product.stockDisponible} />
                    </td>
                    <td>
                      <button
                        disabled={model.busy}
                        onClick={() =>
                          model.run("consultarProducto", {
                            productoId: product.productoId,
                          })
                        }
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="lookup">
            <summary>Consultar por ID</summary>
            <OperationForm
              action="consultarProducto"
              busy={model.busy}
              label="Consultar producto"
              submit={(values) => model.run("consultarProducto", values)}
            />
          </details>
        </section>
        <aside className="panel">
          {selected ? (
            <>
              <h2>{selected.nombre}</h2>
              <p className="muted">Producto #{selected.productoId}</p>
              <p>Precio <strong>{money(selected.precio)}</strong></p>
              <Badge stock={selected.stockDisponible} />
              <p className="stock">
                Stock disponible <strong>{selected.stockDisponible}</strong>
              </p>
              <hr />
              <h3>Reservar unidades</h3>
              <p className="muted">
                Esta operación descuenta unidades del stock disponible.
              </p>
              {selected.stockDisponible > 0 ? (
                <OperationForm
                  key={selected.productoId}
                  action="reservarStock"
                  fixed={{ productoId: selected.productoId }}
                  busy={model.busy}
                  label="Reservar stock"
                  submit={(values) => model.run("reservarStock", values)}
                />
              ) : (
                <p className="empty">
                  No hay unidades disponibles para reservar.
                </p>
              )}
            </>
          ) : (
            <p className="empty">
              Selecciona un producto para consultar su stock y reservar
              unidades.
            </p>
          )}
        </aside>
      </div>
      {creating && (
        <Modal
          title="Crear producto"
          onClose={() => {
            if (!model.busy) setCreating(false);
          }}
        >
          <p className="muted">
            Registra nombre, precio de venta y stock inicial. El ID se genera automáticamente.
          </p>
          <OperationForm
            action="crearProducto"
            busy={model.busy}
            label="Guardar producto"
            submit={async (values) => {
              const ok = await model.run("crearProducto", values);
              if (ok) setCreating(false);
              return ok;
            }}
          />
          {model.feedback?.error && (
            <p className="notice error" role="alert">
              {model.feedback.error}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
