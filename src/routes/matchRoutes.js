const express = require('express');
const matchController = require('../controllers/matchController');
const protect = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');
const { analyzeMatchSchema } = require('../validators/matchValidator');

const router = express.Router();

router.use(protect);

router.post('/analyze', validateRequest(analyzeMatchSchema), matchController.analyzeMatch);
router.get('/history', matchController.getMatchHistory);
router.get('/:id', matchController.getMatchResult);

module.exports = router;