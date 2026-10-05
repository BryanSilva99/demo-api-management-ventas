import { test } from "node:test";
import assert from "node:assert/strict";
import { money, stockState, summary, upsert } from "../src/presentation.js";

test("Stock: estados en los límites y datos ausentes sin inventar disponibilidad", () => {
  for (const [stock, label] of [
    [0, "Sin stock"],
    [1, "Stock bajo"],
    [5, "Stock bajo"],
    [6, "Disponible"],
    [undefined, "Stock no disponible"],
  ])
    assert.equal(stockState(stock).label, label);
});
test("Dashboard distingue ausencia de datos y calcula ventas solo confirmadas", () => {
  assert.deepEqual(
    summary(null, null).map(([, value]) => value),
    [undefined, undefined, undefined, undefined, null],
  );
  const values = summary(
    [{ stockDisponible: 0 }, { stockDisponible: 7 }],
    [
      { estado: "PENDIENTE", total: 100 },
      { estado: "CONFIRMADO", total: 30 },
      { estado: "CONFIRMADO", total: 20 },
    ],
  ).map(([, value]) => value);
  assert.deepEqual(values, [2, 7, 1, 2, money(50)]);
  assert.equal(summary([], [{ estado: "CONFIRMADO" }])[4][1], null);
  assert.equal(money(undefined), "—");
});
test("Resultados de escritura se integran sin duplicar ni perder otros recursos", () => {
  const existing = [
    { productoId: 1, stockDisponible: 8 },
    { productoId: 2, stockDisponible: 3 },
  ];
  const updated = upsert(existing, { productoId: 1, stockDisponible: 6 });
  assert.equal(updated.length, 2);
  assert.equal(updated[0].stockDisponible, 6);
  assert.equal(existing[0].stockDisponible, 8);
  assert.deepEqual(upsert(null, { id: "pedido" }), [{ id: "pedido" }]);
});
