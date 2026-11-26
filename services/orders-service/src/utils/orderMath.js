const MAX_LINES = 20;
const MAX_QUANTITY = 100;
const STATUSES = ['pending', 'paid', 'shipped', 'cancelled'];

const NEXT_STATUS = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: [],
  cancelled: [],
};

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) return 'items must be a non-empty list';
  if (items.length > MAX_LINES) return `an order can have at most ${MAX_LINES} different products`;
  for (const item of items) {
    if (!item || !Number.isInteger(item.productId) || item.productId < 1) {
      return 'each item needs a productId (positive whole number)';
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) {
      return `each item needs a quantity between 1 and ${MAX_QUANTITY}`;
    }
  }
  return null;
}

function mergeItems(items) {
  const byId = new Map();
  for (const { productId, quantity } of items) {
    byId.set(productId, (byId.get(productId) || 0) + quantity);
  }
  return [...byId.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

// Calculated in cents to avoid floating-point rounding errors.
function calculateTotal(lines) {
  const cents = lines.reduce((sum, l) => sum + Math.round(l.unitPrice * 100) * l.quantity, 0);
  return cents / 100;
}

function canChangeStatus(from, to) {
  return (NEXT_STATUS[from] || []).includes(to);
}

module.exports = { validateItems, mergeItems, calculateTotal, canChangeStatus, STATUSES };
