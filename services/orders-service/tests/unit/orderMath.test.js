const { validateItems, mergeItems, calculateTotal, canChangeStatus } = require('../../src/utils/orderMath');

describe('shopping list checks', () => {
  test('a correct list passes', () => {
    expect(validateItems([{ productId: 1, quantity: 2 }])).toBeNull();
  });

  test.each([
    [undefined, 'non-empty'],
    [[], 'non-empty'],
    [[{ quantity: 1 }], 'productId'],
    [[{ productId: 'a', quantity: 1 }], 'productId'],
    [[{ productId: 1, quantity: 0 }], 'quantity'],
    [[{ productId: 1, quantity: 101 }], 'quantity'],
    [[{ productId: 1, quantity: 1.5 }], 'quantity'],
  ])('a bad list is rejected (%o)', (items, word) => {
    expect(validateItems(items)).toContain(word);
  });

  test('too many different products is rejected', () => {
    const items = Array.from({ length: 21 }, (_, i) => ({ productId: i + 1, quantity: 1 }));
    expect(validateItems(items)).toContain('at most');
  });
});

describe('joining repeated products', () => {
  test('the same product twice becomes one line', () => {
    expect(mergeItems([{ productId: 1, quantity: 2 }, { productId: 2, quantity: 1 }, { productId: 1, quantity: 3 }]))
      .toEqual([{ productId: 1, quantity: 5 }, { productId: 2, quantity: 1 }]);
  });
});

describe('total price', () => {
  test('adds price × quantity for every line', () => {
    expect(calculateTotal([{ unitPrice: 1200, quantity: 2 }, { unitPrice: 15.5, quantity: 3 }])).toBe(2446.5);
  });

  test('no decimal rounding mistakes', () => {
    expect(calculateTotal([{ unitPrice: 0.1, quantity: 1 }, { unitPrice: 0.2, quantity: 1 }])).toBe(0.3);
  });
});

describe('status changes', () => {
  test.each([
    ['pending', 'paid', true],
    ['pending', 'cancelled', true],
    ['paid', 'shipped', true],
    ['paid', 'cancelled', true],
    ['pending', 'shipped', false],
    ['shipped', 'cancelled', false],
    ['cancelled', 'paid', false],
  ])('%s → %s allowed: %s', (from, to, allowed) => {
    expect(canChangeStatus(from, to)).toBe(allowed);
  });
});
