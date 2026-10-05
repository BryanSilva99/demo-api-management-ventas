import { useState } from "react";
import { useSales } from "./hooks/useSales.js";
import { Modal } from "./components/Common.jsx";
import Dashboard from "./views/Dashboard.jsx";
import Inventory from "./views/Inventory.jsx";
import Orders from "./views/Orders.jsx";

const pages = {
  dashboard: ["Dashboard", "El resumen de tus productos y ventas."],
  inventory: ["Productos / Inventario", "Disponibilidad y gestión de stock."],
  orders: ["Pedidos / Ventas", "Crea, continúa y confirma tus ventas."],
};
export default function App() {
  const model = useSales();
  const [page, setPage] = useState("dashboard");
  const [technical, setTechnical] = useState(false);
  const openOrder = async (id) => {
    setPage("orders");
    await model.run("consultarPedido", { pedidoId: id });
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>V</span>Ventas
        </div>
        <p className="sidebar-label">GESTIÓN INTERNA</p>
        <nav aria-label="Navegación principal">
          {Object.entries(pages).map(([key, [title]]) => (
            <button
              key={key}
              aria-current={page === key ? "page" : undefined}
              onClick={() => setPage(key)}
            >
              {title}
            </button>
          ))}
        </nav>
        <button className="api-button" onClick={() => setTechnical(true)}>
          Estado de API
        </button>
      </aside>
      <main>
        <header className="page-heading">
          <div>
            <h1>{pages[page][0]}</h1>
            <p className="muted">{pages[page][1]}</p>
          </div>
          <button
            className="primary"
            disabled={model.busy}
            onClick={async () => {
              setPage("orders");
              await model.run("crearPedido");
            }}
          >
            {model.busy ? "Procesando…" : "+ Nueva venta"}
          </button>
        </header>
        <div aria-live="polite">
          {model.feedback && (
            <p
              className={`notice ${model.feedback.error ? "error" : "success"}`}
              role={model.feedback.error ? "alert" : "status"}
            >
              {model.feedback.error ?? model.feedback.success}
            </p>
          )}
        </div>
        {model.busy && (
          <p className="muted" role="status">
            Procesando operación…
          </p>
        )}
        <div hidden={page !== "dashboard"}>
          <Dashboard model={model} openOrder={openOrder} />
        </div>
        <div hidden={page !== "inventory"}>
          <Inventory model={model} />
        </div>
        <div hidden={page !== "orders"}>
          <Orders model={model} openOrder={openOrder} />
        </div>
      </main>
      {technical && (
        <Modal title="Estado de API" onClose={() => setTechnical(false)}>
          <dl>
            <dt>API Management</dt>
            <dd>AWS API Gateway</dd>
            <dt>Acceso</dt>
            <dd>
              API Key mediante configuración de entorno; su valor no se muestra.
            </dd>
            <dt>CORS</dt>
            <dd>
              Configurado en API Gateway. El navegador aplica esta política; no
              se verifica su configuración desde aquí.
            </dd>
            <dt>Rate limiting</dt>
            <dd>
              Configurado en API Gateway; sin métricas consultables desde esta
              aplicación.
            </dd>
          </dl>
          <h3>Última petición iniciada</h3>
          {model.lastRequest ? (
            <dl>
              <dt>Método y endpoint</dt>
              <dd>
                {model.lastRequest.method} {model.lastRequest.endpoint}
              </dd>
              <dt>Código HTTP</dt>
              <dd>{model.lastRequest.status ?? "Sin respuesta HTTP"}</dd>
              <dt>Estado</dt>
              <dd>
                {model.lastRequest.loading
                  ? "En curso"
                  : (model.lastRequest.error ?? "Completada")}
              </dd>
              {model.lastRequest.technical && (
                <>
                  <dt>Detalle técnico</dt>
                  <dd>{model.lastRequest.technical}</dd>
                </>
              )}
            </dl>
          ) : (
            <p>No hay peticiones registradas.</p>
          )}
        </Modal>
      )}
    </div>
  );
}
