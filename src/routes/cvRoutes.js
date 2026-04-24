const express = require('express');
const cvController = require('../controllers/cvController');
const protect = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.post('/upload', upload.single('cv'), cvController.uploadCV);
router.get('/history', cvController.getMyCVs);
router.get('/:id', cvController.getCV);

module.exports = router;