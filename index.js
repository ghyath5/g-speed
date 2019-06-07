var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var _ = require('lodash');
const uuidv1 = require('uuid/v1');

var port = process.env.PORT || 8082;
// var port =  8082;
app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res){
  res.sendFile('/index.html',{root:__dirname});
});

var users = [];

io.on('connection', function(socket){
  
  socket.on('new user',(data,callback)=>{
      users.push({id:socket.id,name:data.name,available:true});
      socket.broadcast.emit('send users',users);
      callback({me:{id:socket.id,name:data.name},users:users});
  });
  
  socket.on('request to',(data,callback)=>{
    if(io.sockets.connected[data.id]){
        var roomName = uuidv1();
        socket.join(roomName);
        io.sockets.connected[data.id].emit('request from',{roomName:roomName,lang:data.lang,user:_.find(users,{id:data.me})});
    }
    callback({roomName:roomName});
  });
  
  socket.on('accepted',(data)=>{
    socket.join(data.roomName);
    _.set(_.find(users,{id:data.me}),'available',false);
    _.set(_.find(users,{id:data.user.id}),'available',false);
    socket.emit('send users',users);
    if(io.sockets.connected[data.user.id]){
      io.sockets.connected[data.user.id].emit('request accepted',_.find(users,{id:data.me}));
    }else{
      
    }
    
  })
  
  socket.on('walking',(data)=>{
        io.to(`${data.roomName}`).emit('resulting',{user:data.user,result:data.result});
  });
  
  socket.on('disconnect', function(){
    _.remove(users, {id:socket.id});
    socket.broadcast.emit('send users',users);
  });
});

http.listen(port, function(){
  console.log('listening on *:'+port);
});