'use strict';

const timestamp = require('time-stamp');

let socket = null;

function onConnect(sock) {
    console.log("A socket client connected.");
    socket = sock;
}

function debug(text) {
    send('debug', text);
}

function info(text) {
    send('info', text);
}

function success(text) {
    send('success', text);
}

function error(text) {
    send('errorMsg', text);
}

function send(type, text) {
    socket.emit(type, `${timestamp('[HH:mm:ss:ms]')} ${text}`);
}

function getCode() {
    return new Promise((resolve) => {
        socket.emit('getCode', resolve);
    });
}

module.exports = {
    onConnect, debug, info, success, error, getCode
};
