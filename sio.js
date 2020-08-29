'use strict';

let socket = null;

function onConnect(sock) {
    console.log("A socket client connected.");
    socket = sock;
}

function debug(text) {
    socket.emit('debug', `${getTimestamp()} ${text}`);
}

function info(text) {
    socket.emit('info', `${getTimestamp()} ${text}`);
}

function success(text) {
    socket.emit('success', `${getTimestamp()} ${text}`);
}

function error(text) {
    socket.emit('errorMsg', `${getTimestamp()} ${text}`);
}

function getCode() {
    return new Promise((resolve) => {
        socket.emit('getCode', resolve);
    });
}

function getTimestamp() {
    const date = new Date();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    return `[${hours}:${minutes}:${seconds}:${milliseconds}]`;
}

module.exports = {
    onConnect, debug, info, success, error, getCode
};
