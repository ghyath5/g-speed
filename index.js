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

var TextArray =[
  "الظروف التي ادت الى وضع الدستور في لبنان هي ان المادة الاولى من صك الانتداب قضت بأن تضع الدولة المنتدبة للبنان وسوريا دستورا خلال ثلاث سنوات من تاريخ تطبيق الانتداب وكذلك مطالبة اللبنانيين بالمشاركة في الحكي وبتحديد علاقتهم مع فرنسا اوجب وضع الدستور",
  "إن من التنظيمات المالية الذي نظمتها فرنسا في عهد لبنان الكبير ان وضعو نقدا جديدا لسوريا ولبنان مرتبط بالفرنك الفرنسي اساسه الليرة مقسمة كل 100 قرش تساوي 20 فرنك ونظموا قوانين الضرائب والجمارك وجعلوا للبنان ميزانية خاصة به وكذلك منحوا حق اصدار العملة الى شركة فرنسية دعيت بنك سوريا ولبنان",
  "ذبحنا بقرتنا وذبحوا بقرة بورقبة طلعت مرقة بقرتنا أحسن من مرقة بقرة بورقبة ذبحنا قردنا وذبحتوا قردكم حطينا لحم قردنا في قدركم وحطيتوا لحم قردكم في قدرنا","هذا النص هو مثال لنص يمكن أن يستبدل في نفس المساحة لقد تم توليد هذا النص من مولد النص العربي حيث يمكنك أن تولد مثل هذا النص",
  "ستغني عن الاخر ولكن الذي يمكن ان يتبدل ويتعاقب على اوجه كثيرة وهو معنى الامتداد يشبه الصورة التي لسائر الاجسام ذوات الصور والذي يثبت على حال واحدة وهو الذي ينزل منزلة الطين في المثال المتقدم يشبه معنى الجسمية التي لسائر الاجسام ذوات الصور"];

var users = [];
var results = [];
io.on('connection', function(socket){
  async function set_players(roomName){
      await io.of('/').adapter.clients([roomName], (err, clienters) => {
          var clients = _.filter(users, (v) => _.includes(clienters,v.id));
          var random = Math.floor(Math.random() * TextArray.length);
          io.to(`${roomName}`).emit('set players',{players:clients,words:TextArray[random].split(' ')});
      });
      io.emit('send users',users);
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
    
  })
  
  socket.on('set inMatch', async (me)=>{
    var client = _.find(users,{id:me.me.id});
    await _.set(client,'inMatch',true);
   io.emit('send users',users);
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
          sc.emit('rejected',data.user)
      }
  });
  
  socket.on('play again', (data)=>{
    var user =  _.find(users,{id:data.me.id});
     _.set(user,'roomName','');
     _.set(user,'inRoom',false);
     _.set(user,'inMatch',false);
    io.emit('send users',users);
  })
  
  socket.on('disconnect', function(){
    _.remove(users, {id:socket.id});
    socket.broadcast.emit('send users',users);
  });
});

http.listen(port, function(){
  console.log('listening on *:'+port);
});