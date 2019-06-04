var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var redis = require('redis');

server.listen(8082);

io.on('connection', function (socket) {
      var redisClient;
      socket.on('new user',(data)=>{
          redisClient = redis.createClient();
          redisClient.subscribe(data.id);
          redisClient.on("message", function(channel, message) {
            socket.emit(channel,message)
          });
      });
  
  socket.on('disconnect', function() {
    redisClient.quit();
  });

});