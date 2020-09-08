'use strict';

/**
 * Encapsulates functionality provided by the buff website.
 * @module buff
 */

const fs = require('fs');
const cacheManager = require('cache-manager');
const fsCache = require('cache-manager-fs');

const fx = require('./fx');

const CACHE_DIR = 'cache';

fs.mkdirSync(CACHE_DIR, {recursive: true});

const idCache = cacheManager.caching({
    store: fsCache, options: {
        ttl: 365 * 24 * 60 * 60, // One year - no infinite available for fs cache
        path: CACHE_DIR + '/id'
    }
});

const priceCache = cacheManager.caching({
    store: fsCache, options: {
        ttl: 24 * 60 * 60, // One day
        path: CACHE_DIR + '/price'
    }
});

module.exports = function (sio) {
    const module = {};

    module.start = async (browser) => {
        await site.login(browser);
    }

    module.stop = async () => {
        await site.logout();
    }

    module.getOffer = async fullName => {
        return site.getOffer(fullName);
    }

    const site = {
        SEARCH_URL: 'https://buff.163.com/api/market/goods/buying?game=csgo&page_num=1&search=',
        LOOKUP_URL: 'https://buff.163.com/api/market/goods/buy_order?game=csgo&goods_id=',

        async getOffer(fullName) {
            const [name, spec] = fullName.split(' - ');
            let id = await idCache.wrap(name, () => this.getId(name));
            if (id === undefined) return {cnyBuffPrice: 0, usdBuffPrice: 0};
            if (spec !== undefined) id += ':' + spec;
            const cnyBuffPrice = await priceCache.wrap(id, () => this.findBestOffer(id));
            const usdBuffPrice = await fx.getUSDFromCNY(cnyBuffPrice);
            return {cnyBuffPrice, usdBuffPrice};
        },

        async getId(itemName) {
            const content = await this.page.evaluate(async uri => {
                const response = await fetch(encodeURI(uri));
                return await response.json();
            }, this.SEARCH_URL + itemName);
            const matchingItems = content.data.items.filter(item => item.name === itemName);
            return matchingItems.length > 0 ? matchingItems[0].id.toString() : undefined;
        },

        /**
         * Find the best offer on Buff for the item identified by key, which has the format id[:spec]. This is
         * defined as the highest price offered for the item so long as at least 3 items of this type are offered,
         * otherwise 0. Items with compatible 'specific' attributes are also considered.
         * @param key
         * @returns {Promise<Number>}
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
                        return topOffer;
                    } else {
                        return (topOffer + offers[1]) / 2;
                    }
                }
            }
            return 0;
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
