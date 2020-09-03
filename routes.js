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

router.get('/settings', async (req, res) => {
    const settings = await csgobot.getSettings();
    res.send(settings);
});


router.post('/settings', async (req, res) => {
    await csgobot.setSettings(req.body);
    res.end();
});
module.exports = router;
