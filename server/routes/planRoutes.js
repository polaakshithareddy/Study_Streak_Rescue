const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const { authMiddleware } = require('../middleware/auth');
const { createPlanValidationRules } = require('../middleware/validator');

router.use(authMiddleware);

router.post('/', createPlanValidationRules, planController.createPlanPreview);
router.post('/confirm', planController.confirmPlan);
router.post('/:id/confirm', planController.confirmPlan);
router.get('/active', planController.getActivePlan);
router.post('/:id/regenerate', planController.regeneratePlan);
router.put('/:id/busy-slots', planController.updateBusySlots);

module.exports = router;
