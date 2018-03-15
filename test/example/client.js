'use strict';

var socket = require('socket.io-client')('http://127.0.0.1:7878', {
  'force new connection': true,
  reconnect: true
});

socket.on('connect', function(){
  socket.on('result_1', function(info) {
    console.log('result#1: %s', JSON.stringify(info, null, 2));
    socket.emit('action_2', {
      message: 'This is the second action'
    });
  });

  socket.on('result_2', function(info) {
    console.log('result#2: %s', JSON.stringify(info, null, 2));
    socket.close();
  });

  socket.emit('action_1', {
    message: 'This is the first action'
  });
});
