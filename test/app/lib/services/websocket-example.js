'use strict';

var Devebot = require('devebot');
var lodash = Devebot.require('lodash');
var debugx =  Devebot.require('debug')('appWebsocket:example');

var Service = function(params) {
  var LX = params.loggingFactory.getLogger();
  var LT = params.loggingFactory.getTracer();
  params.websocketTrigger.addInterceptor('example0', function(eventName, eventData, next) {
    LX.isEnabledFor('debug') && LX.log('debug', LT.add({
      message: 'Example receive message',
      eventName: eventName,
      eventData: eventData
    }).toString());
    next();
  });
}

Service.referenceList = [ "websocketTrigger" ]

module.exports = Service;
