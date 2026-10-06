import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saleItem, saleSubtotal, buildOperation, inventoryOperations, orderOperations } from '../src/operations.js';
import { money } from '../src/presentation.js';
const product = { productoId: 1, nombre: 'Coca Cola', precio: 4.5, stockDisponible: 20 };
test('Venta deriva el precio del catálogo y presenta subtotal en soles', () => {
  assert.deepEqual(saleItem(product, '2'), { productoId: 1, cantidad: 2, precioUnitario: 4.5 });
  assert.equal(money(saleSubtotal(product, '2')), 'S/ 9.00');
  assert.equal(money(saleSubtotal(product, '3')), 'S/ 13.50');
  assert.equal(saleSubtotal({...product, precio: 0.1}, 3), 0.3);
});
test('Rechaza producto ausente, cantidades inválidas, falta de stock y precios inválidos', () => {
  assert.throws(() => saleItem(null, 1), /Selecciona/);
  for (const qty of ['', 0, -1, 1.5, 2147483648]) assert.throws(() => saleItem(product, qty));
  assert.throws(() => saleItem(product, 21), /La cantidad supera el stock disponible\./);
  assert.throws(() => saleItem({...product, stockDisponible: 0}, 1), /stock disponible/);
  for (const precio of [undefined, null, '', 0, -1, NaN, Infinity, 'invalido', 1.001])
    assert.throws(() => saleItem({...product, precio}, 1));
});
test('Creación no solicita ID y agregar item no ofrece precio editable', () => {
  assert.deepEqual(inventoryOperations.find(op => op.id === 'crearProducto').fields.map(f => f.name), ['nombre', 'precio', 'stockDisponible']);
  assert.ok(!orderOperations.find(op => op.id === 'agregarItem').fields.some(f => f.name === 'precioUnitario'));
  assert.deepEqual(buildOperation('crearProducto', {nombre: 'Coca Cola', precio: '4.50', stockDisponible: 20}).body,
    {nombre: 'Coca Cola', precio: 4.5, stockDisponible: 20});
});
