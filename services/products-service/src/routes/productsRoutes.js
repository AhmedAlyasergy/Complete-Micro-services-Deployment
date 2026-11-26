const express = require('express');
const controller = require('../controllers/productsController');
const { requireAdmin, requireInternalOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', requireAdmin, controller.create);
router.put('/:id', requireAdmin, controller.update);
router.delete('/:id', requireAdmin, controller.remove);
router.patch('/:id/stock', requireInternalOrAdmin, controller.changeStock);

module.exports = router;
