var app = new Vue({
  el: '#app',
  data: {
    socket:null,
    highlighted:0,
    wrong:null,
    sensitive:false,
    openUsersList:true,
    words:[],
    username:'',
    password:'',
    text:'',
    englishWords:["much", "four", "school", "grow", "name", "side", "small", "those", "any", "just", "just", "face", "new", "for", "girl", "letter", "good", "part", "long", "right", "line", "stop", "like", "example", "place", "first", "own", "question", "quickly", "need", "miss", "far", "any", "some", "these", "many", "then", "might", "carry", "may", "about"],
    // englishWords:['d'],
    input:'',
    word:'',
    me:{},
    users:[],
    results:[],
    inMatch:false,
    isConnect:false,
    sounds:{
        writingSound:null,
        notifySound:null,
        rejectedSound:null,
        winerSound:null,
        finishSound:null
    },
    lang:'',
    langs:{'ar':'Arabic','en':'english'},
    timer:5,
    layerWait:false,
    players:[],
    roomName:null,
    nameIgnored:false,
    interval:null,
    isPrompet:false,
    isWait:false,
    hasSent:false,
    noResponseTimer:null,
    noReqTime:null,
    isAdmin:false
  },
  created(){
     this.socket = io();
  },
  mounted(){
      this.sounds.writingSound = new Audio('sounds/key.mp3');
      this.sounds.notifySound = new Audio('sounds/notify.mp3')
      this.sounds.rejectedSound = new Audio('sounds/rejected.mp3');
      this.sounds.winerSound = new Audio('sounds/winer.mp3');
      this.sounds.finishSound = new Audio('sounds/finishno.mp3');
      $('body').on('textInput','#input', e => {
           var keyCode = e.originalEvent.data.charCodeAt(0);
           if(keyCode == 32){
             self.check();
             return false;
           }
      });
      this.prompt();
      var self = this;
      setInterval(()=>{
        if(!self.me.name && self.nameIgnored){
          self.prompt();
          self.nameIgnored = false;
        }
      },4000);
      this.socket.on('send users',(users)=>{
        this.users = users;
      });
      this.socket.on('remove player',(user)=>{
          this.players = this.players.filter((player)=>{
            return player.id != user.id
          })
      });
      this.socket.on('rejected',(user)=>{
        this.sounds.rejectedSound.play();
        this.isWait = false;
        this.hasSent = false;
        this.lang = '';
        clearTimeout(this.noResponseTimer);
        Swal.fire("<span style='font-weight:bold;color:orange'>"+user.name+ " </span> "+' rejected your request')
      });
      this.socket.on('request from',(data)=>{
         if(this.inMatch || this.isPrompet || this.isWait || (this.lang != '' && data.lang != this.lang)){
            return false;
         }
        this.requestFrom(data);
      });
      this.socket.on('set players',(data)=>{
        if(this.inMatch){
          return false;
        }
        this.isWait = false;
        this.hasSent = false;
        this.isConnect = true;
        clearTimeout(this.noResponseTimer);
        if(this.lang == 'ar'){
          this.words = data.words;
        }else if(this.lang == 'en'){
          this.words = this.shuffle(this.englishWords);
        }
        this.players = (data.players);
        this.timer = 5;
      });
      this.socket.on('resulting',(data)=>{
        var percentage =((data.result/self.words.length)*100);
        $(".player-"+data.user.id).css('left',percentage+'%');
      });
      this.socket.on('send res',(data)=>{
        this.results = data.users;
        for(var user in data.users){
          if(data.users[user].id == self.me.id && (self.results.length == 1)){
            self.sounds.winerSound.play();
            break;
            return false;
          }
        }
        this.sounds.finishSound.play();
      });
      this.socket.on('no admin',()=>{
        this.isAdmin = false;
      });
      this.socket.on('start play',(data)=>{
        this.isAdmin = false;
        this.requestAccepted();
      });
  },
  methods:{
    insertText(){
      this.socket.emit('set text',{text:this.text,username:this.username,password:this.password},function(d){
        alert(d)
      });
    },
    playerChecker(player_id){
      var is = false;
      for(var user in this.users){
        if(this.users[user].id == player_id){
          is = true;
        }
      }
      return is;
    },
    inArray(value,array){
      for(var a in array){
        if(value == array[a]){
          return true;
        }
      }
      return false;
    },
    check(){
       var self = this;
       var wordslength = this.words.length;
       if(this.highlighted >= this.words.length){
           return false;
       }
       this.isSens();
       if(this.word == this.input){
          self.input = '';
          $('.word'+self.highlighted).css({'color':'green'});
          self.socket.emit('walking',{roomName:self.roomName,me:self.me,result:self.highlighted+1});
          self.highlighted++;
          if(((self.highlighted/self.words.length)*100) == 100){
            self.socket.emit('send results',{me:self.me,roomName:self.roomName});
          }
       }else{
          $('.word'+this.highlighted).css({'color':'red'});
       }
    },
    tracking(e){
      if(this.highlighted >= this.words.length){
           return false;
      }
      if(e.keyCode != 32){
        this.sounds.writingSound.currentTime = 0;
        var word = this.words[this.highlighted];
        var length = this.input.length;
        this.isSens();
        if((this.word.substring(0,length) == this.input)){
          $('.word'+this.highlighted).html("<span class='correct'>"+this.word.substring(0,length)+"</span>"+this.word.substring(length,this.word.length))
          this.wrong = null;
          this.sounds.writingSound.play();
        }else{
          this.wrong = this.highlighted;
        }
      }
    },
    isSens(){
       if(!this.sensitive){
          this.word = this.words[this.highlighted].trim().toLowerCase();
          this.input = this.input.trim().toLowerCase();
        }else{
          this.word = this.words[this.highlighted].trim();
          this.input = this.input.trim();
        }
    },
    setCookie(cname, cvalue, exdays) {
      var d = new Date();
      d.setTime(d.getTime() + (exdays*24*60*60*1000));
      var expires = "expires="+ d.toUTCString();
      document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    },
    getCookie(cname) {
      var name = cname + "=";
      var decodedCookie = decodeURIComponent(document.cookie);
      var ca = decodedCookie.split(';');
      for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
          c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
          return c.substring(name.length, c.length);
        }
      }
      return "";
    },
    prompt(){
      var self = this;
      if(this.getCookie('name') != ''){
        self.socket.emit('new user',{name:this.getCookie('name')},function(res){
              self.me = res.me;
              self.users = res.users;
        })
        return;
      }
      Swal.fire({
        title: 'What is your name?',
        input: 'text',
        inputAttributes: {
          autocapitalize: 'on'
        },
        showCancelButton: false,
        confirmButtonText: 'Submit',
      }).then((result) => {
        if (result.value) {
          if(result.value.trim() != ''){
            this.setCookie('name',result.value,1);
            self.socket.emit('new user',{name:result.value},function(res){
              self.me = res.me;
              self.users = res.users;
            })
          }else{
            self.nameIgnored = true;
          }
        }else{
          self.nameIgnored = true;
        }
      });
    },
    requestFrom(data){
      var self = this;
      this.sounds.notifySound.play();
      this.isPrompet = true;
      clearTimeout(this.noReqTime);
      var rq = Swal.fire({
        title: data.user.name,
        text: "sent you an "+self.langs[data.lang]+" challenge request",
        type: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Accept',
        cancelButtonText: 'Reject'
      }).then((result) => {
        if (result.value) {
          self.isPrompet = false;
          self.isAdmin = true;
          self.lang = data.lang;
          self.roomName = data.roomName;          
          if(!self.inMatch){
            self.socket.emit('accepted',{req:data.req,roomName:data.roomName,me:self.me.id,user:data.user});
          }
        }else{
          self.isPrompet = false;
          self.socket.emit('rejected',{me:self.me,user:data.user});
        }
      });
      this.noReqTime= setTimeout(()=>{
        self.isPrompet = false;
        Swal.close(rq);
      },8000)
    },
    btnStart(){
      this.socket.emit('set inMatch',{roomName:this.roomName});
    },
    requestAccepted(){
        var self = this;
        this.layerWait = true;
        this.inMatch = true;        
        this.interval;
        clearInterval(this.interval);
        this.interval = setInterval(()=>{
          self.timer--;
          if(self.timer == 0){
            $('#input').focus();
            self.layerWait = false;
            clearInterval(self.interval);
            self.timer = 5;
          }
        },1000);
    },
    sendRequest(id){
      var self = this;
      if(!this.hasSent){
          Swal.fire({
          title: 'Request',
          text: "Which language do you want to type?",
          type: 'question',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'عربي',
          cancelButtonText: 'English'
        }).then((result) => {
          self.isAdmin = false;
          if (result.value) {
              self.lang = 'ar';
              self.socket.emit(`request to`,{id:id,me:self.me.id,lang:'ar'},function(res){
                self.roomName = res.roomName;
              });
              self.noResponseTimer = setTimeout(function(){
                Swal.fire('Cancelled','Your friend has no response','error');
                self.isPrompet = false;
                self.hasSent = false;
                self.isWait = false;
                self.lang = '';
              },8000);
          }else{
              self.lang = 'en';
              self.socket.emit('request to',{id:id,me:self.me.id,lang:'en'},function(res){
                self.roomName = res.roomName;
              });
              self.noResponseTimer = setTimeout(function(){
                Swal.fire('Cancelled','Your friend has no response','error');
                self.hasSent = false;
                self.isWait = false;
                self.isPrompet = false;
                self.lang = '';
              },8000); 
        }
      });
      this.isWait = true;
      this.hasSent = true;
      }
    },
    playAgain(){
      var self = this;
      this.players = [];
      this.results = [];
      this.isWait = false;
      this.timer = 5;
      this.highlighted = 0;
      this.input = '';
      this.word = null;
      this.lang = '';
      this.wrong = null;
      this.layerWait = false;
      this.interval = null;
      this.isPrompet = false;
      this.isConnect = false;
      this.inMatch = false;
      this.words = [];
      this.socket.emit('play again',{roomName:self.roomName,me:self.me});
      this.roomName = null;
      this.noResponseTimer = null;
      this.noReqTime = null;
      this.hasSent = false;
      this.isAdmin = false;
    },
    shuffle(array) {
      return array.sort(() => Math.random() - 0.5);
    }
  }
})