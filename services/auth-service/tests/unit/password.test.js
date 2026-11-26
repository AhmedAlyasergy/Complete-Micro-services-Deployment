const { hashPassword, checkPassword } = require('../../src/utils/password');

describe('password safety', () => {
  test('the stored hash is not the real password', async () => {
    const hash = await hashPassword('secret123');
    expect(hash).not.toBe('secret123');
    expect(hash).not.toContain('secret123');
  });

  test('the right password matches, a wrong one does not', async () => {
    const hash = await hashPassword('secret123');
    expect(await checkPassword('secret123', hash)).toBe(true);
    expect(await checkPassword('wrong-pass', hash)).toBe(false);
  });
});
