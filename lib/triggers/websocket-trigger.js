'use strict';

var events = require('events');
var util = require('util');
var http = require('http');
var Devebot = require('devebot');
var lodash = Devebot.require('lodash');
var debug = Devebot.require('debug');
var debuglog = debug('appWebsocket');

var express = require('express');
var socketIO = require('socket.io');

var Service = function(params) {
  debuglog.isEnabled && debuglog(' + constructor begin ...');

  params = params || {};

  var self = this;

  self.logger = params.loggingFactory.getLogger();

  self.getSandboxName = function() {
    return params.sandboxName;
  };

  var websocketConfig = lodash.get(params, ['sandboxConfig', 'plugins', 'appWebsocket'], {});

  if (debuglog.isEnabled && websocketConfig.printRequestInfo) {
    apporo.use('*', function(req, res, next) {
      process.nextTick(function() {
        debuglog('=@ app-websocket receives a new request:');
        debuglog(' - Request URL: ' + req.url);
        debuglog(' - Request protocol: ' + req.protocol);
        debuglog(' - Request host: ' + req.hostname);
        debuglog(' - Request path: ' + req.path);
        debuglog(' - Request originalUrl: ' + req.originalUrl);
        debuglog(' - Request body: ' + JSON.stringify(req.body));
        debuglog(' - Request user-agent: ' + req.headers['user-agent']);
      });
      next();
    });
  }

  self.getExpress = function() {
    return express;
  };

  var apporo = express();

  self.getApporo = function() {
    return apporo;
  };

  var server = http.createServer(apporo);

  self.getServer = function() {
    return server;
  };

  var socketHandler = null;

  self.setSocketHandler = function(handler) {
    socketHandler = handler;
  };

  var io = socketIO();

  io.on('connection', function (socket) {
    var socketId = socket.id;
    var clientIp = socket.request.connection.remoteAddress;

    if (lodash.isFunction(socketHandler)) {
      socketHandler(socket, {});
    }
  });

  io.listen(server);

  var configHost = lodash.get(websocketConfig, 'host', '0.0.0.0');
  var configPort = lodash.get(websocketConfig, 'port', 7878);

  self.start = function() {
    var serverInstance = server.listen(configPort, configHost, function () {
      var host = serverInstance.address().address;
      var port = serverInstance.address().port;
      console.log('app-websocket is listening at http://%s:%s', host, port);
    });
    return serverInstance;
  };

  self.stop = function() {
    server.close(function (err) {
      console.log('app-websocket has been closed');
    });
  };

  debuglog.isEnabled && debuglog(' - constructor end!');
};

Service.argumentSchema = {
  "id": "websocketTrigger",
  "type": "object",
  "properties": {
    "sandboxName": {
      "type": "string"
    },
    "sandboxConfig": {
      "type": "object"
    },
    "profileConfig": {
      "type": "object"
    },
    "generalConfig": {
      "type": "object"
    },
    "loggingFactory": {
      "type": "object"
    }
  }
};

module.exports = Service;
