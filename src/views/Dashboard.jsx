import { summary } from "../presentation.js";
import { LoadState } from "../components/Common.jsx";
import { OrderList } from "./Orders.jsx";
export default function Dashboard({ model, openOrder }) {
  return (
    <>
      <div className="metrics">
        {summary(model.products, model.orders).map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value ?? "—"}</strong>
          </div>
        ))}
      </div>
      <LoadState model={model} kind="products" />
      <LoadState model={model} kind="orders" />
      <section className="panel">
        <h2>Pedidos recientes</h2>
        <p className="muted">
          Vista rápida de hasta cinco pedidos. El servicio no informa fechas; se
          conserva el orden recibido.
        </p>
        <OrderList
          orders={model.orders?.slice(0, 5)}
          busy={model.busy}
          openOrder={openOrder}
        />
      </section>
    </>
  );
}
