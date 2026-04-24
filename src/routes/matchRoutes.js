const express = require('express');
const matchController = require('../controllers/matchController');
const protect = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/analyze', matchController.analyzeMatch);
router.get('/history', matchController.getMatchHistory);
router.get('/:id', matchController.getMatchResult);

module.exports = router;