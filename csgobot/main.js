'use strict';

const puppeteer = require('puppeteer');

module.exports = function (sio) {
    const module = {};

    const steam = require('./steam')(sio);
    const buff = require('./buff')(sio);
    const empire = require('./empire')(sio);
    const assessor = require('./assessor')(sio, buff);

    let browser = null;

    module.start = async () => {
        browser = await initialize();
        await steam.login(browser);
        await buff.start(browser);
        assessor.initialize(empire.COIN_USD_VALUE);
        await empire.start(browser, onNewItem);
    };

    async function initialize() {
        sio.info("Initializing...");
        return await puppeteer.launch({
            headless: true,
            slowMo: 0
        });
    }

    module.setSettings = async settings => {
        await assessor.setSettings(settings);
    };

    module.getSettings = async () => {
        return assessor.getSettings();
    };

    async function onNewItem(identifier, name, price) {
        if (await assessor.isWanted(name, price)) {
            empire.withdraw(identifier)
                .then(result => {
                    if (result['success'])
                        sio.success(`Successfully withdrew ${name} for ${price} coins!`);
                    else
                        sio.error(`Failed to withdraw ${name}: ${result['reason']}`);
                })
                .catch(error => {
                    sio.error(`Failed to withdraw item. Error: ${error} | ` +
                        'Likely caused when another user withdrew the item marginally faster than you.');
                });
        }
    }

    module.stop = async () => {
        await empire.stop();
        await buff.stop();
        await steam.logout();
        await shutdown(browser);
    };

    async function shutdown(browser) {
        sio.info("Shutting down...");
        await browser.close();
    }

    return module;
}
