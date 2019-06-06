var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var _ = require('lodash');

app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res){
  res.sendFile('/index.html',{root:__dirname});
});

var users = [];

io.on('connection', function(socket){
  
  socket.on('new user',(data,callback)=>{
      users.push({id:socket.id,name:data.name});
      socket.broadcast.emit('send users',users);
      callback({me:{id:socket.id,name:data.name},users:users});
  });
  socket.on('disconnect', function(){
    _.remove(users, {id:socket.id});
    socket.broadcast.emit('send users',users);
  });
});

http.listen(8082, function(){
  console.log('listening on *:8082');
});