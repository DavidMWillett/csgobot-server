'use strict';

const settings = require('./config').options;

module.exports = function (sio, buff) {
    const module = {};

    const BUFF_FEE = 0.025;
    let coinUsdValue = null;

    const minPrice = settings.MIN_PRICE;
    const maxPrice = settings.MAX_PRICE;
    const roi1 = settings.ROI1;
    const roi1Price = settings.ROI1_PRICE;
    const roi2 = settings.ROI2;
    const roi2Price = settings.ROI2_PRICE;
    const blacklist = settings.BLACKLIST;

    module.initialize = value => {
        coinUsdValue = value;
    };

    module.isWanted = async (name, price) => {
        sio.debug(`${name} Price: ${price} coins ≈ $${to2dp(price * coinUsdValue)}`);
        const {cnyBuffPrice, usdBuffPrice} = await getBuffPrice(name);
        sio.debug(`Buff buyer price for ${name}: ¥${cnyBuffPrice} ≈ $${to2dp(usdBuffPrice)}`);
        const usdBuyPrice = price * coinUsdValue;
        const roi = 100 * ((usdBuffPrice * (1 - BUFF_FEE)) / usdBuyPrice - 1);
        const minROI =
            usdBuyPrice <= roi1Price ? roi1 :
                usdBuyPrice >= roi2Price ? roi2 :
                    roi1 + usdBuyPrice * ((roi2 - roi1) / (roi2Price - roi1Price));
        if (isBlacklisted(name, blacklist) || usdBuyPrice < minPrice || usdBuyPrice > maxPrice || roi < minROI) {
            sio.debug('Skipping ' + info(name, price, usdBuyPrice, usdBuffPrice, roi));
            return false;
        }
        sio.info('Buying ' + info(name, price, usdBuyPrice, usdBuffPrice, roi));
        return true;
    };

    async function getBuffPrice(name) {
        sio.debug(`Checking buff buyer price for ${name}...`);
        return buff.getOffer(name);
    }

    const isBlacklisted = (name, blacklist) =>
        blacklist.find(it => name.toLowerCase().includes(it.toLowerCase())) !== undefined;

    const info = (name, coins, buy, sell, roi) =>
        `${name} Coins: ${coins} Buy: $${to2dp(buy)} Sell: $${to2dp(sell)} ROI: ${Math.round(roi)}%.`

    const to2dp = num => (Math.round(num * 100) / 100).toFixed(2);

    return module;
}
