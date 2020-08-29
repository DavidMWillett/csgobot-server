var express = require('express');
var logger = require('morgan');
var cors = require('cors');

var apiRouter = require('./routes/api');
var sio = require('./sio');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.use('/api', apiRouter);
app.set('sio', sio);

module.exports = app;
