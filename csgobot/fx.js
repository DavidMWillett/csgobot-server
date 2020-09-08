'use strict';

const fs = require('fs');
const nodeFetch = require('node-fetch');
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
    const result = await fxCache.wrap('USD_CNY', () => getRateUSDCNY());
    return cny / result;
}

async function getRateUSDCNY() {
    const response = await nodeFetch(encodeURI('https://api.exchangeratesapi.io/latest?base=USD'));
    const result = await response.json();
    return result['rates']['CNY'];
}

module.exports.getUSDFromCNY = getUSDFromCNY;
