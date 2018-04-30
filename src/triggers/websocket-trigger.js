'use strict';

const Devebot = require('devebot');
const chores = Devebot.require('chores');
const lodash = Devebot.require('lodash');
const socketIO = require('socket.io');

function WebsocketTrigger(params) {
  params = params || {};

  let self = this;
  let LX = params.loggingFactory.getLogger();
  let LT = params.loggingFactory.getTracer();
  let packageName = params.packageName || 'app-websocket';
  let blockRef = chores.getBlockRef(__filename, packageName);

  LX.has('silly') && LX.log('silly', LT.toMessage({
    tags: [ blockRef, 'constructor-begin' ],
    text: ' + constructor begin ...'
  }));

  let webserverTrigger = params["app-webserver/webserverTrigger"];
  let pluginCfg = lodash.get(params, ['sandboxConfig'], {});

  let socketHandler = {};

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
        let eventMatcher = null;
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
          let that = this;
          if (socketHandler[key].enabled == false) {
            next();
            LX.has('debug') && LX.log('debug', that.tracer.toMessage({
              text: 'Interceptor is skipped (enabled ~ false)'
            }));
            return;
          }
          let eventName = (packet instanceof Array) && (packet.length > 0) && packet[0];
          let eventData = (packet instanceof Array) && (packet.length > 1) && packet[1];
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

  let io = socketIO();

  this.helper = {};

  this.helper.getSocketById = function(socketId, opts) {
    opts = opts || {};
    if (opts.isNamespaceSupported || opts.namespace) {
      let ns = io && io.of(opts.namespace || "/");
      if (ns && ns.connected) {
        let socket = ns.connected[socketId];
        return socket;
      }
    }
    return io && io.sockets && io.sockets.sockets && io.sockets.sockets[socketId];
  }

  io.on('connection', function (socket) {
    let socketId = socket.id;
    let clientIp = socket.request.connection.remoteAddress;
    let tracer = LT.branch({ key: 'socketId', value: socketId });

    LX.has('debug') && LX.log('debug', tracer.toMessage({
      text: 'Socket server received a new connection'
    }));

    lodash.forOwn(socketHandler, function(handler, key) {
      let subTracer = tracer.branch({ key: 'handlerId', value: key });
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

WebsocketTrigger.referenceList = [ "app-webserver/webserverTrigger" ];

module.exports = WebsocketTrigger;
