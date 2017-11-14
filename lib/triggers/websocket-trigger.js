'use strict';

var events = require('events');
var util = require('util');
var Devebot = require('devebot');
var lodash = Devebot.require('lodash');
var debugx =  Devebot.require('debug')('appWebsocket:trigger');
var socketIO = require('socket.io');

var Service = function(params) {
  debugx.enabled && debugx(' + constructor begin ...');

  params = params || {};

  var self = this;
  var logger = params.loggingFactory.getLogger();
  var pluginCfg = lodash.get(params, ['sandboxConfig'], {});

  var socketHandler = {};

  self.addSocketHandler = function(key, handler, options) {
    options = options || {};
    if (lodash.isString(key) && lodash.isFunction(handler)) {
      debugx.enabled && debugx('addSocketHandler("%s", <handler>)', key);
      if (options.originalCallback === true) {
        socketHandler[key] = handler;
      } else {
        socketHandler[key] = function(packet, next) {
          var self = this;
          var eventName = (packet instanceof Array) && (packet.length > 0) && packet[0];
          var eventData = (packet instanceof Array) && (packet.length > 1) && packet[1];
          debugx.enabled && debugx('Event[%s]/[%s] params: %s', eventName, self.socket.id,
              JSON.stringify(eventData, null, 2));
          handler.call(self, eventName, eventData, next);
        }
      }
    } else {
      debugx.enabled && debugx('addSocketHandler() - invalid parameters');
    }
  };

  var io = socketIO();

  io.on('connection', function (socket) {
    var socketId = socket.id;
    var clientIp = socket.request.connection.remoteAddress;

    debugx.enabled && debugx('Socket server received a new connection: %s', socketId);
    lodash.forOwn(socketHandler, function(handler, key) {
      debugx.enabled && debugx('Transfer client[%s] to handler[%s]', socketId, key);
      socket.use(handler.bind({ socket: socket }));
    });
  });

  io.listen(params.webserverTrigger.server);

  self.start = function() {
    return Promise.resolve();
  };

  self.stop = function() {
    return Promise.resolve();
  };

  debugx.enabled && debugx(' - constructor end!');
};

Service.argumentSchema = {
  "properties": {
    "webserverTrigger": {
      "type": "object"
    }
  }
};

module.exports = Service;
