import { useCallback, useEffect, useRef, useState } from "react";
import { requestApi } from "../api.js";
import { buildOperation } from "../operations.js";
import { upsert } from "../presentation.js";

// Un bloqueo inmediato evita dobles envíos incluso antes del siguiente render.
export function useSales() {
  const [products, setProducts] = useState(null);
  const [orders, setOrders] = useState(null);
  const [product, setProduct] = useState(null);
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [lastRequest, setLastRequest] = useState(null);
  const lock = useRef(false);
  const serial = useRef(0);
  const call = useCallback(async (action, values = {}) => {
    const operation = buildOperation(action, values);
    const token = ++serial.current;
    const info = {
      method: operation.method,
      endpoint: operation.endpoint,
      loading: true,
    };
    setLastRequest(info);
    try {
      const data = await requestApi(
        operation,
        import.meta.env.VITE_API_KEY ?? "",
        (status) => {
          info.status = status;
          if (token === serial.current) setLastRequest({ ...info });
        },
      );
      if (token === serial.current)
        setLastRequest({ ...info, loading: false, success: true });
      return data;
    } catch (error) {
      if (token === serial.current)
        setLastRequest({
          ...info,
          loading: false,
          error: error.message,
          technical: error.technical,
        });
      throw error;
    }
  }, []);
  const refresh = useCallback(
    async (kind) => {
      setLoading((current) => ({ ...current, [kind]: true }));
      try {
        const data = await call(
          kind === "products" ? "listarProductos" : "listarPedidos",
        );
        if (!Array.isArray(data))
          throw new Error("No pudimos interpretar la lista recibida.");
        (kind === "products" ? setProducts : setOrders)(data);
        setErrors((current) => ({ ...current, [kind]: null }));
        return true;
      } catch (error) {
        setErrors((current) => ({ ...current, [kind]: error.message }));
        return false;
      } finally {
        setLoading((current) => ({ ...current, [kind]: false }));
      }
    },
    [call],
  );
  useEffect(() => {
    refresh("products");
    refresh("orders");
  }, [refresh]);

  async function run(action, values = {}) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setFeedback(null);
    const inventory = [
      "crearProducto",
      "reservarStock",
      "consultarProducto",
    ].includes(action);
    const reading = action.startsWith("consultar");
    const kind = inventory ? "products" : "orders";
    try {
      const data = await call(action, action === "agregarItem"
        ? { ...values, product: products?.find(item => String(item.productoId) === String(values.productoId)) }
        : values);
      // Guardar primero la respuesta de escritura: un refresh fallido no la borra.
      if (inventory) {
        setProduct(data);
        setProducts((current) => upsert(current, data));
      } else {
        setOrder(data);
        setOrders((current) => upsert(current, data));
      }
      if (!reading) {
        const messages = {
          crearProducto: "Producto creado correctamente",
          reservarStock: "Stock reservado correctamente",
          crearPedido: "Venta iniciada. Agrega sus productos.",
          agregarItem: "Producto agregado al pedido",
          confirmarPedido: "Venta confirmada",
        };
        setFeedback({ success: messages[action] });
        await refresh(kind);
      }
      return true;
    } catch (error) {
      setFeedback({ error: error.message });
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    products,
    orders,
    product,
    order,
    busy,
    loading,
    errors,
    feedback,
    lastRequest,
    run,
    refresh,
  };
}
