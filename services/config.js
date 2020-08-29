'use strict';

const config = {};

config.options = {};
config.steam = {};
config.log = {};

config.options.MIN_PRICE = 1;
config.options.MAX_PRICE = 5000;
config.options.ROI1 = 16;
config.options.ROI1_PRICE = 4;
config.options.ROI2 = 11;
config.options.ROI2_PRICE = 60;
config.options.BLACKLIST = ["sticker"];

config.steam.USERNAME = process.env.STEAM_USERNAME || 'username';
config.steam.PASSWORD = process.env.STEAM_PASSWORD || 'password';

config.log.debug = true;

module.exports = config;
