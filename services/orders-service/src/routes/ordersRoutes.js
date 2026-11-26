const express = require('express');
const controller = require('../controllers/ordersController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.post('/', controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.patch('/:id/cancel', controller.cancel);
router.patch('/:id/status', requireAdmin, controller.changeStatus);

module.exports = router;
