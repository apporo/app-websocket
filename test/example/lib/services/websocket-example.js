'use strict';

var Devebot = require('devebot');
var lodash = Devebot.require('lodash');

var Service = function(params) {
  var LX = params.loggingFactory.getLogger();
  params.websocketTrigger.addInterceptor('example0', function(eventName, eventData, next) {
    var self = this;
    var LT = this.tracer;
    LX.has('debug') && LX.log('debug', LT.add({
      eventName: eventName,
      eventData: eventData
    }).toMessage({
      text: 'Example receives an event[${eventName}]: ${eventData}'
    }));
    switch(eventName) {
      case 'action_1':
        self.socket.emit('result_1', {
          echo: eventData
        });
        break;
      case 'action_2':
        self.socket.emit('result_2', {
          echo: eventData
        });
        break;
      default:
        next();
    }
  });
}

Service.referenceList = [ "websocketTrigger" ]

module.exports = Service;
