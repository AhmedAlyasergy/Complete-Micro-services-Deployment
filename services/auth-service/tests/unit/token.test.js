const jwt = require('jsonwebtoken');
const { createToken, verifyToken } = require('../../src/utils/token');

describe('JWT tokens', () => {
  const user = { id: 7, email: 'sara@test.com', role: 'user' };

  test('a created token can be read back with the same details', () => {
    const data = verifyToken(createToken(user));
    expect(data.sub).toBe(7);
    expect(data.email).toBe('sara@test.com');
    expect(data.role).toBe('user');
  });

  test('a token signed with a different secret is rejected', () => {
    const fake = jwt.sign({ sub: 7, role: 'admin' }, 'hacker-secret');
    expect(() => verifyToken(fake)).toThrow();
  });

  test('an expired token is rejected', () => {
    const expired = jwt.sign({ sub: 7 }, process.env.JWT_SECRET, { expiresIn: -10 });
    expect(() => verifyToken(expired)).toThrow();
  });
});
