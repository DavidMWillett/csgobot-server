'use strict';

const express = require('express');
const logger = require('morgan');
const cors = require('cors');

const routes = require('./routes');
const sio = require('./sio');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(cors());

app.use('/api', routes);
app.set('sio', sio);

module.exports = app;
