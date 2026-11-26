const { validateRegister, validateLogin } = require('../../src/utils/validate');

describe('form checks', () => {
  test('a correct sign-up form passes', () => {
    expect(validateRegister({ name: 'Sara', email: 'sara@test.com', password: 'secret123' })).toBeNull();
  });

  test.each([
    [{}, 'required'],
    [{ name: 'S', email: 'sara@test.com', password: 'secret123' }, 'name'],
    [{ name: 'Sara', email: 'not-an-email', password: 'secret123' }, 'email'],
    [{ name: 'Sara', email: 'sara@test.com', password: '123' }, 'password'],
  ])('a bad sign-up form is rejected (%o)', (form, word) => {
    expect(validateRegister(form)).toContain(word);
  });

  test('login needs both email and password', () => {
    expect(validateLogin({ email: 'sara@test.com' })).not.toBeNull();
    expect(validateLogin({ email: 'sara@test.com', password: 'x' })).toBeNull();
  });
});
