'use strict';

var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var lodash = Devebot.require('lodash');
var debug = Devebot.require('debug');
var assert = require('chai').assert;
var expect = require('chai').expect;
var path = require('path');
var util = require('util');
var debugx = debug('tdd:app:websocket:interceptor');
var io = require('socket.io-client');
var Loadsync = require('loadsync');

describe('appWebsocket:interceptor', function() {

	describe('Simple interceptor', function() {
		var app, client;
		var msgs = [];
		var counter = 0;
		var syncher = new Loadsync([{
			name: 'has_done',
			cards: ['greeting', 'voting']
		}]);

		before(function(done) {
			app = require(path.join(__dirname, '../app/index'));
			app.getSandboxService('websocketTrigger').then(function(service) {
				service.addInterceptor('example1', function(eventName, eventData, next) {
					debugx('eventData: %s', eventData);
					msgs.push(eventData);
					if (msgs.length >= 2) syncher.check('greeting', 'has_done');
				}, {
					eventPattern: 'greeting'
				});
				service.addInterceptor('example2', function(eventName, eventData, next) {
					debugx('eventData: %s', eventData);
					counter += eventData;
					if (counter >= 8) syncher.check('voting', 'has_done');
				}, {
					eventPattern: 'vot.*'
				});
				return service;
			}).then(lodash.ary(done, 0)).catch(lodash.ary(done, 1));
		});

		beforeEach(function(done) {
			msgs = [];
			counter = 0;
			app.server.start().then(function() {
				client = io.connect('http://localhost:7878/');
				done();
			});
		});

		it('the socket interceptor should intercept correct data', function(done) {
			client.emit('greeting', 'Hello world');
			client.emit('voter', 3);
			client.emit('greeting', 'From devebot');
			client.emit('voting', 5);
			syncher.ready(function() {
				debugx('Received messages: %s, counter: %s', JSON.stringify(msgs), counter);
				done();
			}, 'has_done');
		});

		afterEach(function(done) {
			app.server.teardown().then(lodash.ary(done, 0));
		});
	});
});
