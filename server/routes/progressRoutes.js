const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', progressController.getProgress);

module.exports = router;
