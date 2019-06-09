window.Vue.use(VuejsDialog.main.default)
var app = new Vue({
  el: '#app',
  data: {
    socket:null,
    highlighted:0,
    wrong:null,
    sensitive:false,
    openUsersList:true,
    words:[],
    englishWords:["much", "four", "school", "grow", "name", "side", "small", "those", "any", "just", "just", "face", "new", "for", "girl", "letter", "good", "part", "long", "right", "line", "stop", "like", "example", "place", "first", "own", "question", "quickly", "need", "miss", "far", "any", "some", "these", "many", "then", "might", "carry", "may", "about"],
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
    lang:'ar',
    langs:{'ar':'Arabic','en':'english'},
    timer:8,
    layerWait:false,
    players:[],
    roomName:null,
    nameIgnored:false,
    interval:null,
    isPrompet:false
    
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
      this.socket.on('rejected',(user)=>{
        this.sounds.rejectedSound.play();
        self.$dialog.alert(user.name+' reject your request',{okText:'Ok'}).then(function(dialog) {
          console.log('Closed');
        });
      });
      this.socket.on('request from',(data)=>{
         if(this.inMatch || this.isPrompet){
            return false;
         }
        this.requestFrom(data);
      });
      this.socket.on('set players',(data)=>{
        if(this.lang == 'ar'){
          this.words = data.words;
        }else if(this.lang == 'en'){
          this.words = this.englishWords;
        }
        if(this.inMatch){
          return false;
        }
        this.players = (data.players);
        this.timer = 8;
        this.requestAccepted(data);
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
      
      $('#input').on('textInput', e => {
           var keyCode = e.originalEvent.data.charCodeAt(0);
           if(keyCode == 32){
             self.check();
             return false;
           }
      })
  },
  methods:{
    check(){
       var self = this;
       var wordslength = this.words.length;
       if(this.highlighted >= this.words.length){
           return false;
       }
       this.isSens();
       if(this.word == this.input){
          $('.word'+this.highlighted).css({'color':'green'});
          self.input = '';
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
    prompt(){
      var self = this;
      this.$dialog
      .prompt({
        title: "What is your name?",
        body: "We will use your name as your identity in our website",
        promptHelp: 'Type in the box below and click "[+:okText]"'
      },{okText:'Confirm'})
      .then(dialog => {
        if(dialog.data.trim() != ''){
          self.socket.emit('new user',{name:dialog.data},function(res){
            self.me = res.me;
            self.users = res.users;
          })
        }else{
          self.nameIgnored = true;
        }
      })
      .catch(() => {
        self.nameIgnored = true;
        console.log('Prompt dismissed');
      });
    },
    requestFrom(data){
      var self = this;
      this.sounds.notifySound.play();
      this.isPrompet = true;
      this.$dialog
        .confirm(data.user.name+' sent you an '+self.langs[data.lang]+' challenge request',{okText:'Accept',cancelText:'Reject'})
        .then(function(dialog) {
          self.isPrompet = false;
          self.lang = data.lang;
          self.roomName = data.roomName;
          self.socket.emit('accepted',{req:data.req,roomName:data.roomName,me:self.me.id,user:data.user});
        })
        .catch(function() {
          self.isPrompet = false;
          self.socket.emit('rejected',{me:self.me,user:data.user});
        });
    },
    requestAccepted(user){
        var self = this;
        this.layerWait = true;
        this.isConnect = true;
        this.interval;
        clearInterval(this.interval);
        this.interval = setInterval(()=>{
          self.timer--;
          if(self.timer == 0){
            self.inMatch = true;
            self.socket.emit('set inMatch',{me:self.me});
            $('#input').focus();
            self.layerWait = false;
            clearInterval(self.interval);
            self.timer = 8;
          }
        },1000);
    },
    sendRequest(id){
      var self = this;
      this.$dialog
        .confirm('Which language do you want to type?',{okText:'عربي',cancelText:'English'})
        .then(function(dialog) {
          self.lang = 'ar';
          self.socket.emit(`request to`,{id:id,me:self.me.id,lang:'ar'},function(res){
            self.roomName = res.roomName;
          });
        }).catch(function() {
          self.lang = 'en';
          self.socket.emit('request to',{id:id,me:self.me.id,lang:'en'},function(res){
            self.roomName = res.roomName;
          });
        });
    },
    playAgain(){
      var self = this;
      this.players = [];
      this.results = [];
      this.timer = 8;
      this.highlighted = 0;
      this.input = '';
      this.word = null;
      this.wrong = null;
      this.layerWait = false;
      this.roomName = null;
      this.interval = null;
      this.isPrompet = false;
      this.isConnect = false;
      this.inMatch = false;
      this.words = [];
      this.socket.emit('play again',{roomName:self.roomName,me:self.me});
    }
    
  }
})