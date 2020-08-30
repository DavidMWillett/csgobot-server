'use strict';

const fetch = require('node-fetch');

module.exports = function (sio) {
    const module = {};

    module.COIN_USD_VALUE = 0.6037;

    module.start = async (browser, onNewItem) => {
        await site.login(browser);
        await site.initialize(onNewItem);
    }

    module.stop = async () => {
        await site.terminate();
        await site.logout();
    }

    module.withdraw = async identifier => {
        return await site.withdraw(identifier);
    }

    const site = {
        async login(browser) {
            sio.info("Logging into CSGO Empire...");
            this.page = await browser.newPage();
            await this.page.goto('https://csgoempire.com/login');
            await Promise.all([
                this.page.click('input[value="Sign In"]'),
                this.page.waitForNavigation()
            ]);
            sio.info("Logged into CSGO Empire.");
        },

        async logout() {
            await this.page.goto('https://csgoempire.com/logout');
            sio.info("Logged out of CSGO Empire.");
        },

        async initialize(onNewItem) {
            this.onNewItem = onNewItem;

            await this.page.goto('https://csgoempire.com/withdraw#730');

            this._setSecurityToken().then();
            this.timeout = setInterval(() => {
                this._setSecurityToken().then()
            }, 4 * 60 * 1000);

            this.cdp = await this.page.target().createCDPSession();
            await this.cdp.send('Network.enable');
            await this.cdp.send('Page.enable');

            this.cdp.on('Network.webSocketFrameReceived', this._messageHandler.bind(this));
            sio.info("Awaiting items from CSGO Empire...");
        },

        _messageHandler(message) {
            const response = message.response;
            if (response.opcode === 1) {
                const [head, body] = this._cleave(response.payloadData);
                if (head === '42/notifications') {
                    const content = JSON.parse(body);
                    if (content[0] === 'p2p_new_item') {
                        const item = JSON.parse(content[1]);
                        this.onNewItem({id: item.id, bot_id: item.bot_id}, item.name, item.market_value / 100);
                    }
                }
            }
        },

        _cleave(payload) {
            const index = payload.indexOf(',');
            return [payload.substring(0, index), payload.substring(index + 1)];
        },

        async terminate() {
            await this.cdp.detach();
            clearInterval(this.timeout);
        },

        async _setSecurityToken() {
            this.securityToken = await this.page.evaluate(async () => {
                const uuid = localStorage.getItem('csgoempire:security:uuid');
                const response = await fetch('https://csgoempire.com/api/v2/user/security/token', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    credentials: 'include',
                    body: JSON.stringify({
                        'code': 4986,
                        'uuid': uuid
                    })
                });
                const body = await response.json();
                return body.token;
            });
        },

        async withdraw(identifier) {
            const result = await this.page.evaluate(async (identifier, token) => {
                const response = await fetch('https://csgoempire.com/api/v2/trade/withdraw', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    credentials: 'include',
                    body: JSON.stringify({
                        'item_ids': [identifier.id],
                        'bot_id': identifier.bot_id,
                        'security_token': token
                    })
                });
                return await response.json();
            }, identifier, this.securityToken);
            return result['success'] ? {success: 'ok'} : {reason: result['message']};
        }
    }
    return module;
};
