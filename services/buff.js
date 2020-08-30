'use strict';

/**
 * Encapsulates functionality provided by the buff website.
 * @module buff
 */

const storage = require('node-persist');
const nodeFetch = require('node-fetch');

module.exports = function (sio) {
    const module = {};

    module.start = async (browser) => {
        await site.login(browser);
        await cache.initialize();
    }

    module.stop = async () => {
        await site.logout();
    }

    module.getOffer = async fullName => {
        return site.getOffer(fullName);
    }

    const cache = {
        async initialize() {
            await storage.init({dir: 'storage'});
        },

        async get(key, liveGet) {
            let result = {[key]: await storage.getItem(key)};
            if (typeof result[key] !== 'undefined') {
                sio.debug(`Cache hit - found ${result[key]}.`)
            } else {
                sio.debug(`Key ${key} not in cache; fetching from live source...`)
                result = await liveGet(key);
                sio.debug(`Fetched ${result[key]}.`);
                storage.setItem(key, result[key]);
            }
            return result;
        },

        async timedGet(key, liveGet, ttl) {
            const stored = {[key]: await storage.getItem(key)};
            if (typeof stored[key] !== 'undefined') {
                const [value, time] = stored[key];
                sio.debug(`Cache hit - found ${value}.`);
                if (time > Date.now()) {
                    sio.debug(`Cache entry still valid.`);
                    return {[key]: value};
                } else {
                    sio.debug(`Cache entry expired.`);
                }
            } else {
                sio.debug(`Key ${key} not in cache.`)
            }
            sio.debug(`Fetching from live source...`);
            const result = await liveGet(key);
            sio.debug(`Fetched ${result[key]}.`);
            storage.setItem(key, [result[key], Date.now() + ttl])
            return result;
        }
    }

    const exchangeRatesApi = {
        CACHE_TTL: 24 * 60 * 60 * 1000, // One day

        async getUSDFromCNY(cny) {
            const result = await cache.timedGet('USD_CNY', this.getRateUSDCNY.bind(this), this.CACHE_TTL);
            return cny / result['USD_CNY'];
        },

        async getRateUSDCNY() {
            const response = await nodeFetch(encodeURI('https://api.exchangeratesapi.io/latest?base=USD'));
            const result = await response.json();
            return {'USD_CNY': result['rates']['CNY']};
        }
    }

    const site = {
        SEARCH_URL: 'https://buff.163.com/api/market/goods/buying?game=csgo&page_num=1&search=',
        LOOKUP_URL: 'https://buff.163.com/api/market/goods/buy_order?game=csgo&goods_id=',
        CACHE_TTL: 24 * 60 * 60 * 1000, // One day

        async getOffer(fullName) {
            const [name, spec] = fullName.split(' - ');
            let id = (await cache.get(name, this.getId.bind(this)))[name];
            if (id === undefined) return {cnyBuffPrice: 0, usdBuffPrice: 0};
            if (spec !== undefined) id += ':' + spec;
            const cnyBuffPrice = (await cache.timedGet(id, this.findBestOffer.bind(this), this.CACHE_TTL))[id];
            const usdBuffPrice = await exchangeRatesApi.getUSDFromCNY(cnyBuffPrice);
            return {cnyBuffPrice, usdBuffPrice};
        },

        async getId(itemName) {
            const content = await this.page.evaluate(async uri => {
                const response = await fetch(encodeURI(uri));
                return await response.json();
            }, this.SEARCH_URL + itemName);
            const matchingItems = content.data.items.filter(item => item.name === itemName);
            return {[itemName]: matchingItems.length > 0 ? matchingItems[0].id.toString() : undefined};
        },

        /**
         * Find the best offer on Buff for the item identified by key, which has the format id[:spec]. This is
         * defined as the highest price offered for the item so long as at least 3 items of this type are offered,
         * otherwise 0. Items with compatible 'specific' attributes are also considered.
         * @param key
         * @returns {Promise<{}>}
         */
        async findBestOffer(key) {
            const [id, spec] = key.split(':');
            const offers = [];
            let data = await this.fetchPageData(id, 1);
            const pageSize = data['page_size'];
            // Items are in price order; take the first one if there are at lease 3 items, otherwise 0
            for (let itemNum = 0; itemNum < data['total_count']; itemNum++) {
                if (itemNum > 0 && itemNum % pageSize === 0)
                    data = await this.fetchPageData(id, Math.floor(itemNum / pageSize) + 1);
                const item = data['items'][itemNum % pageSize];
                // Exclude items with incompatible 'specific' list
                if (item['specific'].length > 0 && item['specific'][0]['simple_text'] !== spec)
                    continue;
                offers.push(Number(item['price']));
                if (offers.length === 3) {
                    const topOffer = offers[0];
                    if (topOffer > 700) {
                        return {[key]: topOffer};
                    } else {
                        return {[key]: (topOffer + offers[1]) / 2};
                    }
                }
            }
            return {[key]: 0};
        },

        async fetchPageData(buffId, pageNum) {
            const content = await this.page.evaluate(async uri => {
                const response = await fetch(encodeURI(uri));
                return await response.json();
            }, this.LOOKUP_URL + buffId + '&page_num=' + pageNum);
            return content['data'];
        },

        async login(browser) {
            sio.info("Logging into Buff...");
            this.page = await browser.newPage();
            await this.page.goto('https://buff.163.com');

            const links = await this.page.$x('//a[text()="Login/Register"]');
            await links[0].click();
            const popupPromise = new Promise(resolve => this.page.once('popup', resolve));
            await this.page.click('p.login-other');
            const popup = await popupPromise;
            await popup.waitForSelector('#imageLogin');
            await Promise.all([
                this.page.waitForSelector('#navbar-user-name'),
                popup.click('#imageLogin')
            ]);
            sio.info("Logged into Buff.");
        },

        async logout() {
            await Promise.all([
                this.page.goto('https://buff.163.com/account/logout'),
                this.page.waitForNavigation()
            ]);
            sio.info("Logged out of Buff.");
        }
    }

    return module;
};
