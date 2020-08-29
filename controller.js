const sio = require('./sio');
const csgobot = require('./services/csgobot')(sio);

async function start(req, res, next) {
    await csgobot.start();
    res.end();
}

async function stop(req, res, next) {
    await csgobot.stop();
    res.end();
}

module.exports = {
    start,
    stop
}
