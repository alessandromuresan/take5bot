'use strict';

var Take5Bot = require('./take5bot');
var config = require('./config');

var take5Bot = new Take5Bot(config);

take5Bot.start();
