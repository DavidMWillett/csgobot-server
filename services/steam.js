'use strict';

const settings = require('./config').steam;

module.exports = function (sio) {
    const module = {};
    let page = null;

    module.login = async browser => {
        sio.info("Signing into Steam account...");
        page = (await browser.pages())[0];
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4182.0 Safari/537.36');
        await page.goto('https://steamcommunity.com/login');
        await page.type('#steamAccountName', settings.USERNAME);
        await page.type('#steamPassword', settings.PASSWORD);
        await page.click('#SteamLogin');

        sio.info("Authenticating...");
        await page.waitForSelector('div.newmodal', {visible: true});
        const code = await sio.getCode();
        await page.type('#twofactorcode_entry', String(code));
        await page.keyboard.press('Enter');
        await page.waitForNavigation();
        sio.info("Signed into Steam account.");
    };

    module.logout = async () => {
        await page.evaluate(async () => {
            Logout();
        });
        sio.info("Logged out of Steam account.");
    };

    return module;
}
