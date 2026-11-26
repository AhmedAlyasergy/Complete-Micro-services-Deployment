const express = require('express');
const controller = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/me', requireAuth, controller.me);
router.get('/users', requireAuth, requireRole('admin'), controller.listUsers);
router.patch('/users/:id/role', requireAuth, requireRole('admin'), controller.changeRole);

module.exports = router;
