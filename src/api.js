export const BASE_URL = 'https://j0g1u0cdn7.execute-api.us-east-2.amazonaws.com/demo';

const errors = {
  403: 'No se pudo autorizar la operación. Contacta al responsable de la demo.',
  429: 'Se alcanzó temporalmente el límite de solicitudes. Intenta nuevamente en unos momentos.',
  404: 'No encontramos el producto o pedido solicitado. Revisa el identificador.',
};

// Único punto de acceso: únicamente las nueve rutas y métodos verificados.
export async function requestApi({ method, endpoint, body }, apiKey, onStatus = () => {}) {
  const uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
  const allowed = method === 'GET'
    ? new RegExp(`^/(productos(?:/[1-9][0-9]*)?|pedidos(?:/${uuid})?)$`)
    : method === 'POST' ? new RegExp(`^/(productos|productos/[1-9][0-9]*/reservar|pedidos|pedidos/${uuid}/(items|confirmar))$`) : null;
  if (!allowed?.test(endpoint)) throw new Error('Endpoint o método inválido.');
  const url = new URL(`${BASE_URL}${endpoint}`);
  if (url.href !== `${BASE_URL}${endpoint}`) throw new Error('Endpoint inválido.');
  const key = apiKey.trim();
  if (!key) throw Object.assign(new Error('El servicio aún no está configurado. Contacta al responsable de la demo.'), { technical: 'Configuración de acceso no disponible. No se envió ninguna petición.' });
  let response;
  try {
    response = await fetch(url.href, {
      method,
      headers: { 'x-api-key': key, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      redirect: 'error',
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch {
    throw Object.assign(new Error('No pudimos conectar con el servicio. Revisa tu conexión e intenta nuevamente.'), { technical: 'Sin respuesta HTTP. Posible error de red o CORS en AWS API Gateway.' });
  }
  onStatus(response.status);
  let text;
  try { text = await response.text(); }
  catch { throw Object.assign(new Error('No pudimos leer la respuesta del servicio. Consulta el recurso antes de repetir la operación.'), { technical: 'Error al leer la respuesta de AWS API Gateway.' }); }
  // Evita mostrar la clave incluso si un servidor la refleja en su respuesta.
  text = text.replaceAll(key, '[oculta]');
  let data = text;
  try { data = JSON.parse(text); } catch { /* Respuesta de texto o sin contenido. */ }
  if (!response.ok) {
    const detail = data && typeof data === 'object' ? data.error ?? data.message ?? data.detail ?? data : data;
    const description = typeof detail === 'object' ? JSON.stringify(detail) : detail || response.statusText;
    const message = errors[response.status] ?? (response.status === 409
      ? (typeof detail === 'string' && detail ? detail : 'No se puede completar la operación en el estado actual.')
      : response.status === 400 || response.status === 422
        ? 'Revisa los datos ingresados e intenta nuevamente.'
        : 'No se pudo completar la operación. Intenta nuevamente más tarde.');
    const technical = response.status === 429
      ? 'HTTP 429 Too Many Requests · AWS API Gateway Rate Limiting'
      : `HTTP ${response.status}: ${description}`;
    throw Object.assign(new Error(message), { technical, status: response.status });
  }
  return data;
}
