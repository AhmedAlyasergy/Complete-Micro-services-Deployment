const { validateProduct, parsePaging } = require('../../src/utils/validate');

describe('product form checks', () => {
  test('a correct new product passes', () => {
    expect(validateProduct({ name: 'Laptop', price: 999.5, stock: 3 })).toBeNull();
  });

  test.each([
    [{ price: 10 }, 'required'],
    [{ name: 'L', price: 10 }, 'name'],
    [{ name: 'Laptop', price: -1 }, 'price'],
    [{ name: 'Laptop', price: '10' }, 'price'],
    [{ name: 'Laptop', price: 10, stock: -2 }, 'stock'],
    [{ name: 'Laptop', price: 10, stock: 1.5 }, 'stock'],
  ])('a bad new product is rejected (%o)', (form, word) => {
    expect(validateProduct(form)).toContain(word);
  });

  test('an update can send just one field', () => {
    expect(validateProduct({ price: 50 }, { partial: true })).toBeNull();
  });

  test('an empty update is rejected', () => {
    expect(validateProduct({}, { partial: true })).not.toBeNull();
  });
});

describe('paging', () => {
  test('defaults to page 1, 10 per page', () => {
    expect(parsePaging({})).toEqual({ page: 1, limit: 10, offset: 0 });
  });

  test('page 3 with 5 per page skips the first 10', () => {
    expect(parsePaging({ page: '3', limit: '5' })).toEqual({ page: 3, limit: 5, offset: 10 });
  });

  test('nobody can ask for more than 100 at once, or for bad numbers', () => {
    expect(parsePaging({ limit: '5000' }).limit).toBe(100);
    expect(parsePaging({ page: '-4', limit: 'abc' })).toEqual({ page: 1, limit: 10, offset: 0 });
  });
});
