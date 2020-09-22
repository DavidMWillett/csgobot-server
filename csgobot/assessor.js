'use strict';

const fx = require('./fx');

const settings = require('./config').options;

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD'});
const CNY = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY'});

module.exports = function (sio, buff) {
    const BUFF_FEE = 0.025;

    let coinUsdValue = undefined;

    let minPrice = settings.MIN_PRICE;
    let maxPrice = settings.MAX_PRICE;
    let roi1 = settings.ROI1;
    let roi1Price = settings.ROI1_PRICE;
    let roi2 = settings.ROI2;
    let roi2Price = settings.ROI2_PRICE;
    let blacklist = settings.BLACKLIST;

    const criteriaMetBy = async (name, price) => {
        const usdBuyPrice = price * coinUsdValue;
        sio.debug(`${name} Price: ${price} coins ≈ ${USD.format(usdBuyPrice)}`);
        const usdSellPrice = await getUSDSellPrice(name);
        const roi = 100 * ((usdSellPrice * (1 - BUFF_FEE)) / usdBuyPrice - 1);
        if (!isBlacklisted(name, blacklist)
            && usdBuyPrice >= minPrice && usdBuyPrice <= maxPrice
            && roi >= minROI(usdBuyPrice)) {
            sio.info('Buying ' + info(name, price, usdBuyPrice, usdSellPrice, roi));
            return true;
        } else {
            sio.debug('Skipping ' + info(name, price, usdBuyPrice, usdSellPrice, roi));
            return false;
        }
    };

    const getUSDSellPrice = async (name) => {
        sio.debug(`Checking buff buyer price for ${name}...`);
        const cnySellPrice = await buff.getSellPrice(name);
        const usdSellPrice = await fx.getUSDFromCNY(cnySellPrice);
        sio.debug(`Buff buyer price for ${name}: ${CNY.format(cnySellPrice)} ≈ ${USD.format(usdSellPrice)}`);
        return usdSellPrice;
    }

    const minROI = buyPrice =>
        buyPrice <= roi1Price ? roi1 :
            buyPrice >= roi2Price ? roi2 :
                roi1 + (buyPrice - roi1Price) * ((roi2 - roi1) / (roi2Price - roi1Price));

    const isBlacklisted = (name, blacklist) =>
        blacklist.find(it => name.toLowerCase().includes(it.toLowerCase())) !== undefined;

    const info = (name, coins, buy, sell, roi) =>
        `${name} Coins: ${coins} Buy: ${USD.format(buy)} Sell: ${USD.format(sell)} ROI: ${Math.round(roi)}%.`

    // Return module interface
    return {
        set coinUsdValue(value) {
            coinUsdValue = value;
        },
        get coinUsdValue() {
            return coinUsdValue;
        },
        set criteria(value) {
            minPrice = Number(value.minPrice);
            sio.info("New minimum price = " + minPrice);
            maxPrice = Number(value.maxPrice);
            sio.info("New maximum price = " + maxPrice);
            roi1 = Number(value.roi1);
            sio.info("New ROI 1 = " + roi1);
            roi1Price = Number(value.roi1Price);
            sio.info("New ROI 1 price = " + roi1Price);
            roi2 = Number(value.roi2);
            sio.info("New ROI 2 = " + roi2);
            roi2Price = Number(value.roi2Price);
            sio.info("New ROI 2 price = " + roi2Price);
            blacklist = value.blacklist.length > 0 ? value.blacklist.split(',') : [];
            sio.info("New blacklist = " + blacklist);
        },
        get criteria() {
            return {
                settings: {
                    minPrice,
                    maxPrice,
                    roi1,
                    roi1Price,
                    roi2,
                    roi2Price,
                    blacklist: blacklist.join(',')
                }
            }
        },
        criteriaMetBy
    }
}
