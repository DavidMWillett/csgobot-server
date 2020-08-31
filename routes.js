'use strict';

const express = require('express');
const router = express.Router();

const sio = require('./sio');
const csgobot = require('./csgobot/main')(sio);

router.post('/start', async (req, res) => {
    await csgobot.start();
    res.end();
});

router.post('/stop', async (req, res) => {
    await csgobot.stop();
    res.end();
});

module.exports = router;
