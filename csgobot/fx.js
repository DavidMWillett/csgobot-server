'use strict';

const fs = require('fs');
const { exchangeRates } = require('exchange-rates-api');
const cacheManager = require('cache-manager');
const fsCache = require('cache-manager-fs');

fs.mkdirSync('cache/fx', {recursive: true});

const fxCache = cacheManager.caching({
    store: fsCache, options: {
        ttl: 24 * 60 * 60, // One day
        path: 'cache/fx'
    }
});

async function getUSDFromCNY(cny) {
    return cny / await fxCache.wrap('USD_CNY', () =>
        exchangeRates().latest().base('USD').symbols('CNY').fetch());
}

module.exports.getUSDFromCNY = getUSDFromCNY;
