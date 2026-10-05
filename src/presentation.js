export const money = (value) =>
  value == null || !Number.isFinite(Number(value))
    ? "—"
    : `S/ ${Number(value).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const shortId = (id) => `${id.slice(0, 6)}…${id.slice(-4)}`;
export function stockState(stock) {
  if (stock === 0) return { label: "Sin stock", tone: "danger" };
  if (stock >= 1 && stock <= 5) return { label: "Stock bajo", tone: "warning" };
  if (stock > 5) return { label: "Disponible", tone: "good" };
  return { label: "Stock no disponible", tone: "" };
}
export function upsert(current, item) {
  const id = item.id ?? item.productoId;
  const entries = current ?? [];
  return entries.some((entry) => (entry.id ?? entry.productoId) === id)
    ? entries.map((entry) =>
        (entry.id ?? entry.productoId) === id ? item : entry,
      )
    : [...entries, item];
}
export function summary(products, orders) {
  const confirmed = orders?.filter((order) => order.estado === "CONFIRMADO");
  return [
    ["Productos", products?.length],
    [
      "Stock disponible",
      products?.reduce((total, item) => total + item.stockDisponible, 0),
    ],
    [
      "Pedidos pendientes",
      orders?.filter((order) => order.estado === "PENDIENTE").length,
    ],
    ["Pedidos confirmados", confirmed?.length],
    [
      "Total vendido",
      confirmed &&
      confirmed.every(
        (item) => item.total != null && Number.isFinite(Number(item.total)),
      )
        ? money(
            confirmed.reduce((total, item) => total + Number(item.total), 0),
          )
        : null,
    ],
  ];
}
