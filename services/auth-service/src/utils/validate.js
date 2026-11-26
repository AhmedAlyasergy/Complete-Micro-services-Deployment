const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister({ name, email, password } = {}) {
  if (!name || !email || !password) return 'name, email and password are required';
  if (typeof name !== 'string' || name.trim().length < 2) return 'name must be at least 2 characters';
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) return 'email is not valid';
  if (typeof password !== 'string' || password.length < 8) return 'password must be at least 8 characters';
  return null;
}

function validateLogin({ email, password } = {}) {
  if (!email || !password) return 'email and password are required';
  return null;
}

module.exports = { validateRegister, validateLogin };
