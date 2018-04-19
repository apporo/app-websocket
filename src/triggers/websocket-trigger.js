'use strict';

var Devebot = require('devebot');
var chores = Devebot.require('chores');
var lodash = Devebot.require('lodash');
var socketIO = require('socket.io');

var Service = function(params) {
  params = params || {};

  var self = this;
  var LX = params.loggingFactory.getLogger();
  var LT = params.loggingFactory.getTracer();
  var packageName = params.packageName || 'app-websocket';
  var blockRef = chores.getBlockRef(__filename, packageName);

  LX.has('silly') && LX.log('silly', LT.toMessage({
    tags: [ blockRef, 'constructor-begin' ],
    text: ' + constructor begin ...'
  }));

  var webserverTrigger = params["app-webserver/webserverTrigger"];
  var pluginCfg = lodash.get(params, ['sandboxConfig'], {});

  var socketHandler = {};

  self.addInterceptor = function(key, handler, options) {
    options = options || {};
    if (lodash.isString(key) && lodash.isFunction(handler)) {
      LX.has('trace') && LX.log('trace', LT.add({
        key: key
      }).toMessage({
        tags: [ blockRef, 'add-interceptor' ],
        text: ' - addInterceptor("${key}", /handler/)'
      }));
      socketHandler[key] = socketHandler[key] || {};
      if (options.originalCallback === true) {
        socketHandler[key].interceptor = handler;
      } else {
        var eventMatcher = null;
        if (options.eventPattern instanceof RegExp) {
          LX.has('trace') && LX.log('trace', LT.toMessage({
            tags: [ blockRef, 'event-pattern' ],
            text: ' - use default options.eventPattern'
          }));
          eventMatcher = options.eventPattern;
        } else if (typeof(options.eventPattern) === 'string') {
          LX.has('trace') && LX.log('trace', LT.add({
            eventPattern: options.eventPattern
          }).toMessage({
            tags: [ blockRef, 'event-pattern' ],
            text: ' - create pattern from "${eventPattern}"'
          }));
          eventMatcher = new RegExp(options.eventPattern);
        }
        socketHandler[key].interceptor = function(packet, next) {
          var that = this;
          if (socketHandler[key].enabled == false) {
            next();
            LX.has('debug') && LX.log('debug', that.tracer.toMessage({
              text: 'Interceptor is skipped (enabled ~ false)'
            }));
            return;
          }
          var eventName = (packet instanceof Array) && (packet.length > 0) && packet[0];
          var eventData = (packet instanceof Array) && (packet.length > 1) && packet[1];
          if (LX.has('trace')) {
            LX.log('trace', that.tracer.add({
              eventName: eventName,
              eventData: eventData
            }).toMessage({
              text: 'Socket receives a packet'
            }));
          } else if (LX.has('debug')) {
            LX.log('debug', that.tracer.add({
              eventName: eventName
            }).toMessage({
              text: 'Socket receives a packet'
            }));
          }
          if (eventMatcher == null || eventName == null || eventName.match(eventMatcher)) {
            handler.call(that, eventName, eventData, next);
          } else {
            next();
          }
        }
      }
    } else {
      LX.has('debug') && LX.log('debug', LT.toMessage({
        text: 'addInterceptor() - invalid parameters'
      }));
    }
  };

  var io = socketIO();

  this.helper = {};

  this.helper.getSocketById = function(socketId, opts) {
    opts = opts || {};
    if (opts.isNamespaceSupported || opts.namespace) {
      var ns = io && io.of(opts.namespace || "/");
      if (ns && ns.connected) {
        var socket = ns.connected[socketId];
        return socket;
      }
    }
    return io && io.sockets && io.sockets.sockets && io.sockets.sockets[socketId];
  }

  io.on('connection', function (socket) {
    var socketId = socket.id;
    var clientIp = socket.request.connection.remoteAddress;
    var tracer = LT.branch({ key: 'socketId', value: socketId });

    LX.has('debug') && LX.log('debug', tracer.toMessage({
      text: 'Socket server received a new connection'
    }));

    lodash.forOwn(socketHandler, function(handler, key) {
      var subTracer = tracer.branch({ key: 'handlerId', value: key });
      LX.has('debug') && LX.log('debug', subTracer.toMessage({
        text: 'Register interceptor[${handlerId}] with socket[${socketId}]'
      }));
      if (handler && lodash.isFunction(handler.interceptor)) {
        socket.use(handler.interceptor.bind({
          socket: socket,
          tracer: subTracer
        }));
      }
    });
  });

  io.listen(webserverTrigger.server);

  self.start = function() {
    return Promise.resolve();
  };

  self.stop = function() {
    return Promise.resolve();
  };

  LX.has('silly') && LX.log('silly', LT.toMessage({
    tags: [ blockRef, 'constructor-end' ],
    text: ' - constructor end!'
  }));
};

Service.referenceList = [ "app-webserver/webserverTrigger" ];

module.exports = Service;
