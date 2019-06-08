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
  function set_players(roomName){
      io.of('/').adapter.clients([roomName], (err, clienters) => {
          var clients = _.filter(users, (v) => _.includes(clienters,v.id));
          io.to(`${roomName}`).emit('set players',{players:clients});
      });
  }
  socket.on('new user',(data,callback)=>{
      users.push({id:socket.id,name:data.name,roomName:'',inRoom:false,inMatch:false});
      socket.broadcast.emit('send users',users);
      callback({me:{id:socket.id,name:data.name},users:users});
  });
  
  socket.on('request to',(data,callback)=>{
    var user =  _.find(users,{id:data.id});
     if(io.sockets.connected[data.id]){
        if(!user.inRoom){
            var roomName = uuidv1();
            socket.join(roomName);
            io.sockets.connected[data.id].emit('request from',{req:'ch',roomName:roomName,lang:data.lang,user:_.find(users,{id:data.me})});
            callback({roomName:roomName});
        }else{
          io.sockets.connected[data.id].emit('request from',{req:'join',roomName:user.roomName,lang:data.lang,user:_.find(users,{id:data.me})});
          callback({roomName:user.roomName});
        }
     }
  });
  
  socket.on('accepted',(data)=>{
    _.set(_.find(users,{id:data.me}),'inRoom',true);
    _.set(_.find(users,{id:data.user.id}),'inRoom',true);
    _.set(_.find(users,{id:data.me}),'roomName',data.roomName);
    _.set(_.find(users,{id:data.user.id}),'roomName',data.roomName);
    
    if(data.req == 'join'){
      var sc = io.sockets.connected[data.user.id];
      if(sc){
          sc.join(data.roomName);
      }
    }else{
      socket.join(data.roomName);
    }
    set_players(data.roomName);
    socket.emit('send users',users);
  })
  
  socket.on('set inMatch', (me)=>{
    var client = _.find(users,{id:me.me.id});
    _.set(client,'inMatch',true);
    
    setTimeout(()=>{
      socket.emit('send users',users);
    },1000);
    
  });
  
  socket.on('walking',(data)=>{
        io.to(`${data.roomName}`).emit('resulting',{user:data.me,result:data.result});
  });
  
  socket.on('rejected',(data)=>{
      var sc = io.sockets.connected[data.user.id];
      if(sc){
          sc.emit('rejected',data.user)
      }
  });
  
  socket.on('disconnect', function(){
    _.remove(users, {id:socket.id});
    socket.broadcast.emit('send users',users);
  });
});

http.listen(port, function(){
  console.log('listening on *:'+port);
});