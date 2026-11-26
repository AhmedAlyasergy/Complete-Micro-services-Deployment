const config = require('../config');

class ProductsError extends Error {
  constructor(message, status, details = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// All calls time out after PRODUCTS_TIMEOUT_MS; network failures become 503.
async function call(path, options = {}) {
  let res;
  try {
    res = await fetch(`${config.productsUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      signal: AbortSignal.timeout(config.productsTimeoutMs),
    });
  } catch {
    throw new ProductsError('Products service is unavailable, please try again', 503);
  }
  const body = res.status === 204 ? {} : await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function getProduct(id) {
  const { status, body } = await call(`/api/products/${id}`);
  if (status === 404) throw new ProductsError(`Product ${id} not found`, 400, { productId: id });
  if (status !== 200) throw new ProductsError('Products service error', 502);
  return body.product;
}

async function changeStock(id, change) {
  const { status, body } = await call(`/api/products/${id}/stock`, {
    method: 'PATCH',
    headers: { 'x-internal-key': config.internalApiKey },
    body: JSON.stringify({ change }),
  });
  if (status === 200) return body.product;
  if (status === 409) {
    throw new ProductsError(`Not enough stock for product ${id}`, 409, {
      productId: id,
      available: body.available,
    });
  }
  if (status === 404) throw new ProductsError(`Product ${id} not found`, 400, { productId: id });
  throw new ProductsError('Products service error', 502);
}

async function isHealthy() {
  try {
    const { status } = await call('/health');
    return status === 200;
  } catch {
    return false;
  }
}

module.exports = { getProduct, changeStock, isHealthy, ProductsError };
