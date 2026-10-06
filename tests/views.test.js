import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('Vistas conservan precio histórico, fallback y venta sin precio editable', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { SaleItemForm } = await server.ssrLoadModule('/src/components/SaleItemForm.jsx');
    const { default: Orders } = await server.ssrLoadModule('/src/views/Orders.jsx');
    const { default: Inventory } = await server.ssrLoadModule('/src/views/Inventory.jsx');
    const products = [{ productoId: 1, nombre: 'Coca Cola', precio: 5, stockDisponible: 20 }, {productoId: 2, nombre: 'Agotado', precio: 1, stockDisponible: 0}];
    const form = renderToStaticMarkup(React.createElement(SaleItemForm, {products, busy: false, submit: async () => true}));
    assert.match(form, /Precio unitario/);
    assert.match(form, /Stock disponible/);
    assert.match(form, /Subtotal/);
    assert.match(form, /Agotado · Sin stock/);
    assert.doesNotMatch(form, /<input[^>]*(precio|price)/);
    const model = { products, orders: [], order: {id: 'd975494b-3d64-4652-a872-0be4c19cc74b', estado: 'CONFIRMADO', total: 13.5, items: [
      {productoId: 1, cantidad: 2, precioUnitario: 4.5, subtotal: 9},
      {productoId: 99, cantidad: 1, precioUnitario: 4.5, subtotal: 4.5},
    ]}, loading: {}, errors: {}, busy: false };
    const history = renderToStaticMarkup(React.createElement(Orders, {model}));
    assert.match(history, /Coca Cola/);
    assert.match(history, /Producto #99/);
    assert.match(history, /S\/ 4\.50/);
    assert.doesNotMatch(history, /S\/ 5\.00/);
    const inventory = renderToStaticMarkup(React.createElement(Inventory, {model}));
    assert.match(inventory, /<th>Precio<\/th>/);
    assert.match(inventory, /S\/ 5\.00/);
  } finally { await server.close(); }
});
