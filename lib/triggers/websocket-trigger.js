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
  var LX = params.loggingFactory.getLogger();
  var LT = params.loggingFactory.getTracer();
  var pluginCfg = lodash.get(params, ['sandboxConfig'], {});

  var socketHandler = {};

  self.addInterceptor = function(key, handler, options) {
    options = options || {};
    if (lodash.isString(key) && lodash.isFunction(handler)) {
      debugx.enabled && debugx('addInterceptor("%s", <handler>)', key);
      if (options.originalCallback === true) {
        socketHandler[key] = handler;
      } else {
        var eventMatcher = null;
        if (options.eventPattern instanceof RegExp) {
          debugx.enabled && debugx('use default options.eventPattern');
          eventMatcher = options.eventPattern;
        } else if (typeof(options.eventPattern) === 'string') {
          debugx.enabled && debugx('create pattern from "%s"', options.eventPattern);
          eventMatcher = new RegExp(options.eventPattern);
        }
        socketHandler[key] = function(packet, next) {
          var self = this;
          var eventName = (packet instanceof Array) && (packet.length > 0) && packet[0];
          var eventData = (packet instanceof Array) && (packet.length > 1) && packet[1];
          if (LX.isEnabledFor('trace')) {
            LX.log('trace', self.tracer.add({
              message: 'Socket receives a packet',
              eventName: eventName,
              eventData: eventData
            }).toMessage({reset: true}));
          } else if (LX.isEnabledFor('debug')) {
            LX.log('debug', self.tracer.add({
              message: 'Socket receives a packet',
              eventName: eventName
            }).toMessage({reset: true}));
          }
          if (eventMatcher == null || eventName == null || eventName.match(eventMatcher)) {
            handler.call(self, eventName, eventData, next);
          } else {
            next();
          }
        }
      }
    } else {
      debugx.enabled && debugx('addInterceptor() - invalid parameters');
    }
  };

  var io = socketIO();

  io.on('connection', function (socket) {
    var socketId = socket.id;
    var clientIp = socket.request.connection.remoteAddress;
    var tracer = LT.branch({ key: 'socketId', value: socketId });

    LX.isEnabledFor('debug') && LX.log('debug', tracer.add({
      message: 'Socket server received a new connection'
    }).toMessage({reset: true}));

    lodash.forOwn(socketHandler, function(handler, key) {
      var subTracer = tracer.branch({ key: 'handlerId', value: key });
      LX.isEnabledFor('debug') && LX.log('debug', subTracer.add({
        message: 'Register interceptor with socket'
      }).toMessage());
      socket.use(handler.bind({ socket: socket, tracer: subTracer }));
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

Service.referenceList = [ "webserverTrigger" ];

module.exports = Service;
