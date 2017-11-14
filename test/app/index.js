'use strict';

var app = require('devebot').launchApplication({
  appRootPath: __dirname
}, [{
  name: 'app-websocket',
  path: '../../index.js'
}]);

if (require.main === module) app.server.start();

app.getSandboxService = function(serviceName) {
  return this.server.invoke(function(injector) {
    var sandboxManager = injector.lookup('sandboxManager');
    return sandboxManager.getSandboxService(serviceName);
  });
}

module.exports = app;
