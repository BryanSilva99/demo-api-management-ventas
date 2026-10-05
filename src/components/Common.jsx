import { useEffect, useRef, useState } from "react";
import { inventoryOperations, orderOperations } from "../operations.js";
import { stockState } from "../presentation.js";

export function Badge({ state, stock }) {
  const status =
    stock !== undefined
      ? stockState(stock)
      : {
          label: state,
          tone:
            state === "PENDIENTE"
              ? "warning"
              : state === "CONFIRMADO"
                ? "good"
                : "",
        };
  return <span className={`badge ${status.tone}`}>{status.label}</span>;
}
export function LoadState({ model, kind }) {
  return (
    <>
      {model.loading[kind] && (
        <p className="muted" role="status">
          Actualizando {kind === "products" ? "productos" : "pedidos"}…
        </p>
      )}
      {model.errors[kind] && (
        <div className="notice error" role="alert">
          {model.errors[kind]} La información anterior se conserva, si está
          disponible.{" "}
          <button
            disabled={model.loading[kind]}
            onClick={() => model.refresh(kind)}
          >
            Reintentar
          </button>
        </div>
      )}
    </>
  );
}
export function Modal({ title, onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="section-heading">
        <h2>{title}</h2>
        <button onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function OperationForm({
  action,
  fixed = {},
  busy,
  submit,
  products,
  label,
}) {
  const [values, setValues] = useState({});
  const fields = [...inventoryOperations, ...orderOperations]
    .find((operation) => operation.id === action)
    .fields.filter((field) => !(field.name in fixed));
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (await submit({ ...values, ...fixed })) setValues({});
      }}
    >
      <fieldset disabled={busy}>
        <legend className="visually-hidden">{label}</legend>
        <div className="form-fields">
          {fields.map(({ name, label: fieldLabel, ...attributes }) => (
            <div
              key={name}
              className={
                name === "productoId" && products ? "product-field" : ""
              }
            >
              <label htmlFor={`${action}-${name}`}>
                {name === "precioUnitario"
                  ? "Precio de venta (S/)"
                  : name === "productoId" && products
                    ? "Producto"
                    : fieldLabel}
              </label>
              {name === "productoId" && products ? (
                <>
                  <select
                    id={`${action}-${name}`}
                    required
                    value={values[name] ?? ""}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [name]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona un producto</option>
                    {products.map((product) => (
                      <option
                        key={product.productoId}
                        value={product.productoId}
                      >
                        {product.nombre} · #{product.productoId}
                      </option>
                    ))}
                  </select>
                  {values[name] && (
                    <span className="muted">
                      Stock disponible:{" "}
                      {products.find(
                        (product) =>
                          String(product.productoId) === values[name],
                      )?.stockDisponible ?? "—"}
                    </span>
                  )}
                </>
              ) : (
                <input
                  {...attributes}
                  id={`${action}-${name}`}
                  required
                  value={values[name] ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [name]: event.target.value,
                    }))
                  }
                />
              )}
            </div>
          ))}
        </div>
        <button className="primary" type="submit">
          {busy ? "Procesando…" : label}
        </button>
      </fieldset>
    </form>
  );
}
