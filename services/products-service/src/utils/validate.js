function isNonNegativeNumber(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

function isNonNegativeInteger(v) {
  return Number.isInteger(v) && v >= 0;
}

function validateProduct(body = {}, { partial = false } = {}) {
  const { name, description, price, stock } = body;

  if (!partial && (name === undefined || price === undefined)) return 'name and price are required';
  if (partial && [name, description, price, stock].every((v) => v === undefined)) {
    return 'send at least one of: name, description, price, stock';
  }
  if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
    return 'name must be at least 2 characters';
  }
  if (description !== undefined && typeof description !== 'string') return 'description must be text';
  if (price !== undefined && !isNonNegativeNumber(price)) return 'price must be a number, 0 or more';
  if (stock !== undefined && !isNonNegativeInteger(stock)) return 'stock must be a whole number, 0 or more';
  return null;
}

// Limit is capped at 100 to keep list queries cheap.
function parsePaging(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  return { page, limit, offset: (page - 1) * limit };
}

module.exports = { validateProduct, parsePaging };
