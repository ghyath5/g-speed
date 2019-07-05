var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var _ = require('lodash');
const uuidv1 = require('uuid/v1');

var port = process.env.PORT || 80;
// var port =  8082;
app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res){
  res.sendFile('/index.html',{root:__dirname});
});

var TextArray =[
  "شريف وشريفة شتروا شرشفان شرشف شريف اكبر من شرشف شريفة بشرشفين وشرشف",
  "انه من اصعب النصوص على ممر التاريخ حيث انه لا مكان للمشاغبين في هذا النص ولا يمكن لاحد ان يعبر هذا النص وهو سليم بل يجب ان يكون اسمه اسم اخر",
  "الغريب انه لا يمكنني وضع الهمزات والتنوين في هذه النصوص لقد قمت بتجربة في السابق ووضعت الهمزات والنقاط على الحروف لكن شعبي اراد الحرب ولم يكن راض عن هذه التجربة حتى ازلت هذه الهمزات",
  "من الصعب جدا إرضاء الناس لذا عليك التفكير في نفسك اولا او بالاحرى عليك التفكير في تفكيرك لترضي نفسك في تفكير الناس والناس تفكر في نفسك لترضي تفكير الناس التي تفكر بها",
  "ما اكثر كمية الغباء في هذه النصوص وبها كيلو من سمك الهامول الذي يأتي بلا حسك حيث انها تشرشر شرشرا زناخة"  
]

var users = [];
var results = [];



io.on('connection', function(socket){
 
  function set_players(roomName){
      io.of('/').adapter.clients([roomName], (err, clienters) => {
          var clients = _.filter(users, (v) => _.includes(clienters,v.id));
          var random = Math.floor(Math.random() * TextArray.length);
          io.to(`${roomName}`).emit('set players',{players:clients,words:TextArray[random].split(' ')});
      });
      io.emit('send users',users);
  }
   async function start_player(roomName){
      await io.of('/').adapter.clients([roomName], (err, clienters) => {
          var clients = _.filter(users, (v) => _.includes(clienters,v.id));
          for(var client in clients){
             _.set(clients[client],'inMatch',true);
          }
          io.to(`${roomName}`).emit('start play');
      });
      io.emit('send users',users);
  }
  
  socket.on('set text',(data,callback)=>{
    if(data.username == "GhAyAtH" && data.password == "GhGhGh"){
      TextArray.push(data.text);
      callback('done');
    }else{
      callback('err');
    }
  })
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
          io.of('/').adapter.clients([data.roomName], (err, clienters) => {
              if(clienters[1] != data.me && clienters.length > 2){
                socket.emit('no admin');
              }
          });
          
      }
    }else{
      socket.join(data.roomName);
    }
    socket.on('radio', function(blob) {
      socket.to(data.roomName).emit('voice', blob);
    });
    set_players(data.roomName);
  });
  
  socket.on('set inMatch', (data)=>{
    start_player(data.roomName);
  });
  
  socket.on('send results',(data)=>{
   var team = _.find(results,{roomName:data.roomName});
   if(team){
     _.update(team,'users',function(n){
       n.push({id:data.me.id,name:data.me.name,level:n.length+1});
       return n;
     })
   }else{
     results.push({roomName:data.roomName,users:[{id:data.me.id,name:data.me.name,level:1}]});
     var team = _.find(results,{roomName:data.roomName});
   }
   
   io.to(`${data.roomName}`).emit('send res',{users:team.users});
  });
  
  socket.on('walking',(data)=>{
        io.to(`${data.roomName}`).emit('resulting',{user:data.me,result:data.result});
  });
  
  socket.on('rejected',(data)=>{
      var sc = io.sockets.connected[data.user.id];
      if(sc){
          sc.emit('rejected',data.me)
      }
  });
  
  socket.on('play again', (data)=>{
    var user =  _.find(users,{id:data.me.id});
     _.set(user,'roomName','');
     _.set(user,'inRoom',false);
     _.set(user,'inMatch',false);
     socket.broadcast.emit('remove player',user);
     socket.leave(data.roomName);
     setInterval(()=>{
         _.remove(results,function(n){
           return n.roomName == data.roomName;
         });
     },1000*60*3)
     io.emit('send users',users);
  })
  
  socket.on('disconnect', function(){
    var user = _.remove(users, {id:socket.id});
    socket.broadcast.emit('send users',users);
    socket.broadcast.emit('remove player',user);
  });
});

http.listen(port, function(){
  console.log('listening on *:'+port);
});