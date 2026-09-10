const express = require('express');
const router = express.Router();
const rewardsController = require('../controllers/rewardsController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/summary', rewardsController.getSummary);
router.get('/today-set', rewardsController.getTodaySet);
router.post('/complete-bonus-tile', rewardsController.completeBonusTile);
router.get('/punch-cards', rewardsController.getPunchCards);
router.post('/streak-protection', rewardsController.toggleStreakProtection);
router.get('/history', rewardsController.getHistory);
router.post('/redeem', rewardsController.redeemPerk);

module.exports = router;
