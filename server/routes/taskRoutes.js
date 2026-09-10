const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/today', taskController.getTodayTasks);
router.patch('/:id/complete', taskController.completeTask);
router.patch('/:id/miss', taskController.missTask);

module.exports = router;
