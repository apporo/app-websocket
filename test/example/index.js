'use strict';

var path = require('path');

var app = require('devebot').launchApplication({
  appRootPath: __dirname
}, [{
  name: 'app-websocket',
  path: path.join(__dirname, '../../index.js')
}]);

if (require.main === module) app.server.start();

app.getSandboxService = function(serviceName) {
  return this.server.invoke(function(injector) {
    return injector.lookup('sandboxManager').getSandboxService(serviceName);
  });
}

module.exports = app;
