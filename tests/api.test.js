import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOperation } from '../src/operations.js';
import { BASE_URL, requestApi } from '../src/api.js';

const id = 'd975494b-3d64-4652-a872-0be4c19cc74b';
const values = { productoId: '100', nombre: 'Teclado', stockDisponible: '0', pedidoId: id, cantidad: '2', precio: '12.50', product: { productoId: 100, precio: 12.5, stockDisponible: 20 } };
const contracts = [
  ['listarProductos', 'GET', '/productos', undefined],
  ['listarPedidos', 'GET', '/pedidos', undefined],
  ['consultarProducto', 'GET', '/productos/100', undefined],
  ['crearProducto', 'POST', '/productos', { nombre: 'Teclado', precio: 12.5, stockDisponible: 0 }],
  ['reservarStock', 'POST', '/productos/100/reservar', { cantidad: 2 }],
  ['crearPedido', 'POST', '/pedidos', undefined],
  ['consultarPedido', 'GET', `/pedidos/${id}`, undefined],
  ['agregarItem', 'POST', `/pedidos/${id}/items`, { productoId: 100, cantidad: 2, precioUnitario: 12.5 }],
  ['confirmarPedido', 'POST', `/pedidos/${id}/confirmar`, undefined],
];

test('Los nueve contratos coinciden con los DTO y controladores y solo usan Gateway', async (t) => {
  for (const [action, method, endpoint, body] of contracts) {
    const operation = buildOperation(action, values);
    assert.equal(operation.method, method);
    assert.equal(operation.endpoint, endpoint);
    assert.deepEqual(operation.body, body);
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      assert.equal(url, BASE_URL + endpoint);
      assert.equal(options.method, method);
      assert.equal(options.headers['x-api-key'], 'fake-key-for-tests');
      assert.equal(options.redirect, 'error');
      assert.equal(options.credentials, 'omit');
      assert.equal(options.body, body === undefined ? undefined : JSON.stringify(body));
      assert.equal(options.headers['Content-Type'], body === undefined ? undefined : 'application/json');
      return new Response('{"ok":true}', { status: 201 });
    });
    let status;
    assert.deepEqual(await requestApi(operation, 'fake-key-for-tests', code => status = code), {ok: true});
    assert.equal(status, 201);
    t.mock.restoreAll();
  }
});

test('Valida entradas vacías, UUID, enteros, límites y precio antes de enviar', () => {
  for (const [action, changes] of [
    ['crearProducto', { nombre: '  ' }], ['crearProducto', { stockDisponible: '-1' }],
    ['consultarProducto', { productoId: '9007199254740993' }], ['reservarStock', { cantidad: '1.5' }],
    ['reservarStock', { cantidad: '0' }], ['consultarProducto', { productoId: '../pedidos' }],
    ['consultarPedido', { pedidoId: 'no-uuid' }], ['agregarItem', { cantidad: '2147483648' }],
    ['agregarItem', { product: { productoId: 100, precio: -1, stockDisponible: 20 } }], ['crearProducto', { precio: '' }],
    ['crearProducto', { precio: 'Infinity' }],
  ]) assert.throws(() => buildOperation(action, { ...values, ...changes }));
  assert.equal(buildOperation('agregarItem', { ...values, precioUnitario: '999' }).body.precioUnitario, 12.5);
});

test('Conserva códigos HTTP y mensajes del Gateway y los microservicios', async (t) => {
  for (const [status, body, expected] of [
    [403, {}, /No se pudo autorizar/],
    [429, {}, /límite de solicitudes/], [404, {}, /No encontramos/],
    [409, {error: 'Stock insuficiente'}, /Stock insuficiente/],
    [400, {error: 'JSON o identificador inválido'}, /Revisa los datos/],
    [422, {detail: [{msg: 'Invalid input'}]}, /Revisa los datos/],
    [500, 'Error interno', /No se pudo completar/],
  ]) {
    t.mock.method(globalThis, 'fetch', async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), {status}));
    let received;
    await assert.rejects(requestApi(buildOperation('crearPedido', {}), 'fake-key-for-tests', code => received = code), error => expected.test(error.message) && error.status === status && error.technical.includes(`HTTP ${status}`));
    assert.equal(received, status);
    t.mock.restoreAll();
  }
});

test('Bloquea destinos y métodos ajenos al contrato y claves vacías', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('No debe llamarse'); });
  for (const request of [
    {method:'GET',endpoint:'https://example.com'}, {method:'GET',endpoint:'/productos/../pedidos'},
    {method:'POST',endpoint:'/pedidos/invalid/items'}, {method:'DELETE',endpoint:'/productos/100'},
    {method:'GET',endpoint:'/productos/100?redirect=x'},
  ]) await assert.rejects(requestApi(request, 'fake-key-for-tests'));
  await assert.rejects(requestApi(buildOperation('crearPedido', {}), ''));
  assert.equal(fetch.mock.callCount(), 0);
});

test('Maneja red, respuestas vacías y oculta una clave reflejada por el servidor', async (t) => {
  const request = buildOperation('crearPedido', {});
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Network'); });
  await assert.rejects(requestApi(request, 'fake-key-for-tests'), error => /conectar/.test(error.message) && /CORS/.test(error.technical));
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => new Response(null, {status:204}));
  assert.equal(await requestApi(request, 'fake-key-for-tests'), '');
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => new Response('fake-key-for-tests'));
  assert.equal(await requestApi(request, 'fake-key-for-tests'), '[oculta]');
});
