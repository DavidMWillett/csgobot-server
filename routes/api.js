var express = require('express');
var controller = require('../controller');
var router = express.Router();

router.post('/start', controller.start);
router.post('/stop', controller.stop);

module.exports = router;
